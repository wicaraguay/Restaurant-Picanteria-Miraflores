import { SRIService } from '../../infrastructure/services/SRIService';
import { ICreditNoteRepository } from '../../domain/repositories/ICreditNoteRepository';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { PDFService } from '../../infrastructure/services/PDFService';
import { IEmailService } from '../interfaces/IEmailService';
import { CreditNote as BillingCreditNote } from '../../domain/billing/creditNote';
import { BillingService } from '../services/BillingService';
import { logger, maskAccessKey } from '../../infrastructure/utils/Logger';

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
        // FIX S-02: Mask access key in logs
        logger.debug(`[CheckCreditNoteStatus] Checking status for access key: ${maskAccessKey(accessKey)}`);

        try {
            // 1. Find credit note in database
            const creditNote = await this.creditNoteRepository.findByAccessKey(accessKey);
            if (!creditNote) {
                throw new Error('Nota de crédito no encontrada');
            }

            // --- RETRY LIMIT & DATE LOGIC (SRI 2026 Compliance) ---
            // El límite diario (3) aplica a ENVÍOS reales al SRI, no a consultas de estado.
            // Consultar la autorización es una operación de lectura que el SRI permite
            // libremente — antes cada clic en "Verificar estado" consumía un intento.
            const todayEcuador = this.billingService.getCurrentDateEcuador();
            const todayISO = todayEcuador.split('/').reverse().join('-'); // YYYY-MM-DD
            const lastRetry = creditNote.lastRetryDate;

            // Envíos al SRI realizados hoy (se resetea al cambiar el día)
            let sendsToday = lastRetry === todayISO ? (creditNote.retryCount || 0) : 0;
            const shouldGenerateNewKey = lastRetry !== todayISO;
            const DAILY_SEND_LIMIT = 3;

            if (shouldGenerateNewKey) {
                logger.info(`[CheckCreditNoteStatus] New day detected (${lastRetry} -> ${todayISO}). Resetting send counter.`);
            }
            // -----------------------------------------------------

            // Ambiente del documento (persistido al emitir); fallback al ambiente activo en BD.
            // Un documento emitido en pruebas debe verificarse contra pruebas aunque el
            // sistema haya cambiado a producción después.
            const environment = creditNote.environment || await this.configRepository.getEnvironment();
            const isProd = environment === '2';
            let authResult;

            if (shouldGenerateNewKey) {
                // Regenerar clave + reenviar ES un envío al SRI → consume el límite diario
                if (sendsToday >= DAILY_SEND_LIMIT) {
                    logger.warn(`[CheckCreditNoteStatus] Daily send limit (${DAILY_SEND_LIMIT}) reached for ${creditNote.documentNumber}`);
                    return {
                        success: false,
                        error: `SRI_LIMIT_REACHED: Límite de ${DAILY_SEND_LIMIT} envíos diarios alcanzado para este comprobante. Por favor, intente el día de mañana con una nueva clave de acceso automática.`
                    };
                }

                logger.info(`[CheckCreditNoteStatus] REGENERATING ACCESS KEY for ${creditNote.documentNumber} due to date change.`);

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
                const signedXml = await this.sriService.signXML(xml, config || undefined);

                // FIX S-02: Mask access key in logs
                logger.info(`[CheckCreditNoteStatus] New Access Key generated: ${maskAccessKey(newAccessKey)}`);

                // Send to SRI
                const sendResult = await this.sriService.sendCreditNoteToSRI(signedXml, isProd);
                sendsToday = 1; // Primer envío del nuevo día
                logger.info(`[CheckCreditNoteStatus] Resend result: ${sendResult.estado}`);

                // Wait for authorization
                authResult = await this.sriService.waitForAuthorization(newAccessKey, isProd);

                // Update database with new key and status
                await this.creditNoteRepository.update(creditNote.id, {
                    accessKey: newAccessKey,
                    sriStatus: authResult.estado,
                    authorizationDate: authResult.fechaAutorizacion,
                    retryCount: sendsToday,
                    lastRetryDate: todayISO,
                    date: new Date().toISOString()
                });

                accessKey = newAccessKey; // Update local variable for subsequent logic
            } else {
                // NORMAL POLL: consultar el estado de autorización es LECTURA — no consume el límite
                authResult = await this.sriService.authorizeCreditNote(accessKey, isProd);

                if (authResult.estado === 'EN PROCESO' || authResult.estado === 'UNKNOWN' || !authResult.estado) {
                    // El SRI no tiene el comprobante (o sigue pendiente) → requiere REENVÍO,
                    // y reenviar sí consume el límite diario
                    if (sendsToday >= DAILY_SEND_LIMIT) {
                        logger.warn(`[CheckCreditNoteStatus] Daily send limit (${DAILY_SEND_LIMIT}) reached for ${creditNote.documentNumber} — skipping resend`);
                        return {
                            success: false,
                            error: `SRI_LIMIT_REACHED: Límite de ${DAILY_SEND_LIMIT} envíos diarios alcanzado para este comprobante. La consulta de estado sigue disponible, pero el reenvío se habilitará mañana con una nueva clave de acceso automática.`,
                            status: authResult.estado || 'EN PROCESO'
                        };
                    }

                    logger.info(`[CheckCreditNoteStatus] Document not found or pending. Attempting a fresh send.`);

                    const config = await this.configRepository.get();
                    const originalBill = await this.billRepository.findById(creditNote.billId);

                    if (config && originalBill) {
                        const billingNC = this.mapToBillingCreditNote(creditNote, config, originalBill);
                        const xml = this.sriService.generateCreditNoteXML(billingNC, accessKey);
                        const signedXml = await this.sriService.signXML(xml, config || undefined);
                        await this.sriService.sendCreditNoteToSRI(signedXml, isProd);
                        sendsToday++;

                        // Re-query authorization
                        authResult = await this.sriService.waitForAuthorization(accessKey, isProd);
                    }
                }

                // Update database with latest status; retryCount solo refleja envíos reales
                await this.creditNoteRepository.update(creditNote.id, {
                    sriStatus: authResult.estado,
                    authorizationDate: authResult.fechaAutorizacion,
                    retryCount: sendsToday,
                    lastRetryDate: todayISO
                });
            }

            logger.debug(`[CheckCreditNoteStatus] Final state: ${authResult.estado}`);

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
                        logger.error('[CheckCreditNoteStatus] Error sending email:', emailError);
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
                retryCount: sendsToday,
                sriResponse: authResult
            };

        } catch (error: any) {
            logger.error(`[CheckCreditNoteStatus] Error:`, error);
            throw error;
        }
    }

    private mapToBillingCreditNote(entity: any, config: any, originalBill: any, authDate?: string): BillingCreditNote {
        const [estab, ptoEmi, secuencial] = entity.documentNumber.split('-');
        const info: any = config || {};
        // FIX M-01: Use dynamic tax rate from config instead of hardcoded 15%
        const taxRate = info.billing?.taxRate || 15;

        // CRITICAL: Recalcular los detalles desde los ítems de la factura original con
        // calculateDetails — EXACTAMENTE el mismo camino que la emisión (GenerateCreditNote).
        // El cálculo manual anterior (quantity × price) no aplicaba el penny adjustment
        // y podía reintroducir el error SRI 52 "ERROR EN DIFERENCIAS" en los reintentos.
        const details = this.billingService.calculateDetails(originalBill.items, taxRate);
        const subtotal = details.reduce((sum, d) => sum + d.precioTotalSinImpuesto, 0);
        const totalImpuestos = details.reduce((sum, d) => sum + d.impuestos[0].valor, 0);
        const total = subtotal + totalImpuestos;

        return {
            info: {
                ambiente: entity.environment || (process.env.SRI_ENV === '2' ? '2' : '1'),
                tipoEmision: '1',
                // Campos reales del schema de config: businessName/name (config.razonSocial NO existe
                // — el mapper anterior generaba <razonSocial> vacío y el SRI rechazaba el reenvío)
                razonSocial: info.businessName || process.env.BUSINESS_NAME || 'RESTAURANTE DEMO',
                nombreComercial: info.name || process.env.COMMERCIAL_NAME,
                ruc: info.ruc || process.env.RUC,
                claveAcceso: entity.accessKey,
                codDoc: '04',
                estab,
                ptoEmi,
                secuencial,
                dirMatriz: info.fiscalAddress || info.address || process.env.DIR_MATRIZ,
                dirEstablecimiento: info.fiscalAddress || info.address || process.env.DIR_ESTABLECIMIENTO || process.env.DIR_MATRIZ,
                // Fechas en zona horaria Ecuador (formatDateToSRI) — derivarlas de la porción
                // UTC del ISO desplazaba +1 día para emisiones posteriores a las 19:00 Ecuador
                fechaEmision: this.billingService.formatDateToSRI(entity.date),
                codDocModificado: '01',
                numDocModificado: originalBill.documentNumber,
                fechaEmisionDocSustento: this.billingService.formatDateToSRI(originalBill.date),
                tipoIdentificacionComprador: this.billingService.getIdentificacionType(entity.customerIdentification),
                razonSocialComprador: entity.customerName,
                identificacionComprador: entity.customerIdentification,
                motivo: entity.reasonDescription || entity.reason,
                totalSinImpuestos: subtotal,
                totalDescuento: 0,
                totalImpuestos: [],
                importeTotal: total,
                moneda: 'DOLAR',
                obligadoContabilidad: info.obligadoContabilidad ? 'SI' : 'NO',
                emailComprador: entity.customerEmail,
                logoUrl: this.billingService.getLogoUrl(info),
                emailMatriz: info.fiscalEmail || info.email || process.env.SMTP_FROM
            },
            detalles: details,
            billId: entity.billId,
            status: 'AUTHORIZED',
            creationDate: new Date(entity.date),
            authorizationDate: authDate || entity.authorizationDate
        };
    }
}
