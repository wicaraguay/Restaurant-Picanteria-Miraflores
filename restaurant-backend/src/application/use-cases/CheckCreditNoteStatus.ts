import { SRIService } from '../../infrastructure/services/SRIService';
import { ICreditNoteRepository } from '../../domain/repositories/ICreditNoteRepository';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { PDFService } from '../../infrastructure/services/PDFService';
import { IEmailService } from '../interfaces/IEmailService';
import { CreditNote as BillingCreditNote } from '../../domain/billing/creditNote';

export class CheckCreditNoteStatus {
    constructor(
        private configRepository: IRestaurantConfigRepository,
        private creditNoteRepository: ICreditNoteRepository,
        private billRepository: IBillRepository,
        private sriService: SRIService,
        private pdfService: PDFService,
        private emailService: IEmailService
    ) { }

    async execute(accessKey: string): Promise<any> {
        console.log(`[CheckCreditNoteStatus] Checking status for access key: ${accessKey}`);

        // 1. Find credit note in database
        const creditNote = await this.creditNoteRepository.findByAccessKey(accessKey);
        if (!creditNote) {
            throw new Error('Nota de crédito no encontrada');
        }

        // 2. Query SRI for authorization status
        const isProd = process.env.SRI_ENV === '2';
        const authResult = await this.sriService.authorizeCreditNote(accessKey, isProd);

        console.log(`[CheckCreditNoteStatus] SRI Response: ${authResult.estado}`);

        // 3. Update database with latest status
        if (authResult.estado && authResult.estado !== creditNote.sriStatus) {
            await this.creditNoteRepository.update(creditNote.id, {
                sriStatus: authResult.estado,
                authorizationDate: authResult.fechaAutorizacion
            });
            console.log(`[CheckCreditNoteStatus] Updated credit note status to: ${authResult.estado}`);

            // 4. If authorized, send email
            if (authResult.estado === 'AUTORIZADO') {
                const isValidEmail = creditNote.customerEmail &&
                    !creditNote.customerEmail.includes('consumidor@final') &&
                    !creditNote.customerEmail.includes('noemail') &&
                    creditNote.customerEmail.includes('@');

                if (isValidEmail) {
                    try {
                        console.log(`[CheckCreditNoteStatus] Sending authorized email to ${creditNote.customerEmail}`);
                        const entity = await this.creditNoteRepository.findByAccessKey(accessKey);
                        if (entity) {
                            const config = await this.configRepository.get();
                            const originalBill = await this.billRepository.findById(entity.billId);
                            
                            if (config && originalBill) {
                                const billingNC = this.mapToBillingCreditNote(entity, config, originalBill, authResult.fechaAutorizacion);
                                const pdfBuffer = await this.pdfService.generateCreditNotePDF(billingNC);
                                await this.emailService.sendCreditNoteEmail(entity.customerEmail!, billingNC, pdfBuffer);
                                console.log('[CheckCreditNoteStatus] email sent successfully');
                            }
                        }
                    } catch (emailError) {
                        console.error('[CheckCreditNoteStatus] Error sending email:', emailError);
                    }
                }
            }
        }

        return {
            creditNoteId: creditNote.id,
            documentNumber: creditNote.documentNumber,
            accessKey: accessKey,
            status: authResult.estado,
            authorizationNumber: authResult.numeroAutorizacion,
            authorizationDate: authResult.fechaAutorizacion,
            sriResponse: authResult
        };
    }

    private mapToBillingCreditNote(entity: any, config: any, originalBill: any, authDate?: string): BillingCreditNote {
        const [estab, ptoEmi, secuencial] = entity.documentNumber.split('-');
        
        return {
            info: {
                ambiente: entity.environment || (process.env.SRI_ENV === '2' ? '2' : '1'),
                tipoEmision: '1',
                razonSocial: config.razonSocial,
                nombreComercial: config.nombreComercial,
                ruc: config.ruc,
                claveAcceso: entity.accessKey,
                codDoc: '04',
                estab,
                ptoEmi,
                secuencial,
                dirMatriz: config.dirMatriz,
                fechaEmision: entity.date.split('T')[0].split('-').reverse().join('/'), 
                codDocModificado: '01',
                numDocModificado: originalBill.documentNumber,
                fechaEmisionDocSustento: originalBill.createdAt ? new Date(originalBill.createdAt).toLocaleDateString('es-EC') : '', 
                tipoIdentificacionComprador: originalBill.customerIdentification.length === 13 ? '04' : '05',
                razonSocialComprador: entity.customerName,
                identificacionComprador: entity.customerIdentification,
                motivo: entity.reasonDescription,
                totalSinImpuestos: entity.subtotal,
                totalDescuento: 0,
                totalImpuestos: [{
                    codigo: '2',
                    codigoPorcentaje: '4', // 15%
                    tarifa: 15,
                    baseImponible: entity.subtotal,
                    valor: entity.tax
                }],
                importeTotal: entity.total,
                moneda: 'DOLAR',
                obligadoContabilidad: config.obligadoContabilidad ? 'SI' : 'NO',
                emailComprador: entity.customerEmail,
                logoUrl: config.logoUrl,
                emailMatriz: config.email
            },
            detalles: entity.items.map((item: any) => ({
                codigoPrincipal: item.code || 'SERV',
                descripcion: item.name,
                cantidad: item.quantity,
                precioUnitario: item.price,
                descuento: 0,
                precioTotalSinImpuesto: item.quantity * item.price,
                impuestos: [{
                    codigo: '2',
                    codigoPorcentaje: '4',
                    tarifa: 15,
                    baseImponible: item.quantity * item.price,
                    valor: (item.total - (item.quantity * item.price))
                }]
            })),
            billId: entity.billId,
            status: 'AUTHORIZED',
            creationDate: new Date(entity.date),
            authorizationDate: authDate || entity.authorizationDate
        };
    }
}
