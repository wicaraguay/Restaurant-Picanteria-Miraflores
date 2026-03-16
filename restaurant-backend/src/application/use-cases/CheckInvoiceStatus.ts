
import { SRIService } from '../../infrastructure/services/SRIService';
import { PDFService } from '../../infrastructure/services/PDFService';
import { IEmailService } from '../interfaces/IEmailService';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';

import { BillingService } from '../services/BillingService';

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
            console.warn(`[CheckInvoiceStatus] Bill with Access Key ${accessKey} not found in DB.`);
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
            console.log(`[CheckInvoiceStatus] Invoice Status: ${authResult.estado}. Attempting RECOVERY/RESEND...`);

            // Fetch full bill data to reconstruct XML
            const fullBill = await this.billRepository.findById(billInDb.id);

            if (fullBill) {
                try {
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
                            fechaEmision: this.billingService.getCurrentDateEcuador(),
                            obligadoContabilidad: info.obligadoContabilidad ? 'SI' : 'NO',
                            tipoIdentificacionComprador: this.billingService.getIdentificacionType(fullBill.customerIdentification),
                            razonSocialComprador: fullBill.customerName,
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

                    // Generate XML using EXISTING Access Key
                    const useNewKey = true;
                    const xml = this.sriService.generateInvoiceXML(invoiceToResend, useNewKey ? undefined : fullBill.accessKey);
                    const signedXml = await this.sriService.signXML(xml);

                    // Update DB with NEW Key immediately
                    console.log(`[CheckInvoiceStatus] Generated NEW Access Key for recovery: ${invoiceToResend.info.claveAcceso}`);
                    await this.billRepository.upsert({
                        id: fullBill.id,
                        accessKey: invoiceToResend.info.claveAcceso,
                        date: new Date().toISOString(), // CRITICAL: Sync DB date with new Invoice Date
                        sriStatus: 'PENDING_RETRY'
                    });
                    // Update local ref
                    (fullBill as any).accessKey = invoiceToResend.info.claveAcceso;

                    // Resend to Reception
                    console.log('[CheckInvoiceStatus] Resending to Reception...');
                    const receptionResult = await this.sriService.sendToSRI(signedXml, isProd);

                    const responseStr = JSON.stringify(receptionResult);
                    const isProcessing = receptionResult.estado === 'DEVUELTA' && responseStr.includes('CLAVE DE ACCESO EN PROCESAMIENTO');

                    if (receptionResult.estado === 'RECIBIDA' || isProcessing) {
                        const newAuthResult = await this.sriService.waitForAuthorization(fullBill.accessKey!, isProd);
                        if (newAuthResult && newAuthResult.estado === 'AUTORIZADO') {
                            return await this.handleSuccess(fullBill, newAuthResult, isProd);
                        }
                    } else if (receptionResult.estado === 'DEVUELTA' && responseStr.includes('ERROR SECUENCIAL REGISTRADO')) {
                        console.log('⚠️ Sequence Registered Error detected. Auto-healing...');
                        const nextSequential = await this.configRepository.getNextSequential();
                        const newSecuencial = nextSequential.toString().padStart(9, '0');
                        invoiceToResend.info.secuencial = newSecuencial;

                        const newXml = this.sriService.generateInvoiceXML(invoiceToResend);
                        const newSignedXml = await this.sriService.signXML(newXml);
                        const finalXmlKey = invoiceToResend.info.claveAcceso;

                        const retryResult = await this.sriService.sendToSRI(newSignedXml, isProd);
                        if (retryResult.estado === 'RECIBIDA') {
                            await this.billRepository.upsert({
                                id: fullBill.id,
                                accessKey: finalXmlKey,
                                documentNumber: `${estab}-${ptoEmi}-${newSecuencial}`,
                                sriStatus: 'PENDING_RETRY'
                            });
                            const retryAuth = await this.sriService.waitForAuthorization(finalXmlKey!, isProd);
                            if (retryAuth?.estado === 'AUTORIZADO') {
                                return await this.handleSuccess({ ...fullBill, accessKey: finalXmlKey }, retryAuth, isProd);
                            }
                        }
                    }

                } catch (resendError) {
                    console.error('[CheckInvoiceStatus] Error during automatic resend:', resendError);
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
            environment: isProd ? '2' : '1'
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
                console.log(`[CheckInvoiceStatus] Preparing to send email to ${clientEmail}...`);

                const config = await this.configRepository.get();
                const info = config || {} as any;
                
                console.log('[CheckInvoiceStatus] Config from DB:', !!config);
                console.log('[CheckInvoiceStatus] Logo field:', info.logo ? 'EXISTS' : 'MISSING', 'Fiscal Logo field:', info.fiscalLogo ? 'EXISTS' : 'MISSING');
                if (info.logo) console.log('[CheckInvoiceStatus] Logo starts with:', info.logo.substring(0, 30));
                console.log('[CheckInvoiceStatus] Final logoUrl will be:', this.billingService.getLogoUrl(info));
                
                const [estab, ptoEmi, secuencial] = bill.documentNumber.split('-');

                const details = this.billingService.calculateDetails(bill.items);

                const invoiceObj: any = {
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
                        razonSocialComprador: bill.customerName,
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
                        tasaIva: (info.billing?.taxRate || 15).toString(),
                        authorizationDate: authResult.fechaAutorizacion // Crucial for PDF
                    },
                    detalles: details
                };

                // Quick Date Fix for XML Generation check
                if (invoiceObj.info.fechaEmision.includes('-')) {
                    // Ensure DD/MM/YYYY
                    const d = new Date(bill.date);
                    invoiceObj.info.fechaEmision = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                }

                // Regenerate XML & Sign (Required for email attachment)
                const xml = this.sriService.generateInvoiceXML(invoiceObj);
                const signedXml = await this.sriService.signXML(xml);

                // Generate PDF
                const pdfBuffer = await this.pdfService.generateInvoicePDF(invoiceObj);

                // Send
                await this.emailService.sendInvoiceEmail(clientEmail, invoiceObj, pdfBuffer, signedXml);
                console.log(`[CheckInvoiceStatus] Email sent successfully to ${clientEmail}`);

            } catch (emailError) {
                console.error('[CheckInvoiceStatus] Failed to send email during recovery:', emailError);
                // Non-blocking error
            }
        } else {
            console.log('[CheckInvoiceStatus] Skipping email (Consumidor Final or Invalid Email).');
        }

        return { success: true, authorization: authResult };

    }
}
