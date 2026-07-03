import { Request, Response, NextFunction } from 'express';
import { GenerateInvoice } from '../../application/use-cases/GenerateInvoice';
import { CheckInvoiceStatus } from '../../application/use-cases/CheckInvoiceStatus';
import { UpdateBill } from '../../application/use-cases/UpdateBill';
import { GetBills } from '../../application/use-cases/GetBills';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger, maskAccessKey } from '../utils/Logger';
import { ValidationError, NotFoundError } from '../../domain/errors/CustomErrors';
import { sriCircuitBreaker, getAllCircuitStates } from '../utils/CircuitBreaker';
import { invoiceQueue, JobStatus } from '../queue/InvoiceQueue';
import { SRIService } from '../services/SRIService';
import { BillingService } from '../../application/services/BillingService';
import { Invoice } from '../../domain/billing/invoice';

export class BillingController {
    private sriService: SRIService;
    private billingService: BillingService;

    constructor(
        private generateInvoice: GenerateInvoice,
        private checkInvoiceStatus: CheckInvoiceStatus,
        private updateBillUseCase: UpdateBill,
        private getBills: GetBills,
        private configRepository: IRestaurantConfigRepository
    ) {
        this.sriService = new SRIService();
        this.billingService = new BillingService();
    }

    public generateXml = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('⚡ Receiving SRI billing request (Backend)', { body: req.body });
            const { order, client, logoUrl } = req.body;

            if (!order || !client) {
                throw new ValidationError('Order and Client data are required');
            }

            // CRITICAL: Always read taxRate from DB config — never trust the frontend value.
            // This ensures a single point of truth: if the SRI changes the IVA rate,
            // you only update it once in the restaurant configuration panel.
            const config = await this.configRepository.get();
            const taxRate: number = config?.billing?.taxRate ?? 15;
            logger.info(`📊 Using taxRate from DB config: ${taxRate}%`);

            const result = await this.generateInvoice.execute({ order, client, taxRate, logoUrl });

            logger.info('✅ Billing process completed successfully.');
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * FIX D-05: Preview XML before sending to SRI
     * POST /api/billing/preview-xml
     * Generates the XML without sending it, so user can review before submission
     */
    public previewXml = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('[Preview] Generating XML preview (no SRI submission)');
            const { order, client, logoUrl } = req.body;

            if (!order || !client) {
                throw new ValidationError('Order and Client data are required');
            }

            // Get config
            const config = await this.configRepository.get();
            const taxRate: number = config?.billing?.taxRate ?? 15;
            const info = config || {} as any;
            // Ambiente desde la BD (configurable en la UI) — fuente única de verdad
            const environment = await this.configRepository.getEnvironment();

            // Calculate details
            const details = this.billingService.calculateDetails(order.items, taxRate);
            const subtotal = details.reduce((sum, d) => sum + d.precioTotalSinImpuesto, 0);
            const totalImpuestos = details.reduce((sum, d) => sum + d.impuestos[0].valor, 0);
            const total = subtotal + totalImpuestos;

            // Build preview invoice (without real sequential or access key)
            const previewInvoice: Invoice = {
                orderId: order.id,
                status: 'PENDING', // Using PENDING for preview (not submitted yet)
                creationDate: new Date(),
                detalles: details,
                info: {
                    ambiente: environment,
                    tipoEmision: '1',
                    razonSocial: info.businessName || process.env.BUSINESS_NAME || 'RESTAURANTE DEMO',
                    nombreComercial: info.name || process.env.COMMERCIAL_NAME,
                    ruc: info.ruc || process.env.RUC || '0000000000001',
                    dirMatriz: info.fiscalAddress || info.address || process.env.DIR_MATRIZ || 'Direccion Matriz',
                    dirEstablecimiento: info.fiscalAddress || info.address || process.env.DIR_ESTABLECIMIENTO || process.env.DIR_MATRIZ,
                    codDoc: '01',
                    estab: info.billing?.establishment || process.env.ESTAB || '001',
                    ptoEmi: info.billing?.emissionPoint || process.env.PTO_EMI || '001',
                    secuencial: 'XXXXXXXXX', // Placeholder for preview
                    fechaEmision: this.billingService.getCurrentDateEcuador(),
                    obligadoContabilidad: info.obligadoContabilidad ? 'SI' : 'NO',
                    tipoIdentificacionComprador: this.billingService.getIdentificacionType(client.identification),
                    razonSocialComprador: String(client.identification) === '9999999999999' ? 'CONSUMIDOR FINAL' : client.name,
                    identificacionComprador: client.identification,
                    direccionComprador: client.address,
                    totalSinImpuestos: subtotal,
                    totalDescuento: 0,
                    totalImpuestos: [],
                    importeTotal: total,
                    moneda: 'DOLAR',
                    emailComprador: client.email,
                    formaPago: this.billingService.getPaymentMethodCode(client.paymentMethod || '01'),
                    logoUrl: this.billingService.getLogoUrl(info, logoUrl),
                    tasaIva: taxRate.toString(),
                    telefonoComprador: client.phone,
                    emailMatriz: info.fiscalEmail || info.email || process.env.SMTP_FROM || 'info@restaurant.com',
                    regime: info.billing?.regime,
                    agenteRetencion: info.billing?.agenteRetencion
                }
            };

            // Generate XML (without signing)
            const xmlContent = this.sriService.generateInvoiceXML(previewInvoice);

            // Parse and format for readability
            const formattedXml = xmlContent
                .replace(/>\s*</g, '>\n<')
                .replace(/^\s+|\s+$/gm, '');

            logger.info('[Preview] XML preview generated successfully');

            res.json({
                success: true,
                preview: true,
                message: 'Este es un preview del XML. El secuencial será asignado al enviar.',
                data: {
                    xml: formattedXml,
                    summary: {
                        customerName: previewInvoice.info.razonSocialComprador,
                        customerIdentification: previewInvoice.info.identificacionComprador,
                        subtotal: subtotal.toFixed(2),
                        tax: totalImpuestos.toFixed(2),
                        total: total.toFixed(2),
                        taxRate: `${taxRate}%`,
                        itemCount: details.length,
                        environment: previewInvoice.info.ambiente === '1' ? 'PRUEBAS' : 'PRODUCCIÓN'
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    };

    public checkStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { accessKey } = req.params;
            // Ambiente desde la BD (configurable en la UI) — fuente única de verdad
            const isProd = (await this.configRepository.getEnvironment()) === '2';

            if (!accessKey) {
                throw new ValidationError('Access Key is required');
            }

            // FIX S-02: Mask access key in logs
            logger.info(`Checking status for Access Key: ${maskAccessKey(accessKey)}`);

            const result = await this.checkInvoiceStatus.execute(accessKey, isProd);

            logger.info('✅ Status check process completed successfully.');
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    public updateBill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            logger.info('Updating bill data', { id, updateData });

            const updatedBill = await this.updateBillUseCase.execute(id, updateData);

            res.json(ResponseFormatter.success(updatedBill));
        } catch (error) {
            next(error);
        }
    };

    public reSubmit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            logger.info('Re-submitting bill to SRI', { id });

            const bill = await this.getBills.executeById(id);
            if (!bill) {
                res.status(404).json(ResponseFormatter.error('NOT_FOUND', 'Factura no encontrada'));
                return;
            }

            // CRITICAL: Read taxRate from DB config for re-submissions too
            const config = await this.configRepository.get();
            const taxRate: number = config?.billing?.taxRate ?? 15;

            // Reconstruct order and client from Bill data
            const order = {
                id: bill.orderId,
                items: bill.items,
                total: bill.total
            };

            const client = {
                identification: bill.customerIdentification,
                name: bill.customerName,
                address: bill.customerAddress,
                email: bill.customerEmail,
                phone: bill.customerPhone
            };

            // Re-run generation logic using existing Bill ID to update same record
            const result = await this.generateInvoice.execute({ 
                order, 
                client,
                taxRate,
                id: bill.id 
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * FIX D-01: Get SRI circuit breaker status
     * GET /api/billing/circuit-status
     * Returns the current state of the SRI circuit breaker for monitoring
     */
    public getCircuitStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const sriState = sriCircuitBreaker.getState();
            const allStates = getAllCircuitStates();

            res.json({
                success: true,
                data: {
                    sri: {
                        ...sriState,
                        isAvailable: sriCircuitBreaker.isAvailable(),
                        nextAttemptIn: sriState.nextAttemptTime
                            ? Math.max(0, Math.ceil((sriState.nextAttemptTime - Date.now()) / 1000))
                            : null
                    },
                    all: allStates
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * FIX D-01: Reset SRI circuit breaker (admin operation)
     * POST /api/billing/circuit-reset
     * Forces the circuit breaker back to CLOSED state
     */
    public resetCircuit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.warn('[CircuitBreaker] Manual reset requested', { user: (req as any).userId });
            sriCircuitBreaker.reset();

            res.json({
                success: true,
                message: 'Circuit breaker has been reset to CLOSED state',
                data: sriCircuitBreaker.getState()
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * FIX D-04: Get invoice queue stats
     * GET /api/billing/queue-stats
     * Returns queue statistics for monitoring
     */
    public getQueueStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const stats = invoiceQueue.getStats();
            const recentJobs = invoiceQueue.getJobs()
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 10)
                .map(job => ({
                    id: job.id,
                    orderId: job.data.orderId,
                    status: job.status,
                    attempts: job.attempts,
                    progress: job.progress,
                    createdAt: job.createdAt,
                    error: job.error
                }));

            res.json({
                success: true,
                data: {
                    stats,
                    recentJobs
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * FIX D-04: Get specific job status
     * GET /api/billing/queue-job/:jobId
     * Returns status of a specific queue job
     */
    public getQueueJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { jobId } = req.params;
            const job = invoiceQueue.getJob(jobId);

            if (!job) {
                res.status(404).json({
                    success: false,
                    error: 'Job not found'
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    id: job.id,
                    orderId: job.data.orderId,
                    status: job.status,
                    attempts: job.attempts,
                    maxAttempts: job.maxAttempts,
                    progress: job.progress,
                    createdAt: job.createdAt,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt,
                    error: job.error,
                    result: job.status === JobStatus.COMPLETED ? {
                        invoiceId: job.result?.invoiceId,
                        invoiceNumber: job.result?.invoiceNumber,
                        accessKey: job.result?.accessKey
                    } : undefined
                }
            });
        } catch (error) {
            next(error);
        }
    };
}
