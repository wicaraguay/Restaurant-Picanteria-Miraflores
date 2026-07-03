import { SRIService } from '../../infrastructure/services/SRIService';
import { PDFService } from '../../infrastructure/services/PDFService';
import { IEmailService } from '../interfaces/IEmailService';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { ICreditNoteRepository } from '../../domain/repositories/ICreditNoteRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { CreditNote, CreditNoteDetail, CREDIT_NOTE_REASONS } from '../../domain/billing/creditNote';

import { BillingService } from '../services/BillingService';
import { logger, maskAccessKey } from '../../infrastructure/utils/Logger';
import { SRI_MAX_DAILY_RETRIES, SRI_MAX_SEND_ATTEMPTS } from '../../config/billing.constants';

export class GenerateCreditNote {
    constructor(
        private configRepository: IRestaurantConfigRepository,
        private creditNoteRepository: ICreditNoteRepository,
        private billRepository: IBillRepository,
        private sriService: SRIService,
        private pdfService: PDFService,
        private emailService: IEmailService,
        private billingService: BillingService
    ) { }

    async execute(data: {
        billId: string;
        reason: string;
        customDescription?: string;
        taxRate?: number;
    }): Promise<any> {
        const { billId, reason, customDescription, taxRate = 15 } = data;

        logger.info(`[GenerateCreditNote] Starting credit note generation for bill: ${billId}`);

        // 1. Validate that the bill exists and is authorized
        const originalBill = await this.billRepository.findById(billId);
        if (!originalBill) {
            throw new Error('Factura original no encontrada');
        }

        if (originalBill.sriStatus !== 'AUTORIZADO') {
            throw new Error('Solo se pueden crear notas de crédito para facturas AUTORIZADAS');
        }

        if (!originalBill.accessKey) {
            throw new Error('La factura original no tiene clave de acceso');
        }


        // Validate that customer is not "Consumidor Final" according to SRI 2026 regulations
        // SRI Resolution NAC-DGERCGC25-00000017: Credit notes cannot be issued for "Consumidor Final" invoices
        const customerIdentType = this.billingService.getIdentificacionType(originalBill.customerIdentification);
        if (originalBill.customerIdentification === '9999999999999' || customerIdentType === '07') {
            throw new Error('No se puede emitir una nota de crédito para facturas de "CONSUMIDOR FINAL" según las normativas del SRI vigentes desde 2026 (Resolución NAC-DGERCGC25-00000017).');
        }

        // Resolution NAC-DGERCGC25-00000017 (2026): Credit notes have NO time limit to correct errors.
        // The 7-day limit applies only to ANNULMENT (fully deleting the record from SRI).
        // If the user missed the 7-day deadline to annul, the only way to correct is a credit note.
        logger.info(`[GenerateCreditNote] Bill validated: ${originalBill.documentNumber}`);

        // --- CHECK FOR EXISTING AUTHORIZED CREDIT NOTE ---
        const existingCreditNotes = await this.creditNoteRepository.findByBillId(billId);
        const authorizedNC = existingCreditNotes.find(nc => nc.sriStatus === 'AUTORIZADO');
        if (authorizedNC) {
            throw new Error(
                `Ya existe una nota de crédito AUTORIZADA para esta factura (${authorizedNC.documentNumber}). ` +
                `Una factura solo puede tener una nota de crédito autorizada.`
            );
        }
        // -------------------------------------------------

        // --- RETRY LIMIT CHECK (FIX M-02: Use configurable limit) ---
        const todayISO = this.billingService.getCurrentDateEcuador().split('/').reverse().join('-');
        const todayNC = existingCreditNotes.find(nc => nc.lastRetryDate === todayISO);

        if (todayNC && (todayNC.retryCount || 0) >= SRI_MAX_DAILY_RETRIES) {
            throw new Error(`SRI_LIMIT_REACHED: Límite de ${SRI_MAX_DAILY_RETRIES} intentos diarios alcanzado para este comprobante. Por favor, intente el día de mañana con una nueva clave de acceso automática.`);
        }
        // -------------------------

        // 2. Calculate Details (same items as original bill, but as credit)
        const details = this.billingService.calculateDetails(originalBill.items, taxRate);

        const subtotal = details.reduce((sum, d) => sum + d.precioTotalSinImpuesto, 0);
        const totalImpuestos = details.reduce((sum, d) => sum + d.impuestos[0].valor, 0);
        const total = subtotal + totalImpuestos;

        // 3. Get Config
        const config = await this.configRepository.get();
        const info = config || {} as any;
        // Ambiente desde la BD (configurable en la UI) — fuente única de verdad
        const environment = await this.configRepository.getEnvironment();

        // 4. Get Sequential for Credit Note
        // CRITICAL: If a PENDING credit note already exists for this bill (e.g. SRI was down),
        // reuse its sequential and access key to avoid gaps and duplicate entries in the DB.
        let secuencial: string;
        let existingPendingAccessKey: string | undefined;

        // Reusing the existingCreditNotes variable from the daily limit check
        // existingCreditNotes = await this.creditNoteRepository.findByBillId(billId); // Removed duplicate line
        // Reusing the existingCreditNotes variable from the daily limit check
        const pendingNC = existingCreditNotes.find(
            nc => nc.sriStatus !== 'AUTORIZADO' && nc.sriStatus !== 'CANCELLED'
            // Reutilizamos CUALQUIER nota de crédito que no esté finalizada (AUTORIZADA/CANCELADA)
            // Esto evita que el secuencial suba innecesariamente si el usuario intenta emitir varias veces la misma
        );

        if (pendingNC) {
            // Reuse the existing sequential and access key — do NOT consume a new number
            const parts = pendingNC.documentNumber.split('-');
            secuencial = parts[parts.length - 1];
            existingPendingAccessKey = pendingNC.accessKey || undefined;
            // FIX S-02: Mask access key in logs
            logger.info(`[GenerateCreditNote] ♻️ Found PENDING credit note. Reusing sequential: ${secuencial} | accessKey: ${maskAccessKey(existingPendingAccessKey)}`);
        } else {
            const nextSequential = await this.configRepository.getNextCreditNoteSequential();
            secuencial = nextSequential.toString().padStart(9, '0');
            logger.info(`[GenerateCreditNote] New sequential generated: ${secuencial}`);
        }

        // 5. Build Credit Note Object
        const now = new Date();
        const reasonDescription = customDescription || CREDIT_NOTE_REASONS[reason as keyof typeof CREDIT_NOTE_REASONS] || 'Nota de Crédito';

        const creditNote: CreditNote = {
            billId: billId,
            orderId: originalBill.orderId,
            status: 'PENDING',
            creationDate: now,
            detalles: details,
            info: {
                ambiente: environment,
                tipoEmision: '1',
                razonSocial: info.businessName || process.env.BUSINESS_NAME || 'RESTAURANTE DEMO',
                nombreComercial: info.name || process.env.COMMERCIAL_NAME,
                ruc: info.ruc || process.env.RUC || '0000000000001',
                dirMatriz: info.fiscalAddress || info.address || process.env.DIR_MATRIZ || 'Direccion Matriz',
                dirEstablecimiento: info.fiscalAddress || info.address || process.env.DIR_ESTABLECIMIENTO || process.env.DIR_MATRIZ,
                codDoc: '04',
                estab: info.billing?.establishment || process.env.ESTAB || '001',
                ptoEmi: info.billing?.emissionPoint || process.env.PTO_EMI || '001',
                secuencial: secuencial,
                fechaEmision: this.billingService.getCurrentDateEcuador(),

                // Document Modified (Original Invoice)
                codDocModificado: '01',
                numDocModificado: originalBill.documentNumber,
                fechaEmisionDocSustento: this.billingService.formatDateToSRI(originalBill.date),

                obligadoContabilidad: info.obligadoContabilidad ? 'SI' : 'NO',
                tipoIdentificacionComprador: this.billingService.getIdentificacionType(originalBill.customerIdentification),
                razonSocialComprador: originalBill.customerName,
                identificacionComprador: originalBill.customerIdentification,

                motivo: reasonDescription,

                totalSinImpuestos: subtotal,
                totalDescuento: 0,
                totalImpuestos: [],
                importeTotal: total,
                moneda: 'DOLAR',

                emailComprador: originalBill.customerEmail,
                logoUrl: this.billingService.getLogoUrl(info),
                emailMatriz: info.fiscalEmail || info.email || process.env.SMTP_FROM || 'info@restaurant.com',
                regime: info.billing?.regime,
                agenteRetencion: info.billing?.agenteRetencion
            }
        };

        // 6. Generate XML and Send to SRI with Auto-Retry for Duplicate Sequential
        logger.info('[GenerateCreditNote] Generating XML...');
        const isProd = environment === '2';

        // FIX I-06: Save DRAFT before sending to SRI to prevent duplicates on network errors
        // This ensures we can reuse the same sequential/accessKey on retry
        const draftCreditNote = await this.creditNoteRepository.upsert({
            accessKey: pendingNC?.accessKey || '', // Will be updated after XML generation
            documentNumber: `${creditNote.info.estab}-${creditNote.info.ptoEmi}-${secuencial}`,
            billId: billId,
            originalAccessKey: originalBill.accessKey,
            orderId: creditNote.orderId,
            date: now.toISOString(),
            reason: reason,
            reasonDescription: reasonDescription,
            customerName: creditNote.info.razonSocialComprador,
            customerIdentification: creditNote.info.identificacionComprador,
            customerAddress: originalBill.customerAddress,
            customerEmail: creditNote.info.emailComprador,
            items: details.map(d => ({
                name: d.descripcion,
                quantity: d.cantidad,
                price: d.precioUnitario,
                total: d.precioTotalSinImpuesto + (d.impuestos[0]?.valor || 0),
                taxRate: d.impuestos[0]?.tarifa ?? 15  // Guardar tasa de IVA por ítem (0%, 15%, etc.)
            })),
            subtotal: creditNote.info.totalSinImpuestos,
            tax: totalImpuestos,
            total: creditNote.info.importeTotal,
            sriStatus: 'BORRADOR',
            environment: isProd ? '2' : '1',
            sriMessage: 'Nota de crédito en proceso de envío al SRI'
        });
        logger.info(`[GenerateCreditNote] Draft credit note saved with ID: ${draftCreditNote.id}`);

        // Retry logic: If SRI rejects due to duplicate sequential, get new one and retry
        // FIX M-02: Use configurable limit instead of hardcoded value
        let attempts = 0;
        let result = null;
        let currentSequential = secuencial;
        let currentAccessKey = '';
        let signedXml = '';

        while (attempts < SRI_MAX_SEND_ATTEMPTS) {
            attempts++;
            logger.info(`[GenerateCreditNote] Attempt ${attempts}/${SRI_MAX_SEND_ATTEMPTS} - Using sequential: ${currentSequential}`);

            try {
                // Update credit note with current sequential
                creditNote.info.secuencial = currentSequential;

                // Generate XML
                // On the first attempt, pass existingPendingAccessKey (may be undefined for new NCs).
                // On subsequent attempts (duplicate sequential error), always generate a new key.
                const reuseKey = attempts === 1 ? existingPendingAccessKey : undefined;
                const xml = this.sriService.generateCreditNoteXML(creditNote, reuseKey);
                currentAccessKey = creditNote.info.claveAcceso!; // Access key is generated in generateCreditNoteXML

                // FIX I-06: Update draft with accessKey BEFORE sending to SRI
                // This ensures we can reuse the same key on retry if there's a timeout
                await this.creditNoteRepository.upsert({
                    id: draftCreditNote.id,
                    accessKey: currentAccessKey,
                    documentNumber: `${creditNote.info.estab}-${creditNote.info.ptoEmi}-${currentSequential}`,
                    sriStatus: 'ENVIANDO',
                    sriMessage: `Enviando al SRI (intento ${attempts}/${SRI_MAX_SEND_ATTEMPTS})...`
                });

                // Sign XML
                signedXml = await this.sriService.signXML(xml, config || undefined);

                // Send to SRI
                logger.info('[GenerateCreditNote] Sending to SRI...');
                result = await this.sriService.sendCreditNoteToSRI(signedXml, isProd);

                // SUCCESS: Break out of retry loop
                logger.info('[GenerateCreditNote] Successfully sent to SRI');
                break;

            } catch (error: any) {
                logger.error(`[GenerateCreditNote] Attempt ${attempts} failed:`, error.message);

                // Check if it's a duplicate sequential error
                const isDuplicateSequentialError =
                    error.message.includes('Error de Secuencia') ||
                    error.message.includes('ya existe en el SRI') ||
                    error.message.includes('SECUENCIAL REGISTRADO');

                if (isDuplicateSequentialError && attempts < SRI_MAX_SEND_ATTEMPTS) {
                    logger.info(`[GenerateCreditNote] 🔄 Duplicate sequential detected. Requesting new sequential and retrying...`);

                    // Get new sequential from database
                    const newSequential = await this.configRepository.getNextCreditNoteSequential();
                    currentSequential = newSequential.toString().padStart(9, '0');
                    logger.info(`[GenerateCreditNote] ✅ New sequential obtained: ${currentSequential}`);

                    // Continue to next attempt with new sequential
                    continue;
                } else {
                    // Not a duplicate error OR we've exhausted attempts - propagate error
                    if (attempts >= SRI_MAX_SEND_ATTEMPTS) {
                        logger.error('[GenerateCreditNote] ❌ Max retry attempts reached. Unable to send credit note.');
                        // FIX I-06: Update draft with ERROR status so user can retry later
                        await this.creditNoteRepository.upsert({
                            id: draftCreditNote.id,
                            sriStatus: 'ERROR',
                            sriMessage: `Falló después de ${SRI_MAX_SEND_ATTEMPTS} intentos: ${error.message}`
                        });
                        throw new Error(`Failed to send credit note after ${SRI_MAX_SEND_ATTEMPTS} attempts. Last error: ${error.message}`);
                    }
                    // FIX I-06: Update draft with ERROR status on other errors
                    await this.creditNoteRepository.upsert({
                        id: draftCreditNote.id,
                        sriStatus: 'ERROR',
                        sriMessage: error.message || 'Error desconocido'
                    });
                    throw error;
                }
            }
        }

        // Ensure we got a result (should always be true if we reach here, but safety check)
        if (!result) {
            throw new Error('Failed to send credit note to SRI - no result obtained');
        }

        // 8. Handle Response & Authorization
        const responseString = JSON.stringify(result);
        const isAlreadyRegistered = result.estado === 'DEVUELTA' &&
            (responseString.includes('CLAVE ACCESO REGISTRADA') || responseString.includes('EN PROCESAMIENTO'));

        let authResult = null;
        if (result.estado === 'RECIBIDA' || isAlreadyRegistered) {
            if (!isAlreadyRegistered) {
                logger.info('[GenerateCreditNote] Waiting 3 seconds before authorization...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            logger.info('[GenerateCreditNote] Requesting authorization...');
            authResult = await this.sriService.authorizeCreditNote(creditNote.info.claveAcceso!, isProd);

            // 9. Update Draft Credit Note with SRI response (FIX I-06: use draft ID to update, not create new)
            await this.creditNoteRepository.upsert({
                id: draftCreditNote.id, // FIX I-06: Use draft ID to update existing record
                accessKey: creditNote.info.claveAcceso,
                documentNumber: `${creditNote.info.estab}-${creditNote.info.ptoEmi}-${creditNote.info.secuencial}`,
                sriStatus: authResult.estado || result.estado,
                authorizationDate: authResult.fechaAutorizacion,
                sriMessage: (authResult.mensajes || result.mensajes || []).join(' '),
                retryCount: 1, // First attempt
                lastRetryDate: this.billingService.getCurrentDateEcuador().split('/').reverse().join('-') // YYYY-MM-DD
            });

            // 9.1 Si el SRI NO autorizó la NC → guardar en errorLog acumulativo
            const cnFinalStatus = authResult.estado || result.estado;
            const cnFinalMessage = (authResult.mensajes || result.mensajes || []).join(' ');
            if (cnFinalStatus !== 'AUTORIZADO' && cnFinalMessage) {
                // FIX I-06: Use draft ID directly instead of searching
                await (this.creditNoteRepository as any).pushErrorLog(draftCreditNote.id, {
                        timestamp: new Date().toISOString(),
                        sriStatus: cnFinalStatus || 'DESCONOCIDO',
                        message: cnFinalMessage,
                        attempt: 1
                    });
                }
            }

            logger.info('[GenerateCreditNote] Credit note persisted successfully');

            // Auto-learn/Update customer data
            await this.billingService.autoLearnCustomer({
                identification: creditNote.info.identificacionComprador,
                name: creditNote.info.razonSocialComprador,
                email: creditNote.info.emailComprador,
                address: originalBill.customerAddress,
                phone: originalBill.customerPhone
            }, now);

            // 10.1. Mark the original bill as cancelled (only if credit note was authorized)
            if (authResult && authResult.estado === 'AUTORIZADO') {
                await this.billRepository.upsert({
                    id: billId,
                    hasCreditNote: true,
                    sriStatus: 'CANCELLED'
                } as any);
                logger.info('[GenerateCreditNote] Original bill marked as CANCELLED');
            } else {
                logger.info('[GenerateCreditNote] Credit note not authorized, bill status unchanged');
            }

            // 10.2. Send Email (optional - only for authorized and valid emails)
            const isValidEmail = originalBill.customerEmail &&
                !originalBill.customerEmail.includes('consumidor@final') &&
                !originalBill.customerEmail.includes('noemail') &&
                originalBill.customerEmail.includes('@') &&
                originalBill.customerEmail.includes('.');

            let emailStatus: { sent: boolean; skipped: boolean; error?: string; skipReason?: string } = {
                sent: false,
                skipped: false
            };

            if (authResult && authResult.estado === 'AUTORIZADO' && isValidEmail) {
                logger.info(`[GenerateCreditNote] Sending email to ${originalBill.customerEmail}`);
                if (authResult.fechaAutorizacion) creditNote.authorizationDate = authResult.fechaAutorizacion;

                // Generate PDF for Credit Note
                const pdfBuffer = await this.pdfService.generateCreditNotePDF(creditNote);

                // Send Email with PDF and Signed XML
                const emailResult = await this.emailService.sendCreditNoteEmail(
                    originalBill.customerEmail!,
                    creditNote,
                    pdfBuffer,
                    signedXml
                );

                emailStatus.sent = emailResult.success;
                if (!emailResult.success) {
                    emailStatus.error = emailResult.error;
                    logger.warn(`[GenerateCreditNote] Email failed: ${emailResult.error}`);
                } else {
                    logger.info(`[GenerateCreditNote] Credit note email sent successfully. MessageId: ${emailResult.messageId}`);
                }
            } else {
                emailStatus.skipped = true;
                emailStatus.skipReason = !isValidEmail ? 'Email inválido' : 'Nota de crédito no autorizada';
                logger.info('[GenerateCreditNote] Skipping email - Conditions not met (Not Authorized or Invalid Email)');
            }

            return {
                success: true,
                creditNoteId: creditNote.info.secuencial,
                accessKey: creditNote.info.claveAcceso,
                sriResponse: result,
                authorization: authResult,
                emailStatus
            };
        }

}
