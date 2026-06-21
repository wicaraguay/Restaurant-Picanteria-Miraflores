import { Request, Response, NextFunction } from 'express';
import { CreateBill } from '../../application/use-cases/CreateBill';
import { GetBills } from '../../application/use-cases/GetBills';
import { DeleteBill } from '../../application/use-cases/DeleteBill';
import { ResetBillingSystem } from '../../application/use-cases/ResetBillingSystem';
import { ResetFullSystem } from '../../application/use-cases/ResetFullSystem';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';
import { NotFoundError } from '../../domain/errors/CustomErrors';
import { PDFService } from '../services/PDFService';
import { SRIService } from '../services/SRIService';
import { RestaurantConfigModel } from '../database/schemas/RestaurantConfigSchema';
import { sanitizeSort } from '../utils/QuerySanitizer'; // FIX S-01

import { BillingService } from '../../application/services/BillingService';

export class BillController {
    constructor(
        private createBill: CreateBill,
        private getBills: GetBills,
        private deleteBill: DeleteBill,
        private resetBillingSystem: ResetBillingSystem,
        private resetFullSystem: ResetFullSystem,
        private billingService: BillingService,
        private sriService: SRIService
    ) { }

    public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;

            const filter: any = {};
            if (req.query.documentNumber) filter.documentNumber = req.query.documentNumber;
            if (req.query.customerIdentification) filter.customerIdentification = req.query.customerIdentification;
            if (req.query.documentType) filter.documentType = req.query.documentType;

            // Filtro por rango de fechas
            if (req.query.startDate || req.query.endDate) {
                filter.date = {};
                if (req.query.startDate) filter.date.$gte = req.query.startDate;
                if (req.query.endDate) filter.date.$lte = req.query.endDate;
            }

            // FIX S-01: Sanitize sort params to prevent NoSQL injection
            const sort = sanitizeSort(req.query.sort as string, 'bills');

            logger.info('Fetching bills with pagination', { page, limit, filter });

            const result = await this.getBills.executePaginated(page, limit, filter, sort);

            logger.info('Bills fetched successfully', {
                count: result.data.length,
                page: result.pagination.page,
                total: result.pagination.total
            });
            res.json(ResponseFormatter.success(result));
        } catch (error) {
            next(error);
        }
    };

    public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Creating new bill', { data: req.body });
            const createdBill = await this.createBill.execute(req.body);
            logger.info('Bill created successfully', { id: createdBill.id });
            res.status(201).json(ResponseFormatter.success(createdBill));
        } catch (error) {
            next(error);
        }
    };

    public generatePdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            logger.info('Generating PDF for existing bill', { id });

            const billData = await this.getBills.executeById(id);

            if (!billData) {
                throw new NotFoundError('La factura no existe en el registro.', 'Bill');
            }

            const pdfService = new PDFService();
            const { invoice } = await this.mapBillToInvoice(billData);

            const format = (req.query.format as 'A4' | 'ticket') || 'A4';
            const pdfBuffer = await pdfService.generateInvoicePDF(invoice, format);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Factura-${billData.documentNumber}.pdf`);
            res.send(pdfBuffer);
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/bills/:id/xml
     * Genera y descarga el XML firmado de una factura existente
     */
    public generateXml = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            logger.info('Generating XML for existing bill', { id });

            const billData = await this.getBills.executeById(id);

            if (!billData) {
                throw new NotFoundError('La factura no existe en el registro.', 'Bill');
            }

            if (!billData.accessKey) {
                throw new Error('Esta transacción no tiene Clave de Acceso generada en el SRI.');
            }

            const { invoice, config } = await this.mapBillToInvoice(billData);

            // Generar y firmar el XML
            const xml = this.sriService.generateInvoiceXML(invoice, billData.accessKey);
            const signedXml = await this.sriService.signXML(xml, config);

            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('Content-Disposition', `attachment; filename=Factura-${billData.documentNumber}.xml`);
            res.send(signedXml);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Mapea los datos de una Bill persistida al formato Invoice usado por SRI/PDF Service
     * Incluye PENNY ADJUSTMENT para consistencia con BillingService.calculateDetails()
     */
    private mapBillToInvoice = async (billData: any): Promise<{ invoice: any; config: any }> => {
        const config: any = await RestaurantConfigModel.findOne();
        const [estab, ptoEmi, secuencial] = billData.documentNumber.split('-');
        const taxRate: number = config?.billing?.taxRate || 15;

        // 1. Primera pasada: calcular subtotales por item
        const detalles = billData.items.map((item: any) => {
            const itemTaxRate = (item.taxRate !== undefined && item.taxRate !== null) ? item.taxRate : taxRate;
            const rateDecimal = itemTaxRate / 100;
            const totalConIva = item.total || (item.price * item.quantity);

            let subtotal: number;
            let taxValue: number;

            if (itemTaxRate === 0) {
                subtotal = parseFloat(totalConIva.toFixed(2));
                taxValue = 0;
            } else {
                subtotal = parseFloat((totalConIva / (1 + rateDecimal)).toFixed(2));
                taxValue = parseFloat((totalConIva - subtotal).toFixed(2));
            }

            return {
                codigoPrincipal: item.id || item.name || 'ITEM',
                descripcion: item.name,
                cantidad: item.quantity,
                precioUnitario: parseFloat((subtotal / item.quantity).toFixed(6)),
                descuento: 0,
                precioTotalSinImpuesto: subtotal,
                price: item.price,
                total: totalConIva,
                impuestos: [{
                    codigo: '2',
                    codigoPorcentaje: this.billingService.getTaxCode(itemTaxRate),
                    tarifa: itemTaxRate,
                    baseImponible: subtotal,
                    valor: taxValue
                }],
                // Guardar referencia al item original para penny adjustment
                _originalItem: item,
                _itemTaxRate: itemTaxRate
            };
        });

        // 2. PENNY ADJUSTMENT por grupo de IVA (igual que BillingService.calculateDetails)
        const groupsByRate = new Map<number, { detalles: any[], totalInclusive: number }>();

        detalles.forEach((detalle: any) => {
            const rate = detalle._itemTaxRate;
            if (!groupsByRate.has(rate)) {
                groupsByRate.set(rate, { detalles: [], totalInclusive: 0 });
            }
            const group = groupsByRate.get(rate)!;
            group.detalles.push(detalle);
            group.totalInclusive += detalle.total;
        });

        for (const [rate, group] of groupsByRate.entries()) {
            if (group.detalles.length === 0) continue;

            const rateDecimal = rate / 100;
            const groupSubtotalSum = group.detalles.reduce((sum: number, d: any) => sum + d.precioTotalSinImpuesto, 0);

            const targetGroupSubtotal = rate === 0
                ? parseFloat(group.totalInclusive.toFixed(2))
                : parseFloat((group.totalInclusive / (1 + rateDecimal)).toFixed(2));

            const difference = parseFloat((targetGroupSubtotal - groupSubtotalSum).toFixed(2));

            if (Math.abs(difference) > 0 && Math.abs(difference) < 0.10) {
                const lastDetalle = group.detalles[group.detalles.length - 1];

                lastDetalle.precioTotalSinImpuesto = parseFloat((lastDetalle.precioTotalSinImpuesto + difference).toFixed(2));
                lastDetalle.precioUnitario = parseFloat((lastDetalle.precioTotalSinImpuesto / lastDetalle.cantidad).toFixed(6));

                const newTaxValue = rate === 0 ? 0 : parseFloat((lastDetalle.total - lastDetalle.precioTotalSinImpuesto).toFixed(2));
                lastDetalle.impuestos[0].baseImponible = lastDetalle.precioTotalSinImpuesto;
                lastDetalle.impuestos[0].valor = newTaxValue;
            }
        }

        // 3. Limpiar campos temporales
        detalles.forEach((d: any) => {
            delete d._originalItem;
            delete d._itemTaxRate;
        });

        const invoice = {
            orderId: billData.orderId,
            authorizationDate: billData.authorizationDate,
            creationDate: billData.createdAt,
            detalles,
            info: {
                estab, ptoEmi, secuencial,
                fechaEmision: billData.date,
                razonSocialComprador: billData.customerName,
                identificacionComprador: billData.customerIdentification,
                tipoIdentificacionComprador: this.billingService.getIdentificacionType(billData.customerIdentification),
                direccionComprador: billData.customerAddress || 'S/N',
                emailComprador: billData.customerEmail,
                importeTotal: billData.total,
                totalSinImpuestos: billData.subtotal,
                totalDescuento: 0,
                claveAcceso: billData.accessKey,
                ambiente: billData.environment || '1',
                ruc: config?.ruc || process.env.RUC || '0000000000001',
                razonSocial: config?.businessName || process.env.BUSINESS_NAME || 'RESTAURANTE PICANTERIA',
                nombreComercial: config?.name || process.env.COMMERCIAL_NAME,
                dirMatriz: config?.address || process.env.DIR_MATRIZ || 'Guayaquil, Ecuador',
                dirEstablecimiento: config?.address || process.env.DIR_ESTABLECIMIENTO || process.env.DIR_MATRIZ,
                tasaIva: taxRate.toString(),
                obligadoContabilidad: config?.obligadoContabilidad ? 'SI' : 'NO',
                moneda: 'DOLAR',
                formaPago: this.billingService.getPaymentMethodCode(billData.paymentMethod || '01'),
                telefonoComprador: billData.customerPhone || 'S/N',
                emailMatriz: config?.fiscalEmail || config?.email || process.env.SMTP_FROM,
                logoUrl: this.billingService.getLogoUrl(config)
            }
        };

        return { invoice, config };
    };


    public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            logger.info('Deleting bill', { id });

            const success = await this.deleteBill.execute(id);

            if (!success) {
                throw new NotFoundError('La factura no existe o no se pudo eliminar.', 'Bill');
            }

            logger.info('Bill deleted successfully', { id });
            res.json(ResponseFormatter.success({ success: true, message: 'Factura eliminada correctamente' }));
        } catch (error) {
            next(error);
        }
    };

    public reset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.warn('⚠️ RESET SYSTEM REQUESTED ⚠️');
            const result = await this.resetBillingSystem.execute();
            logger.info('System reset completed successfully');
            res.json(ResponseFormatter.success(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/bills/reset-all
     * PURGA TOTAL DEL SISTEMA (USA CON PRECAUCION)
     */
    public resetAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.error('🧨 nuclear RESET ALL REQUESTED 🧨');
            const result = await this.resetFullSystem.execute();
            logger.info('Full system purge completed successfully');
            res.json(ResponseFormatter.success(result));
        } catch (error) {
            next(error);
        }
    };
}
