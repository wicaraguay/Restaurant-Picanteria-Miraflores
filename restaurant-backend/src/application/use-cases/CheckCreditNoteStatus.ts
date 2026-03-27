import { SRIService } from '../../infrastructure/services/SRIService';
import { ICreditNoteRepository } from '../../domain/repositories/ICreditNoteRepository';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { PDFService } from '../../infrastructure/services/PDFService';
import { IEmailService } from '../interfaces/IEmailService';
import { CreditNote as BillingCreditNote } from '../../domain/billing/creditNote';
import { BillingService } from '../services/BillingService';

export class CheckCreditNoteStatus {
    constructor(
        private configRepository: IRestaurantConfigRepository,
        private creditNoteRepository: ICreditNoteRepository,
        private billRepository: IBillRepository,
        private sriService: SRIService,
        private pdfService: PDFService,
        private emailService: IEmailService,
        private billingService: BillingService
    ) { }

    async execute(accessKey: string): Promise<any> {
        console.log(`[CheckCreditNoteStatus] Checking status for access key: ${accessKey}`);

        try {
            // 1. Find credit note in database
            const creditNote = await this.creditNoteRepository.findByAccessKey(accessKey);
            if (!creditNote) {
                throw new Error('Nota de crédito no encontrada');
            }

            // --- RETRY LIMIT & DATE LOGIC (SRI 2026 Compliance) ---
            const todayEcuador = this.billingService.getCurrentDateEcuador();
            const todayISO = todayEcuador.split('/').reverse().join('-'); // YYYY-MM-DD
            const lastRetry = creditNote.lastRetryDate;

            let newRetryCount = (creditNote.retryCount || 0);
            let shouldGenerateNewKey = false;

            if (lastRetry !== todayISO) {
                // New day! Reset counter
                console.log(`[CheckCreditNoteStatus] New day detected (${lastRetry} -> ${todayISO}). Resetting retry counter.`);
                newRetryCount = 1; // First attempt of the new day
                shouldGenerateNewKey = true;
            } else {
                newRetryCount++;
                console.log(`[CheckCreditNoteStatus] Same day attempt. New retry count: ${newRetryCount}`);

                if (newRetryCount > 3) { // Changed from > 2 to > 3
                    console.warn(`[CheckCreditNoteStatus] Daily limit (3) reached for ${creditNote.documentNumber}`);
                    return {
                        success: false,
                        error: 'SRI_LIMIT_REACHED: Límite de 3 intentos diarios alcanzado para este comprobante (1 emisión + 2 reintentos). Por favor, intente el día de mañana con una nueva clave de acceso automática.'
                    };
                }
            }
            // -----------------------------------------------------

            const isProd = process.env.SRI_ENV === '2';
            let authResult;

            if (shouldGenerateNewKey) {
                console.log(`[CheckCreditNoteStatus] REGENERATING ACCESS KEY for ${creditNote.documentNumber} due to date change.`);

                // Get config and original bill for regeneration
                const config = await this.configRepository.get();
                const originalBill = await this.billRepository.findById(creditNote.billId);

                if (!config || !originalBill) {
                    throw new Error('Configuración o factura original no encontrada para regenerar la nota de crédito');
                }

                // Map to domain object for XML generation
                const billingNC = this.mapToBillingCreditNote(creditNote, config, originalBill);

                // Update with current date
                billingNC.info.fechaEmision = todayEcuador;

                // Generate new XML (pass undefined to force new access key)
                const xml = this.sriService.generateCreditNoteXML(billingNC, undefined);
                const newAccessKey = billingNC.info.claveAcceso!;
                const signedXml = await this.sriService.signXML(xml);

                console.log(`[CheckCreditNoteStatus] New Access Key generated: ${newAccessKey}`);

                // Send to SRI
                const sendResult = await this.sriService.sendCreditNoteToSRI(signedXml, isProd);
                console.log(`[CheckCreditNoteStatus] Resend result: ${sendResult.estado}`);

                // Wait for authorization
                authResult = await this.sriService.waitForAuthorization(newAccessKey, isProd);

                // Update database with new key and status
                await this.creditNoteRepository.update(creditNote.id, {
                    accessKey: newAccessKey,
                    sriStatus: authResult.estado,
                    authorizationDate: authResult.fechaAutorizacion,
                    retryCount: newRetryCount,
                    lastRetryDate: todayISO,
                    date: new Date().toISOString()
                });

                accessKey = newAccessKey; // Update local variable for subsequent logic
            } else {
                // NORMAL POLL: Query SRI for authorization status
                authResult = await this.sriService.authorizeCreditNote(accessKey, isProd);

                // If it's not authorized yet and we are in "Retry" mode, we might want to resend?
                // For now, let's keep it consistent: we just authorize. 
                // Wait, if it's DEVUELTA/NO ENCONTRADO, we SHOULD resend manually or via status check.

                if (authResult.estado === 'EN PROCESO' || authResult.estado === 'UNKNOWN' || !authResult.estado) {
                    // Try to resend if it was never received
                    console.log(`[CheckCreditNoteStatus] Document not found or pending. Attempting a fresh send.`);

                    const config = await this.configRepository.get();
                    const originalBill = await this.billRepository.findById(creditNote.billId);

                    if (config && originalBill) {
                        const billingNC = this.mapToBillingCreditNote(creditNote, config, originalBill);
                        const xml = this.sriService.generateCreditNoteXML(billingNC, accessKey);
                        const signedXml = await this.sriService.signXML(xml);
                        await this.sriService.sendCreditNoteToSRI(signedXml, isProd);

                        // Re-query authorization
                        authResult = await this.sriService.waitForAuthorization(accessKey, isProd);
                    }
                }

                // Update database with latest status and increment retry count
                await this.creditNoteRepository.update(creditNote.id, {
                    sriStatus: authResult.estado,
                    authorizationDate: authResult.fechaAutorizacion,
                    retryCount: newRetryCount,
                    lastRetryDate: todayISO
                });
            }

            console.log(`[CheckCreditNoteStatus] Final state: ${authResult.estado}`);

            // 4. If authorized, send email
            if (authResult.estado === 'AUTORIZADO') {
                // ... (Keep existing email logic)
                const isValidEmail = creditNote.customerEmail &&
                    !creditNote.customerEmail.includes('consumidor@final') &&
                    !creditNote.customerEmail.includes('noemail') &&
                    creditNote.customerEmail.includes('@');

                if (isValidEmail) {
                    try {
                        const config = await this.configRepository.get();
                        const originalBill = await this.billRepository.findById(creditNote.billId);

                        if (config && originalBill) {
                            const updatedNC = await this.creditNoteRepository.findById(creditNote.id);
                            if (updatedNC) {
                                const billingNC = this.mapToBillingCreditNote(updatedNC, config, originalBill, authResult.fechaAutorizacion);
                                const pdfBuffer = await this.pdfService.generateCreditNotePDF(billingNC);
                                await this.emailService.sendCreditNoteEmail(updatedNC.customerEmail!, billingNC, pdfBuffer);
                            }
                        }
                    } catch (emailError) {
                        console.error('[CheckCreditNoteStatus] Error sending email:', emailError);
                    }
                }

                // Mark original bill as CANCELLED
                await this.billRepository.upsert({
                    id: creditNote.billId,
                    sriStatus: 'CANCELLED',
                    hasCreditNote: true
                } as any);
            }

            return {
                creditNoteId: creditNote.id,
                documentNumber: creditNote.documentNumber,
                accessKey: accessKey,
                status: authResult.estado,
                authorizationNumber: authResult.numeroAutorizacion,
                authorizationDate: authResult.fechaAutorizacion,
                retryCount: newRetryCount,
                sriResponse: authResult
            };

        } catch (error: any) {
            console.error(`[CheckCreditNoteStatus] Error:`, error);
            throw error;
        }
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
