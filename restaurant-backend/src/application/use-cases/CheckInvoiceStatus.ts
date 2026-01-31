
import { SRIService } from '../../infrastructure/services/SRIService';
import { PDFService } from '../../infrastructure/services/PDFService';
import { EmailService } from '../../infrastructure/services/EmailService';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';

export class CheckInvoiceStatus {
    constructor(
        private configRepository: IRestaurantConfigRepository,
        private billRepository: IBillRepository,
        private orderRepository: IOrderRepository,
        private sriService: SRIService,
        private pdfService: PDFService,
        private emailService: EmailService
    ) { }

    async execute(accessKey: string, isProd: boolean): Promise<any> {
        // 1. Authorize with SRI
        // 1. Authorize with SRI (Polling for Resilience)
        let authResult;
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            attempts++;
            if (attempts > 1) await new Promise(r => setTimeout(r, 2000)); // 2s delay for updates

            console.log(`[CheckInvoiceStatus] Attempt ${attempts}/${maxAttempts}...`);
            authResult = await this.sriService.authorizeInvoice(accessKey, isProd);

            if (authResult.estado === 'AUTORIZADO') break;
            if (authResult.estado === 'DEVUELTA') break; // Unless checking specifically for processing msg?

            // If EN PROCESO, continue
            if (authResult.estado !== 'EN PROCESO' && authResult.estado !== 'UNKNOWN') break;
        }

        if (authResult.estado === 'AUTORIZADO') {
            // 2. Update Bill in DB
            const bill = await this.billRepository.upsert({
                accessKey: accessKey,
                sriStatus: 'AUTORIZADO',
                authorizationDate: authResult.fechaAutorizacion,
                environment: isProd ? '2' : '1'
            });

            // 3. Send Email (Retry Logic)
            if (bill && bill.customerEmail) {
                try {
                    // Reconstruct Invoice for PDF
                    const config = await this.configRepository.get();
                    const info = config || {} as any;
                    const [estab, ptoEmi, secuencial] = bill.documentNumber.split('-');

                    const invoiceForPdf: any = {
                        orderId: bill.orderId,
                        status: 'AUTHORIZED',
                        authorizationDate: authResult.fechaAutorizacion,
                        creationDate: new Date(bill.date),
                        detalles: bill.items.map((item: any) => ({
                            descripcion: item.name,
                            cantidad: item.quantity,
                            precioUnitario: item.price,
                            precioTotalSinImpuesto: item.total - (item.total * 0.15), // Approx (Should ideally come from DB)
                            impuestos: [{
                                codigo: '2',
                                tarifa: 15,
                                valor: item.total - (item.total / 1.15)
                            }]
                        })),
                        info: {
                            estab, ptoEmi, secuencial,
                            fechaEmision: bill.date,
                            razonSocialComprador: bill.customerName,
                            identificacionComprador: bill.customerIdentification,
                            direccionComprador: bill.customerAddress || 'S/N',
                            emailComprador: bill.customerEmail,
                            importeTotal: bill.total,
                            totalSinImpuestos: bill.subtotal,
                            claveAcceso: bill.accessKey,
                            ambiente: bill.environment || '1',
                            ruc: info.ruc || process.env.RUC || '0000000000001',
                            razonSocial: info.businessName || process.env.BUSINESS_NAME || 'RESTAURANTE',
                            nombreComercial: info.name || process.env.COMMERCIAL_NAME,
                            dirMatriz: info.address || process.env.DIR_MATRIZ || 'Matriz',
                            dirEstablecimiento: info.address || process.env.DIR_ESTABLECIMIENTO || 'Establecimiento',
                            logoUrl: info.fiscalLogo || info.logo || 'default-logo-url',
                            emailMatriz: info.fiscalEmail || info.email || process.env.SMTP_FROM || 'info@restaurant.com'
                        }
                    };

                    const pdfBuffer = await this.pdfService.generateInvoicePDF(invoiceForPdf);
                    const xmlContent = authResult.comprobanteAutorizado || undefined;

                    // Skip email for Consumidor Final
                    const isConsumidorFinal = bill.customerIdentification === '9999999999999';
                    const isValidEmail = bill.customerEmail &&
                        !bill.customerEmail.includes('consumidor@final') &&
                        !bill.customerEmail.includes('noemail') &&
                        bill.customerEmail.includes('@');

                    if (!isConsumidorFinal && isValidEmail) {
                        console.log(`[CheckInvoiceStatus] Sending email to ${bill.customerEmail}`);
                        await this.emailService.sendInvoiceEmail(bill.customerEmail, invoiceForPdf, pdfBuffer, xmlContent);
                    } else {
                        console.log('[CheckInvoiceStatus] Skipping email - Consumidor Final or invalid email');
                    }

                } catch (emailError) {
                    console.error('Error in email process (retry):', emailError);
                }
            }
        }

        return {
            success: true,
            authorization: authResult
        };
    }
}
