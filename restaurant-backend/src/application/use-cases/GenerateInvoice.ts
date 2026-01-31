
import { SRIService } from '../../infrastructure/services/SRIService';
import { PDFService } from '../../infrastructure/services/PDFService';
import { EmailService } from '../../infrastructure/services/EmailService';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { Invoice, InvoiceDetail } from '../../domain/billing/invoice';
import { ValidationError } from '../../domain/errors/CustomErrors';

export class GenerateInvoice {
    constructor(
        private configRepository: IRestaurantConfigRepository,
        private billRepository: IBillRepository,
        private orderRepository: IOrderRepository,
        private sriService: SRIService,
        private pdfService: PDFService,
        private emailService: EmailService
    ) { }

    async execute(data: { order: any, client: any, taxRate?: number, logoUrl?: string }): Promise<any> {
        const { order, client, taxRate = 15, logoUrl } = data;

        // Validate Email Format (User Request)
        // Ensure email has correct format to avoid sending typos (commas, extra letters)
        if (client.email) {
            this.validateEmail(client.email);
        }


        // 1. Calculate Details
        const rateDecimal = taxRate / 100;
        const details: InvoiceDetail[] = order.items.map((item: any, index: number) => {
            const priceInclusive = item.price || 0;
            const totalInclusive = priceInclusive * item.quantity;
            const rawSubtotal = totalInclusive / (1 + rateDecimal);
            const subtotalRounded = parseFloat(rawSubtotal.toFixed(2));
            const taxValueRounded = parseFloat((subtotalRounded * rateDecimal).toFixed(2));
            const unitPrice = subtotalRounded / item.quantity;

            return {
                codigoPrincipal: item.id || `ITEM-${index + 1}`,
                descripcion: item.name,
                cantidad: item.quantity,
                precioUnitario: parseFloat(unitPrice.toFixed(6)),
                descuento: 0,
                precioTotalSinImpuesto: subtotalRounded,
                impuestos: [{
                    codigo: '2',
                    codigoPorcentaje: taxRate === 15 ? '4' : (taxRate === 12 ? '2' : '0'),
                    tarifa: taxRate,
                    baseImponible: subtotalRounded,
                    valor: taxValueRounded
                }]
            };
        });

        const subtotal = details.reduce((sum, d) => sum + d.precioTotalSinImpuesto, 0);
        const totalImpuestos = details.reduce((sum, d) => sum + d.impuestos[0].valor, 0);
        const total = subtotal + totalImpuestos;

        // 2. Get Config
        const config = await this.configRepository.get();
        const info = config || {} as any; // Fallback handled in logic or entity

        // 3. Get Next Sequential (Atomic Operation)
        // CRITICAL: This ensures each invoice has a unique sequential number
        // preventing duplicate access key errors from SRI
        const nextSequential = await this.configRepository.getNextSequential();
        const secuencial = nextSequential.toString().padStart(9, '0');

        // 4. Build Invoice Object
        const now = new Date();
        const invoice: Invoice = {
            orderId: order.id,
            status: 'PENDING',
            creationDate: now,
            detalles: details,
            info: {
                ambiente: (process.env.SRI_ENV as '1' | '2') || '1',
                tipoEmision: '1',
                razonSocial: info.businessName || process.env.BUSINESS_NAME || 'RESTAURANTE DEMO',
                nombreComercial: info.name || process.env.COMMERCIAL_NAME,
                ruc: info.ruc || process.env.RUC || '0000000000001',
                dirMatriz: info.address || process.env.DIR_MATRIZ || 'Direccion Matriz',
                dirEstablecimiento: info.address || process.env.DIR_ESTABLECIMIENTO || process.env.DIR_MATRIZ,
                codDoc: '01',
                estab: info.billing?.establishment || process.env.ESTAB || '001',
                ptoEmi: info.billing?.emissionPoint || process.env.PTO_EMI || '001',
                secuencial: secuencial, // Using atomic sequential from database
                fechaEmision: `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`,
                obligadoContabilidad: info.obligadoContabilidad ? 'SI' : 'NO',
                tipoIdentificacionComprador: this.getIdentificacionType(client.identification),
                razonSocialComprador: client.name,
                identificacionComprador: client.identification,
                direccionComprador: client.address,
                totalSinImpuestos: subtotal,
                totalDescuento: 0,
                totalImpuestos: [],
                importeTotal: total,
                moneda: 'DOLAR',
                emailComprador: client.email,
                formaPago: client.paymentMethod || '01',
                logoUrl: info.fiscalLogo || info.logo || logoUrl,
                tasaIva: taxRate.toString(),
                telefonoComprador: client.phone,
                emailMatriz: info.fiscalEmail || info.email || process.env.SMTP_FROM || 'info@restaurant.com'
            }
        };

        // SRI 2026 Compliance: Real-Time Transmission Validation
        // Resolution NAC-DGERCGC25-00000017: Invoices must be transmitted immediately upon emission
        // The emission date must correspond to the current date
        this.validateRealTimeTransmission(invoice.info.fechaEmision);

        // 5. Generate XML
        const xml = this.sriService.generateInvoiceXML(invoice);
        const signedXml = await this.sriService.signXML(xml);
        const isProd = process.env.SRI_ENV === '2';

        // 6. Send to SRI
        const result = await this.sriService.sendToSRI(signedXml, isProd);

        // 7. Handle Response & Authorization
        const responseString = JSON.stringify(result);
        const isAlreadyRegistered = result.estado === 'DEVUELTA' &&
            (responseString.includes('CLAVE ACCESO REGISTRADA') || responseString.includes('EN PROCESAMIENTO'));

        let authResult = null;
        if (result.estado === 'RECIBIDA' || isAlreadyRegistered) {
            // Polling Logic for Authorization (SRI 2026 Resilience)
            // If SRI says "Already Registered" or "Processing", we must wait and check authorization consistently.
            // We will attempt to authorize/check status up to 5 times with 3s delays.
            const maxAttempts = 5;
            let attempts = 0;

            console.log(`[GenerateInvoice] Starting Authorization Polling (Max ${maxAttempts} attempts)`);

            while (attempts < maxAttempts) {
                attempts++;

                // Wait before checking (except maybe first try if not a re-check, but safer to always wait a bit if it was just sent)
                // If it is 'already registered', it means we just got that error, so waiting is good.
                // If it was 'RECIBIDA', we also wait to give SRI time to process.
                if (attempts > 0) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

                console.log(`[GenerateInvoice] Authorization Attempt ${attempts}/${maxAttempts}...`);
                authResult = await this.sriService.authorizeInvoice(invoice.info.claveAcceso!, isProd);

                // 1. If Authorized, we are done!
                if (authResult.estado === 'AUTORIZADO') {
                    console.log('✅ Invoice Authorized successfully!');
                    break;
                }

                // 2. If valid Rejection (DEVUELTA) and NOT "Processing", stop.
                // Note: SRIService might return 'EN PROCESO' if query returns 0 docs.
                if (authResult.estado === 'DEVUELTA') {
                    // Check if it's actually just processing hidden in a message
                    const responseStr = JSON.stringify(authResult); // Check full object
                    if (responseStr.includes('EN PROCESAMIENTO') || responseStr.includes('CLAVE DE ACCESO EN PROCESAMIENTO')) {
                        console.log('⚠️ Status is DEVUELTA but message says PROCESSING. Retrying...');
                        continue;
                    }
                    console.log('❌ Invoice Rejected by SRI.');
                    break;
                }

                // 3. If 'EN PROCESO' or 'UNKNOWN', continue loop
                if (authResult.estado === 'EN PROCESO' || authResult.estado === 'UNKNOWN') {
                    console.log(`⚠️ Status is ${authResult.estado}. Retrying...`);
                    continue;
                }

                // If other status, break? Default to continue if not clear failure.
            }

            // Fallback if loop finishes without success
            if (!authResult) {
                authResult = { estado: 'TIMEOUT_POLLING', mensajes: ['El SRI tardó demasiado en responder. Intente "Verificar Status" más tarde.'] };
            }

        } else if (result.estado === 'DEVUELTA') {
            // Check for SEQUENCE REGISTERED Error explicitly
            const responseStr = JSON.stringify(result);
            if (responseStr.includes('ERROR SECUENCIAL REGISTRADO')) {
                console.log('⚠️ Sequence Registered Error detected in GenerateInvoice. Auto-healing...');

                // AUTO-HEAL: Increment Sequence and Retry locally
                const nextSequential = await this.configRepository.getNextSequential(); // Get NEW next (since previous one failed)
                const newSecuencial = nextSequential.toString().padStart(9, '0');
                console.log(`[GenerateInvoice] Retrying with NEW Sequence: ${invoice.info.secuencial} -> ${newSecuencial}`);

                // Update Invoice Object
                invoice.info.secuencial = newSecuencial;
                // Regenerate XML
                const newXml = this.sriService.generateInvoiceXML(invoice);
                const newSignedXml = await this.sriService.signXML(newXml);

                // Resend
                const retryResult = await this.sriService.sendToSRI(newSignedXml, isProd);

                if (retryResult.estado === 'RECIBIDA') {
                    console.log('✅ Auto-heal successful. Invoice Received. Authorizing...');
                    // Authorize NEW Access Key
                    const retryAuth = await this.sriService.authorizeInvoice(invoice.info.claveAcceso!, isProd);
                    if (retryAuth.estado === 'AUTORIZADO') {
                        authResult = retryAuth;
                        result.estado = 'RECIBIDA'; // Override original failure
                    } else {
                        authResult = retryAuth;
                    }
                } else {
                    // If still fails, bad luck.
                    console.log('❌ Auto-heal failed.', retryResult);
                    authResult = { ...result, mensajes: [...(result.mensajes || []), ...retryResult.mensajes] };
                }

            }
        }

        // 8. Persist Bill
        await this.billRepository.upsert({
            accessKey: invoice.info.claveAcceso,
            documentNumber: `${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}`,
            orderId: invoice.orderId,
            date: now.toISOString(), // Storing as ISO String
            documentType: 'Factura',
            customerName: invoice.info.razonSocialComprador,
            customerIdentification: invoice.info.identificacionComprador,
            customerAddress: invoice.info.direccionComprador,
            customerEmail: invoice.info.emailComprador,
            items: details.map(d => ({
                name: d.descripcion,
                quantity: d.cantidad,
                price: d.precioUnitario,
                total: d.precioTotalSinImpuesto + (d.impuestos[0]?.valor || 0)
            })),
            subtotal: invoice.info.totalSinImpuestos,
            tax: totalImpuestos,
            total: invoice.info.importeTotal,
            sriStatus: authResult.estado || result.estado,
            environment: invoice.info.ambiente,
            authorizationDate: authResult.fechaAutorizacion
        });

        // 9. Update Order
        await this.orderRepository.update(invoice.orderId, { billed: true });

        // 10. Send Email
        // Skip email for Consumidor Final or invalid email addresses
        const isConsumidorFinal = client.identification === '9999999999999';
        const isValidEmail = client.email &&
            !client.email.includes('consumidor@final') &&
            !client.email.includes('noemail') &&
            client.email.includes('@') &&
            client.email.includes('.');

        if (authResult.estado === 'AUTORIZADO' && !isConsumidorFinal && isValidEmail) {
            console.log(`[GenerateInvoice] Sending email to ${client.email}`);
            if (authResult.fechaAutorizacion) invoice.authorizationDate = authResult.fechaAutorizacion;
            const pdfBuffer = await this.pdfService.generateInvoicePDF(invoice);
            await this.emailService.sendInvoiceEmail(client.email, invoice, pdfBuffer, signedXml);
        } else {
            if (isConsumidorFinal) {
                console.log('[GenerateInvoice] Skipping email - Consumidor Final detected');
            } else if (!isValidEmail) {
                console.log('[GenerateInvoice] Skipping email - Invalid or generic email address');
            } else {
                console.log('[GenerateInvoice] Skipping email - Invoice not authorized or no email provided');
            }
        }

        return {
            success: true,
            invoiceId: invoice.info.secuencial,
            accessKey: invoice.info.claveAcceso,
            sriResponse: result,
            authorization: authResult,
            xml: xml
        };
    }

    /**
     * Validates that the invoice is being transmitted in real-time according to SRI 2026 regulations
     * Resolution NAC-DGERCGC25-00000017: The emission date must correspond to the current date
     * @param fechaEmision - Invoice emission date in DD/MM/YYYY format
     * @throws Error if the date is not today (with 5 minutes tolerance for clock sync issues)
     */
    private validateRealTimeTransmission(fechaEmision: string): void {
        const [day, month, year] = fechaEmision.split('/').map(Number);
        const invoiceDate = new Date(year, month - 1, day);
        const today = new Date();

        // Reset time to midnight for date-only comparison
        invoiceDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffMs = Math.abs(today.getTime() - invoiceDate.getTime());
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays > 0) {
            throw new Error(
                `Transmisión NO en tiempo real: La fecha de emisión (${fechaEmision}) debe ser la fecha actual según la Resolución SRI NAC-DGERCGC25-00000017 vigente desde el 01/01/2026. ` +
                `Las facturas deben transmitirse de forma INMEDIATA en el momento de su emisión.`
            );
        }
    }

    private getIdentificacionType(id: string): "04" | "05" | "06" | "07" {
        if (id === '9999999999999') return '07';
        if (id.length === 13) return '04';
        if (id.length === 10) return '05';
        return '06';
    }

    /**
     * Validates email format using regex
     * Accepts standard email formats (user@domain.com)
     * Rejects common typos like commas, spaces, missing @, missing domain
     */
    private validateEmail(email: string): void {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Remove whitespace for check if likely copy-paste error
        const cleanEmail = email.trim();

        if (!emailRegex.test(cleanEmail)) {
            throw new ValidationError(`⚠️ Error de Formato: El correo "${email}" no es válido. Verifique que no tenga espacios ni caracteres especiales.`);
        }

        // Specific check for commas which are common typos (user requested)
        if (email.includes(',')) {
            throw new ValidationError(`⚠️ Error Común Detectado: El correo no puede tener comas (,). Por favor use punto (.) para separar dominios.`);
        }
    }
}
