
import { SRIService } from '../../infrastructure/services/SRIService';
import { PDFService } from '../../infrastructure/services/PDFService';
import { IEmailService } from '../interfaces/IEmailService';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { Invoice, InvoiceDetail } from '../../domain/billing/invoice';
import { ValidationError } from '../../domain/errors/CustomErrors';

import { BillingService } from '../services/BillingService';
import { OrderStatus } from '../../domain/entities/Order';

export class GenerateInvoice {
    constructor(
        private configRepository: IRestaurantConfigRepository,
        private billRepository: IBillRepository,
        private orderRepository: IOrderRepository,
        private sriService: SRIService,
        private pdfService: PDFService,
        private emailService: IEmailService,
        private billingService: BillingService
    ) { }

    async execute(params: {
        order: any,
        client: any,
        taxRate?: number,
        logoUrl?: string,
        id?: string
    }): Promise<any> {
        const { order, client, taxRate = 15, logoUrl } = params;

        // Validate Email Format (User Request)
        // Ensure email has correct format to avoid sending typos (commas, extra letters)
        if (client.email) {
            this.billingService.validateEmail(client.email);
        }


        // 1. Calculate Details
        const details = this.billingService.calculateDetails(order.items, taxRate);

        const subtotal = details.reduce((sum, d) => sum + d.precioTotalSinImpuesto, 0);
        const totalImpuestos = details.reduce((sum, d) => sum + d.impuestos[0].valor, 0);
        const total = subtotal + totalImpuestos;

        // 1.1. Validate Consumidor Final (SRI 2026 Compliance)
        this.billingService.validateConsumidorFinal(client.identification, total);

        // 2. Get Config
        const config = await this.configRepository.get();
        const info = config || {} as any; // Fallback handled in logic or entity

        console.log('[GenerateInvoice] Config from DB:', !!config, 'Logo field:', info.logo ? 'EXISTS' : 'MISSING', 'Fiscal Logo field:', info.fiscalLogo ? 'EXISTS' : 'MISSING');
        if (info.logo) console.log('[GenerateInvoice] Logo starts with:', info.logo.substring(0, 30));

        // 3. Get Next Sequential (Atomic Operation) or Reuse existing one
        let secuencial: string;
        let existingBill = null;

        if (params.id) {
            existingBill = await this.billRepository.findById(params.id);
        }

        if (existingBill && existingBill.documentNumber) {
            // --- RETRY LIMIT CHECK ---
            const todayISO = this.billingService.getCurrentDateEcuador().split('/').reverse().join('-');
            if (existingBill.lastRetryDate === todayISO && (existingBill.retryCount || 0) >= 3) {
                throw new Error('SRI_LIMIT_REACHED: Límite de 3 intentos diarios alcanzado para este comprobante (1 emisión + 2 reintentos). Por favor intente mañana con una nueva clave automática.');
            }
            // -------------------------

            // Reuse existing sequential to avoid gaps (User Request)
            const parts = existingBill.documentNumber.split('-');
            secuencial = parts[parts.length - 1];
            console.log(`[GenerateInvoice] Reusing existing sequential: ${secuencial} for bill ${params.id}`);
        } else {
            // CRITICAL: This ensures each invoice has a unique sequential number
            // preventing duplicate access key errors from SRI
            const nextSequential = await this.configRepository.getNextSequential();
            secuencial = nextSequential.toString().padStart(9, '0');
            console.log(`[GenerateInvoice] New sequential generated: ${secuencial}`);
        }

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
                fechaEmision: this.billingService.getCurrentDateEcuador(),
                obligadoContabilidad: info.obligadoContabilidad ? 'SI' : 'NO',
                tipoIdentificacionComprador: this.billingService.getIdentificacionType(client.identification),
                razonSocialComprador: String(client.identification) === '9999999999999' ? 'CONSUMIDOR FINAL' : client.name,
                identificacionComprador: client.identification,
                direccionComprador: client.address,
                totalSinImpuestos: subtotal,
                totalDescuento: 0,
                totalImpuestos: [],
                importeTotal: total,
                moneda: 'DOLAR',
                emailComprador: client.email,
                formaPago: this.billingService.getPaymentMethodCode(client.paymentMethod || '01'),
                logoUrl: this.billingService.getLogoUrl(info, logoUrl),
                tasaIva: taxRate.toString(),
                telefonoComprador: client.phone,
                emailMatriz: info.fiscalEmail || info.email || process.env.SMTP_FROM || 'info@restaurant.com',
                regime: info.billing?.regime,
                agenteRetencion: info.billing?.agenteRetencion
            }
        };

        // SRI 2026 Compliance: Real-Time Transmission Validation
        // Resolution NAC-DGERCGC25-00000017: Invoices must be transmitted immediately upon emission
        // The emission date must correspond to the current date
        this.billingService.validateRealTimeTransmission(invoice.info.fechaEmision);

        // 5. ETAPA 0: Auto-learn Customer Data (Real-time Learning)
        // CRITICAL: We do this BEFORE any risky SRI/DB operations to ensure 
        // customer data is captured even if the electronic billing fails.
        const autoLearnResult = await this.billingService.autoLearnCustomer(client, now);

        // Pre-calculate user flags for learning and email logic
        const isConsumidorFinal = String(client.identification) === '9999999999999';
        const isValidEmail = client.email &&
            !client.email.includes('consumidor@final') &&
            !client.email.includes('noemail') &&
            client.email.includes('@') &&
            client.email.includes('.');

        // 5. ETAPA 1: Crear Borrador en DB
        const billData: any = {
            id: params.id, // Reutilizar ID si viene de un re-intento
            accessKey: undefined,
            documentNumber: `${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}`,
            orderId: invoice.orderId,
            date: now.toISOString(),
            documentType: 'Factura',
            customerName: invoice.info.razonSocialComprador,
            customerIdentification: String(invoice.info.identificacionComprador),
            customerAddress: invoice.info.direccionComprador,
            customerEmail: invoice.info.emailComprador,
            items: details.map(d => {
                const itemTotal = d.precioTotalSinImpuesto + (d.impuestos[0]?.valor || 0);
                return {
                    name: d.descripcion,
                    quantity: d.cantidad,
                    price: parseFloat((itemTotal / d.cantidad).toFixed(6)),
                    total: itemTotal
                };
            }),
            subtotal: invoice.info.totalSinImpuestos,
            tax: totalImpuestos,
            total: invoice.info.importeTotal,
            retryCount: 1, // First attempt
            lastRetryDate: this.billingService.getCurrentDateEcuador().split('/').reverse().join('-')
        };

        const draftBill = await this.billRepository.upsert(billData);

        // 6. ETAPA 2: Generar y Firmar XML (VALIDADO)
        const xml = this.sriService.generateInvoiceXML(invoice);
        const signedXml = await this.sriService.signXML(xml);
        const isProd = process.env.SRI_ENV === '2';

        await this.billRepository.upsert({
            id: draftBill.id,
            accessKey: invoice.info.claveAcceso,
            xmlContent: signedXml,
            sriStatus: 'VALIDADO'
        });

        // 7. ETAPA 3: Envío al SRI (AUTORIZADO)
        const result = await this.sriService.sendToSRI(signedXml, isProd);

        // 7. Handle Response & Authorization
        const responseString = JSON.stringify(result);
        const isAlreadyRegistered = result.estado === 'DEVUELTA' &&
            (responseString.includes('CLAVE ACCESO REGISTRADA') || responseString.includes('EN PROCESAMIENTO'));

        let authResult = null;
        if (result.estado === 'RECIBIDA' || isAlreadyRegistered) {
            authResult = await this.sriService.waitForAuthorization(invoice.info.claveAcceso!, isProd);
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
                    if (retryAuth && retryAuth.estado === 'AUTORIZADO') {
                        authResult = retryAuth;
                        result.estado = 'RECIBIDA'; // Override original failure
                    } else {
                        // Check if retryAuth is valid before using it
                        if (retryAuth) {
                            authResult = retryAuth;
                        } else {
                            console.error('[GenerateInvoice] Auto-heal authorization returned NULL');
                            // Keep authResult null or set error
                            authResult = { estado: 'ERROR_AUTH_NULL', mensajes: ['Error interno al autorizar (Respuesta nula)'] };
                        }
                    }
                } else {
                    // If still fails, bad luck.
                    console.log('❌ Auto-heal failed.', retryResult);
                    authResult = { ...result, mensajes: [...(result.mensajes || []), ...retryResult.mensajes] };
                }

            }
        }

        // 8. Persistir Resultado Final
        await this.billRepository.upsert({
            id: draftBill.id,
            sriStatus: authResult?.estado || result.estado,
            authorizationDate: authResult?.fechaAutorizacion,
            sriMessage: (authResult?.mensajes || result.mensajes || []).join(' ')
        });

        // 9. Update Order to COMPLETED and set billed flag to move to history
        await this.orderRepository.update(invoice.orderId, {
            billed: true,
            status: OrderStatus.Completed,
            billingType: isConsumidorFinal ? 'Consumidor Final' : 'Factura'
        });


        // 11. Send Email
        // Skip email for Consumidor Final or invalid email addresses
        if (authResult?.estado === 'AUTORIZADO' && !isConsumidorFinal && isValidEmail) {
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

        // 10. Retornar resultado
        return {
            success: true,
            invoiceId: draftBill.id,
            invoiceNumber: draftBill.documentNumber,
            accessKey: invoice.info.claveAcceso,
            customerLearning: autoLearnResult,
            xml: xml,
            sriResponse: result,
            authorization: authResult
        };
    }
}
