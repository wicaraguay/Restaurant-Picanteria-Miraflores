
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
        // 0. Fetch Bill from DB to ensure it exists and get details for potential resend
        const billInDb = await this.billRepository.findByAccessKey(accessKey);

        if (!billInDb) {
            console.warn(`[CheckInvoiceStatus] Bill with Access Key ${accessKey} not found in DB.`);
            return { success: false, error: 'Factura no encontrada en base de datos local.' };
        }

        // 1. Authorize with SRI (Polling for Resilience)
        let authResult;
        let attempts = 0;
        const maxAttempts = 10;

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
                    const details = fullBill.items.map((item: any, index: number) => {
                        // Reverse calculation to get unit price and tax base
                        // Stored: price (unit price?), total (row total)

                        // CRITICAL: Rounding to 2 decimals for SRI validation
                        const rawTotalSinImpuesto = item.price * item.quantity;
                        const totalSinImpuesto = parseFloat(rawTotalSinImpuesto.toFixed(2));
                        const taxValue = parseFloat((totalSinImpuesto * 0.15).toFixed(2)); // Default 15%

                        return {
                            codigoPrincipal: item.id || `ITEM-${index + 1}`,
                            descripcion: item.name,
                            cantidad: item.quantity,
                            precioUnitario: item.price, // Stored as unit price (up to 6 decimals ok)
                            descuento: 0,
                            precioTotalSinImpuesto: totalSinImpuesto,
                            impuestos: [{
                                codigo: '2',
                                codigoPorcentaje: '4', // Default 15% (TODO: Store tax code in DB)
                                tarifa: 15,
                                baseImponible: totalSinImpuesto,
                                valor: taxValue
                            }]
                        };
                    });

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
                            fechaEmision: ((dateStr) => {
                                // CRITICAL FIX: When RE-SENDING, we must use the CURRENT DATE (Today)
                                // If we use the old date, SRI rejects with "Transmisión NO en tiempo real"
                                const now = new Date();
                                const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' };
                                const parts = new Intl.DateTimeFormat('es-EC', options).formatToParts(now);
                                const d = parts.find(p => p.type === 'day')?.value;
                                const m = parts.find(p => p.type === 'month')?.value;
                                const y = parts.find(p => p.type === 'year')?.value;
                                return `${d}/${m}/${y}`;
                            })(fullBill.date),
                            obligadoContabilidad: info.obligadoContabilidad ? 'SI' : 'NO',
                            tipoIdentificacionComprador: this.getIdentificacionType(fullBill.customerIdentification),
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
                    // CRITICAL: Always generate a NEW Access Key when resending to avoid "En Procesamiento" locks or "Already Processed" errors with old/bad XML.
                    // This preserves the Secuencial (Invoice #) but gives a fresh Technical Key.
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
                        if (isProcessing) {
                            console.log('⚠️ Status is PROCESAMIENTO (DEVUELTA). Treating as RECIBIDA and polling for Authorization...');
                        } else {
                            console.log('[CheckInvoiceStatus] Resend Successful (RECIBIDA). Checking Authorization again...');
                        }

                        // Check Authorization logic...
                        // Check Authorization logic...
                        let newAuthResult;
                        let retryAttempts = 0;
                        const maxRetries = 20; // Increased to 20 (60s) to handle 'En Proceso' delays

                        console.log(`[CheckInvoiceStatus] Polling for Authorization (Max ${maxRetries} attempts)...`);

                        while (retryAttempts < maxRetries) {
                            retryAttempts++;
                            await new Promise(r => setTimeout(r, 3000));

                            // Log progress
                            if (retryAttempts % 5 === 0) console.log(`[CheckInvoiceStatus] Authorization polling attempt ${retryAttempts}/${maxRetries}...`);

                            newAuthResult = await this.sriService.authorizeInvoice(fullBill.accessKey!, isProd);
                            if (newAuthResult && newAuthResult.estado === 'AUTORIZADO') break;
                            if (newAuthResult && newAuthResult.estado === 'NO AUTORIZADO') break;
                        }

                        // If we got a result (even denied), return it so UI updates
                        if (newAuthResult) {
                            if (newAuthResult.estado === 'AUTORIZADO') {
                                return await this.handleSuccess(fullBill, newAuthResult, isProd);
                            }
                            // If NO AUTORIZADO/OTHERS after retry, return it
                            authResult = newAuthResult;
                        }
                    } else if (receptionResult.estado === 'DEVUELTA') {
                        console.log('[CheckInvoiceStatus] Resend Failed:', receptionResult.estado);

                        // Check for SEQUENCE REGISTERED Error explicitly
                        // responseStr is already defined above
                        if (responseStr.includes('ERROR SECUENCIAL REGISTRADO')) {
                            console.log('⚠️ Sequence Registered Error detected in CheckInvoiceStatus. Auto-healing...');

                            // AUTO-HEAL: Increment Sequence and Retry locally
                            const nextSequential = await this.configRepository.getNextSequential();
                            const newSecuencial = nextSequential.toString().padStart(9, '0');
                            console.log(`[CheckInvoiceStatus] Retrying with NEW Sequence: ${invoiceToResend.info.secuencial} -> ${newSecuencial}`);

                            // Update Invoice Object
                            invoiceToResend.info.secuencial = newSecuencial;

                            // Update Document Number in DB so we don't prefer old one
                            const [estab, ptoEmi, oldSeq] = fullBill.documentNumber.split('-');
                            (fullBill as any).documentNumber = `${estab}-${ptoEmi}-${newSecuencial}`;

                            // Regenerate XML
                            const newXml = this.sriService.generateInvoiceXML(invoiceToResend); // key will be generated inside or passed undefined
                            const newSignedXml = await this.sriService.signXML(newXml);

                            // Extract correct access key from XML or object (SRIService updates object?)
                            // SRIService.generateInvoiceXML usually updates info.claveAcceso or returns it.
                            // We need the NEW access key generated.
                            // Actually, SRIService.generateInvoiceXML calculates key if not present or passed.
                            // Let's assume we pass undefined key to force regeneration.
                            const finalXmlKey = invoiceToResend.info.claveAcceso;

                            // Resend
                            const retryResult = await this.sriService.sendToSRI(newSignedXml, isProd);

                            if (retryResult.estado === 'RECIBIDA') {
                                console.log('✅ Auto-heal successful. Invoice Received. Authorizing...');

                                // Update DB with FINAL Key and Document Number
                                await this.billRepository.upsert({
                                    id: fullBill.id,
                                    accessKey: finalXmlKey,
                                    documentNumber: fullBill.documentNumber,
                                    sriStatus: 'PENDING_RETRY'
                                });

                                // Authorize NEW Access Key
                                const retryAuth = await this.sriService.authorizeInvoice(finalXmlKey, isProd);
                                if (retryAuth && retryAuth.estado === 'AUTORIZADO') {
                                    return await this.handleSuccess({ ...fullBill, accessKey: finalXmlKey }, retryAuth, isProd);
                                } else {
                                    authResult = retryAuth;
                                }
                            } else {
                                // If still fails
                                console.log('❌ Auto-heal failed.', retryResult);
                                authResult = { ...authResult, estado: retryResult.estado, mensajes: retryResult.mensajes };
                            }

                        } else if (responseStr.includes('FECHA EMISIÓN EXTEMPORÁNEA')) {
                            console.error('⚠️ DATE ERROR DETECTED: The invoice date is rejected by SRI.');
                            console.error('⚠️ LIKELY CAUSE: Your Computer/Server Date (Currently 2026?) is ahead of SRI Server Date.');
                            console.error('⚠️ SOLUTION: Please check your System Clock and set it to the correct current date.');
                            authResult = {
                                ...authResult,
                                estado: 'ERROR_FECHA',
                                mensajes: ['Error de Fecha: Verifique la hora/fecha de su computador. SRI rechazó por fecha futura/pasada.']
                            };
                        } else {
                            // Other DEVUELTA error
                            authResult = { ...authResult, estado: receptionResult.estado, mensajes: receptionResult.mensajes };
                        }
                    } else {
                        // Other error
                        console.log('[CheckInvoiceStatus] Resend Failed:', receptionResult.estado);
                        authResult = { ...authResult, estado: receptionResult.estado, mensajes: receptionResult.mensajes };
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

    private getIdentificacionType(id: string): "04" | "05" | "06" | "07" {
        if (!id) return '06';
        if (id === '9999999999999') return '07';
        if (id.length === 13) return '04';
        if (id.length === 10) return '05';
        return '06';
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

                // Reconstruct Data for PDF/XML Generation
                const config = await this.configRepository.get();
                const info = config || {} as any;
                const [estab, ptoEmi, secuencial] = bill.documentNumber.split('-');

                const details = bill.items.map((item: any, index: number) => {
                    const rawTotalSinImpuesto = item.price * item.quantity;
                    const totalSinImpuesto = parseFloat(rawTotalSinImpuesto.toFixed(2));
                    const taxValue = parseFloat((totalSinImpuesto * 0.15).toFixed(2));

                    return {
                        codigoPrincipal: item.id || `ITEM-${index + 1}`,
                        descripcion: item.name,
                        cantidad: item.quantity,
                        precioUnitario: item.price,
                        descuento: 0,
                        precioTotalSinImpuesto: totalSinImpuesto,
                        impuestos: [{
                            codigo: '2',
                            codigoPorcentaje: '4',
                            tarifa: 15,
                            baseImponible: totalSinImpuesto,
                            valor: taxValue
                        }]
                    };
                });

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
                        fechaEmision: bill.date instanceof Date ? bill.date.toLocaleDateString('es-EC').split('T')[0] : new Date(bill.date).toLocaleDateString('es-EC').split('T')[0], // Fallback formatting
                        obligadoContabilidad: info.obligadoContabilidad ? 'SI' : 'NO',
                        tipoIdentificacionComprador: this.getIdentificacionType(bill.customerIdentification),
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
