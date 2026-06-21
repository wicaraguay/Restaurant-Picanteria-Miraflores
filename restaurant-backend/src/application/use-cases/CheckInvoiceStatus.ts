
import { SRIService } from '../../infrastructure/services/SRIService';
import { PDFService } from '../../infrastructure/services/PDFService';
import { IEmailService } from '../interfaces/IEmailService';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';

import { BillingService } from '../services/BillingService';
import { logger, maskAccessKey } from '../../infrastructure/utils/Logger';

export class CheckInvoiceStatus {
    constructor(
        private configRepository: IRestaurantConfigRepository,
        private billRepository: IBillRepository,
        private orderRepository: IOrderRepository,
        private sriService: SRIService,
        private pdfService: PDFService,
        private emailService: IEmailService,
        private billingService: BillingService
    ) { }

    async execute(accessKey: string, isProd: boolean): Promise<any> {
        // 0. Fetch Bill from DB to ensure it exists and get details for potential resend
        const billInDb = await this.billRepository.findByAccessKey(accessKey);

        if (!billInDb) {
            // FIX S-02: Mask access key in logs
            logger.warn(`[CheckInvoiceStatus] Bill with Access Key ${maskAccessKey(accessKey)} not found in DB.`);
            return { success: false, error: 'Factura no encontrada en base de datos local.' };
        }

        // 1. Authorize with SRI (Using Centralized Polling)
        const authResult = await this.sriService.waitForAuthorization(accessKey, isProd);

        if (authResult.estado === 'AUTORIZADO') {
            return await this.handleSuccess(billInDb, authResult, isProd);
        }

        // 3. Handle 'NOT FOUND' or persistent 'UNKNOWN' -> RESEND XML
        // If SRI returns 0 authorizations after retries, it means the invoice was never received (lost in network)
        // OR if it is 'NO AUTORIZADO', it means it failed business rules (like bad ID), so we must RESEND CORRECTED XML with NEW KEY.
        const isNotFound = authResult.rawResponse && authResult.rawResponse.includes('<numeroComprobantes>0</numeroComprobantes>');
        const isRejected = authResult.estado === 'NO AUTORIZADO';

        // If it's Not Found (0 auths), Unknown, Rejected, OR 'EN PROCESO' (which usually means 0 auths found),
        // We must Attempt Re-send/Recovery to be sure.
        if (isNotFound || authResult.estado === 'UNKNOWN' || isRejected || authResult.estado === 'EN PROCESO') {
            logger.info(`[CheckInvoiceStatus] Invoice Status: ${authResult.estado}. Attempting RECOVERY/RESEND...`);

            // Fetch full bill data to reconstruct XML
            const fullBill = await this.billRepository.findById(billInDb.id);

            if (fullBill) {
                try {
                    // IMPORTANT FIX I-02: Validate Consumidor Final $50 limit before resend
                    // SRI 2026 regulation (NAC-DGERCGC25-00000017) prohibits CF invoices >= $50
                    try {
                        this.billingService.validateConsumidorFinal(fullBill.customerIdentification, fullBill.total);
                    } catch (validationError: any) {
                        logger.warn(`[CheckInvoiceStatus] Validation failed: ${validationError.message}`);
                        return {
                            success: false,
                            error: validationError.message,
                            authorization: authResult
                        };
                    }

                    const todayEcuador = this.billingService.getCurrentDateEcuador();
                    const todayISO = todayEcuador.split('/').reverse().join('-'); // YYYY-MM-DD
                    const lastRetryDate = fullBill.lastRetryDate || '';
                    
                    let newRetryCount = (fullBill.retryCount || 0);
                    let shouldGenerateNewKey = false;
                    
                    if (lastRetryDate !== todayISO) {
                        // NEW DAY: Reset everything and force NEW key (because date in key must match emission date)
                        logger.info(`[CheckInvoiceStatus] New day detected (${lastRetryDate} -> ${todayISO}). Resetting retries and forcing NEW key.`);
                        newRetryCount = 1; // First attempt of the new day
                        shouldGenerateNewKey = true;
                    } else {
                        // SAME DAY: Increment and check limit
                        newRetryCount++;
                        logger.debug(`[CheckInvoiceStatus] Incrementing daily retryCount for ${fullBill.documentNumber}: ${fullBill.retryCount} -> ${newRetryCount}`);

                        if (newRetryCount > 3) {
                            logger.warn(`[CheckInvoiceStatus] Daily limit reached (3 attempts) for today (${todayISO}). Stopping.`);
                            return { 
                                success: false, 
                                error: 'Límite de 3 intentos diarios alcanzado para esta factura (1 emisión + 2 reintentos). Por favor intente mañana con una nueva clave automática.',
                                authorization: authResult 
                            };
                        }
                        
                        // If it's the 2nd attempt of the same day, we also use a NEW key if the 1st one failed?
                        // User said: "despues de los 2 intentos son diarios... la unica manera es generando con nueva clave"
                        // Usually 1st fail -> Retry same key. 2nd fail -> Stop. 
                        // But if 1st attempt ever failed, maybe Key A is "tainted" in SRI.
                        // Let's stick to: 2 attempts with SAME key per day.
                        shouldGenerateNewKey = false; 
                    }

                    const nextRetryCount = newRetryCount;

                    // Reconstruct Invoice Object
                    const config = await this.configRepository.get();
                    const info = config || {} as any;
                    const [estab, ptoEmi, secuencial] = fullBill.documentNumber.split('-');

                    // Reconstruct Details (Logic mirrors GenerateInvoice)
                    const details = this.billingService.calculateDetails(fullBill.items);

                    const invoiceToResend: any = {
                        info: {
                            ambiente: fullBill.environment || '1',
                            tipoEmision: '1',
                            razonSocial: info.businessName || process.env.BUSINESS_NAME,
                            nombreComercial: info.name || process.env.COMMERCIAL_NAME,
                            ruc: info.ruc,
                            claveAcceso: fullBill.accessKey, // Initial placeholder
                            codDoc: '01',
                            estab: estab,
                            ptoEmi: ptoEmi,
                            secuencial: secuencial,
                            dirMatriz: info.address,
                            dirEstablecimiento: info.address,
                            // CRITICAL: Use original invoice date, NOT current date
                            // SRI requires emission date to match the original transaction date
                            fechaEmision: fullBill.date ? this.billingService.formatDateToSRI(fullBill.date) : this.billingService.getCurrentDateEcuador(),
                            obligadoContabilidad: info.obligadoContabilidad ? 'SI' : 'NO',
                            tipoIdentificacionComprador: this.billingService.getIdentificacionType(fullBill.customerIdentification),
                            razonSocialComprador: fullBill.customerIdentification === '9999999999999' ? 'CONSUMIDOR FINAL' : fullBill.customerName,
                            identificacionComprador: fullBill.customerIdentification,
                            direccionComprador: fullBill.customerAddress,
                            totalSinImpuestos: fullBill.subtotal,
                            totalDescuento: 0,
                            totalImpuestos: [], // SRIService generates XML based on details
                            importeTotal: fullBill.total,
                            moneda: 'DOLAR',
                            formaPago: '01',
                            emailComprador: fullBill.customerEmail
                        },
                        detalles: details
                    };

                    // Generate XML: 
                    // If shouldGenerateNewKey is true, we pass undefined to generate a fresh random key.
                    // Otherwise we pass the existing key to maintain it for the retry.
                    const xml = this.sriService.generateInvoiceXML(invoiceToResend, shouldGenerateNewKey ? undefined : fullBill.accessKey);
                    const signedXml = await this.sriService.signXML(xml, config || undefined);
                    const finalKey = invoiceToResend.info.claveAcceso;

                    // Update DB with results and NEW/SAME Key + Retry Count
                    logger.info(`[CheckInvoiceStatus] ${shouldGenerateNewKey ? 'NEW' : 'SAME'} Access Key for attempt: ${finalKey}`);
                    
                    await this.billRepository.upsert({
                        id: fullBill.id,
                        accessKey: finalKey,
                        date: new Date().toISOString(), // CRITICAL: Sync DB date with new Invoice Date if key changed
                        sriStatus: 'PENDING_RETRY',
                        retryCount: nextRetryCount,
                        lastRetryDate: todayISO,
                        sriMessage: `Intento ${newRetryCount}: ${(authResult?.mensajes || []).join(' ')}`
                    });
                    
                    // Update local ref for following operations
                    (fullBill as any).accessKey = finalKey;

                    // Resend to Reception
                    logger.info(`[CheckInvoiceStatus] Resending to Reception (Attempt ${newRetryCount})...`);
                    const receptionResult = await this.sriService.sendToSRI(signedXml, isProd);

                    const responseStr = JSON.stringify(receptionResult);
                    const isProcessing = receptionResult.estado === 'DEVUELTA' && responseStr.includes('CLAVE DE ACCESO EN PROCESAMIENTO');

                    if (receptionResult.estado === 'RECIBIDA' || isProcessing) {
                        const newAuthResult = await this.sriService.waitForAuthorization(finalKey!, isProd);
                        if (newAuthResult && newAuthResult.estado === 'AUTORIZADO') {
                            return await this.handleSuccess(fullBill, newAuthResult, isProd);
                        }
                        // FIX I-03: Log failed authorization after resend
                        if (newAuthResult && newAuthResult.estado !== 'AUTORIZADO') {
                            const errorMsg = newAuthResult.mensajes?.join(' ') || 'No autorizado tras reenvío';
                            await (this.billRepository as any).pushErrorLog(fullBill.id, {
                                timestamp: new Date().toISOString(),
                                sriStatus: newAuthResult.estado || 'DESCONOCIDO',
                                message: errorMsg,
                                attempt: newRetryCount
                            });
                        }
                    } else if (receptionResult.estado === 'DEVUELTA' && responseStr.includes('ERROR SECUENCIAL REGISTRADO')) {
                        logger.warn('⚠️ Sequence Registered Error detected. Auto-healing...');
                        const nextSequential = await this.configRepository.getNextSequential();
                        const newSecuencial = nextSequential.toString().padStart(9, '0');
                        invoiceToResend.info.secuencial = newSecuencial;

                        const newXml = this.sriService.generateInvoiceXML(invoiceToResend);
                        const newSignedXml = await this.sriService.signXML(newXml, config || undefined);
                        const finalXmlKey = invoiceToResend.info.claveAcceso;

                        const retryResult = await this.sriService.sendToSRI(newSignedXml, isProd);
                        if (retryResult.estado === 'RECIBIDA') {
                            await this.billRepository.upsert({
                                id: fullBill.id,
                                accessKey: finalXmlKey,
                                documentNumber: `${estab}-${ptoEmi}-${newSecuencial}`,
                                sriStatus: 'PENDING_RETRY',
                                retryCount: 0, // Reset since we are using a brand new sequence
                                sriMessage: (retryResult?.mensajes || []).join(' ')
                            });
                            const retryAuth = await this.sriService.waitForAuthorization(finalXmlKey!, isProd);
                            if (retryAuth?.estado === 'AUTORIZADO') {
                                return await this.handleSuccess({ ...fullBill, accessKey: finalXmlKey }, retryAuth, isProd);
                            }
                            // FIX I-03: Log failed auto-heal authorization
                            if (retryAuth && retryAuth.estado !== 'AUTORIZADO') {
                                await (this.billRepository as any).pushErrorLog(fullBill.id, {
                                    timestamp: new Date().toISOString(),
                                    sriStatus: retryAuth.estado || 'DESCONOCIDO',
                                    message: retryAuth.mensajes?.join(' ') || 'Auto-heal: No autorizado tras reenvío',
                                    attempt: 1 // Fresh sequence = attempt 1
                                });
                            }
                        } else {
                            // FIX I-03: Log auto-heal reception failure
                            await (this.billRepository as any).pushErrorLog(fullBill.id, {
                                timestamp: new Date().toISOString(),
                                sriStatus: retryResult.estado || 'DEVUELTA',
                                message: `Auto-heal fallido: ${retryResult.mensajes?.join(' ') || 'Error en recepción'}`,
                                attempt: newRetryCount
                            });
                        }
                    } else {
                        // FIX I-03: Log reception failure (not auto-heal case)
                        await (this.billRepository as any).pushErrorLog(fullBill.id, {
                            timestamp: new Date().toISOString(),
                            sriStatus: receptionResult.estado || 'DEVUELTA',
                            message: receptionResult.mensajes?.join(' ') || 'Error en recepción SRI',
                            attempt: newRetryCount
                        });
                    }

                } catch (resendError) {
                    logger.error('[CheckInvoiceStatus] Error during automatic resend:', resendError);
                    // Fallback to returning original auth error
                }
            }
        }

        return {
            success: true,
            authorization: authResult
        };
    }


    private async handleSuccess(bill: any, authResult: any, isProd: boolean) {
        // 2. Update Bill in DB
        // CRITICAL: Must pass ID to ensure we update existing record and don't create "ghosts"
        const updatedBill = await this.billRepository.upsert({
            id: bill.id,
            accessKey: bill.accessKey,
            sriStatus: 'AUTORIZADO',
            authorizationDate: authResult.fechaAutorizacion,
            environment: isProd ? '2' : '1',
            sriMessage: ''
        });

        // 3. Send Email
        // Validate Email conditions before doing heavy lifting
        const isConsumidorFinal = bill.customerIdentification === '9999999999999';
        const clientEmail = bill.customerEmail || '';
        const isValidEmail = clientEmail &&
            !clientEmail.includes('consumidor@final') &&
            !clientEmail.includes('noemail') &&
            clientEmail.includes('@');

        if (!isConsumidorFinal && isValidEmail) {
            try {
                logger.info(`[CheckInvoiceStatus] Preparing to send email to ${clientEmail}...`);

                const config = await this.configRepository.get();
                const info = config || {} as any;

                logger.debug('[CheckInvoiceStatus] Config from DB:', !!config);
                logger.debug(`[CheckInvoiceStatus] Logo field: ${info.logo ? 'EXISTS' : 'MISSING'}, Fiscal Logo field: ${info.fiscalLogo ? 'EXISTS' : 'MISSING'}`);
                if (info.logo) logger.debug(`[CheckInvoiceStatus] Logo starts with: ${info.logo.substring(0, 30)}`);
                logger.debug('[CheckInvoiceStatus] Final logoUrl will be:', this.billingService.getLogoUrl(info));

                const [estab, ptoEmi, secuencial] = bill.documentNumber.split('-');

                const details = this.billingService.calculateDetails(bill.items);

                const invoiceObj: any = {
                    creationDate: new Date(bill.date),
                    info: {
                        ambiente: isProd ? '2' : '1',
                        tipoEmision: '1',
                        razonSocial: info.businessName || process.env.BUSINESS_NAME,
                        nombreComercial: info.name || process.env.COMMERCIAL_NAME,
                        ruc: info.ruc,
                        claveAcceso: bill.accessKey,
                        codDoc: '01',
                        estab: estab,
                        ptoEmi: ptoEmi,
                        secuencial: secuencial,
                        dirMatriz: info.address || process.env.DIR_MATRIZ,
                        dirEstablecimiento: info.address || process.env.DIR_ESTABLECIMIENTO,
                        fechaEmision: this.billingService.formatDateToSRI(bill.date),
                        obligadoContabilidad: info.obligadoContabilidad ? 'SI' : 'NO',
                        tipoIdentificacionComprador: this.billingService.getIdentificacionType(bill.customerIdentification),
                        razonSocialComprador: bill.customerIdentification === '9999999999999' ? 'CONSUMIDOR FINAL' : bill.customerName,
                        identificacionComprador: bill.customerIdentification,
                        direccionComprador: bill.customerAddress,
                        totalSinImpuestos: bill.subtotal,
                        totalDescuento: 0,
                        totalImpuestos: [],
                        importeTotal: bill.total,
                        moneda: 'DOLAR',
                        formaPago: '01',
                        emailComprador: clientEmail,
                        logoUrl: this.billingService.getLogoUrl(info),
                        emailMatriz: info.fiscalEmail || info.email || process.env.SMTP_FROM,
                        telefonoComprador: bill.customerPhone || 'S/N',
                        tasaIva: (info.billing?.taxRate || 15).toString()
                    },
                    authorizationDate: authResult.fechaAutorizacion,
                    detalles: details
                };

                // Quick Date Fix for XML Generation check
                if (invoiceObj.info.fechaEmision.includes('-')) {
                    // Ensure DD/MM/YYYY
                    const d = new Date(bill.date);
                    invoiceObj.info.fechaEmision = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                }

                // Regenerate XML & Sign (Required for email attachment)
                // CRITICAL: Pass the EXISTING authorized access key to avoid generating a new random one.
                // Without this, the PDF/XML in the email would have a different (unauthorized) access key.
                const xml = this.sriService.generateInvoiceXML(invoiceObj, bill.accessKey);
                const signedXml = await this.sriService.signXML(xml, config || undefined);

                // Generate PDF
                const pdfBuffer = await this.pdfService.generateInvoicePDF(invoiceObj);

                // Send
                const emailResult = await this.emailService.sendInvoiceEmail(clientEmail, invoiceObj, pdfBuffer, signedXml);
                if (emailResult.success) {
                    logger.info(`[CheckInvoiceStatus] Email sent successfully to ${clientEmail}. MessageId: ${emailResult.messageId}`);
                    return { success: true, authorization: authResult, invoiceNumber: bill.documentNumber, emailStatus: { sent: true, skipped: false } };
                } else {
                    logger.warn(`[CheckInvoiceStatus] Email failed: ${emailResult.error}`);
                    return { success: true, authorization: authResult, invoiceNumber: bill.documentNumber, emailStatus: { sent: false, skipped: false, error: emailResult.error } };
                }

            } catch (emailError: any) {
                logger.error('[CheckInvoiceStatus] Failed to send email during recovery:', emailError);
                return { success: true, authorization: authResult, invoiceNumber: bill.documentNumber, emailStatus: { sent: false, skipped: false, error: emailError.message } };
            }
        } else {
            logger.debug('[CheckInvoiceStatus] Skipping email (Consumidor Final or Invalid Email).');
        }

        return { success: true, authorization: authResult, invoiceNumber: bill.documentNumber, emailStatus: { sent: false, skipped: true, skipReason: 'Consumidor Final o email inválido' } };

    }
}
