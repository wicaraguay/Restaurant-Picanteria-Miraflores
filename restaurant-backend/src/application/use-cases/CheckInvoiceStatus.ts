
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
            return await this.handleSuccess(billInDb, authResult, isProd);
        }

        // 3. Handle 'NOT FOUND' or persistent 'UNKNOWN' -> RESEND XML
        // If SRI returns 0 authorizations after retries, it means the invoice was never received (lost in network)
        // OR if it is 'NO AUTORIZADO', it means it failed business rules (like bad ID), so we must RESEND CORRECTED XML with NEW KEY.
        const isNotFound = authResult.rawResponse && authResult.rawResponse.includes('<numeroComprobantes>0</numeroComprobantes>');
        const isRejected = authResult.estado === 'NO AUTORIZADO';

        if (isNotFound || authResult.estado === 'UNKNOWN' || isRejected) {
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
                            fechaEmision: fullBill.date.split('T')[0].split('-').reverse().join('/'), // YYYY-MM-DD -> DD/MM/YYYY
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
                        sriStatus: 'PENDING_RETRY'
                    });
                    // Update local ref
                    (fullBill as any).accessKey = invoiceToResend.info.claveAcceso;

                    // Resend to Reception
                    console.log('[CheckInvoiceStatus] Resending to Reception...');
                    const receptionResult = await this.sriService.sendToSRI(signedXml, isProd);

                    if (receptionResult.estado === 'RECIBIDA') {
                        console.log('[CheckInvoiceStatus] Resend Successful (RECIBIDA). Checking Authorization again...');

                        // Check Authorization logic...
                        let newAuthResult;
                        let retryAttempts = 0;
                        while (retryAttempts < 4) {
                            retryAttempts++;
                            await new Promise(r => setTimeout(r, 2000));
                            newAuthResult = await this.sriService.authorizeInvoice(fullBill.accessKey!, isProd);
                            if (newAuthResult.estado === 'AUTORIZADO') break;
                            if (newAuthResult.estado === 'NO AUTORIZADO') break;
                        }

                        // If we got a result (even denied), return it so UI updates
                        if (newAuthResult) {
                            if (newAuthResult.estado === 'AUTORIZADO') {
                                return await this.handleSuccess(fullBill, newAuthResult, isProd);
                            }
                            // If NO AUTORIZADO/OTHERS after retry, return it
                            authResult = newAuthResult;
                        }
                    } else {
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
        if (updatedBill && updatedBill.customerEmail) {
            const config = await this.configRepository.get();
            // Minimal reconstruction for PDF (Reusing logic or extracting to service would be better, but keeping inline for safety)
            // ... PDF Logic ...
            // For now, assuming PDF Service handles retrieval or we pass minimal data
            // We'll skip complex PDF reconstruction properly here to avoid duplication bugs, 
            // relying on the fact that if it's authorized, the user can download the PDF from frontend.
            // Or we can implement a simple email notification.
        }

        return { success: true, authorization: authResult };

    }
}
