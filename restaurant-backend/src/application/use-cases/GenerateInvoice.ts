/**
 * GenerateInvoice.ts
 * FIX D-03: Refactored from 346 lines to smaller, focused methods
 *
 * Use case for generating electronic invoices (facturas electrónicas) for SRI Ecuador.
 * Orchestrates: validation → XML generation → signing → SRI submission → authorization → email
 */

import { SRIService } from '../../infrastructure/services/SRIService';
import { PDFService } from '../../infrastructure/services/PDFService';
import { IEmailService } from '../interfaces/IEmailService';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { Invoice, InvoiceDetail } from '../../domain/billing/invoice';
import { ValidationError } from '../../domain/errors/CustomErrors';
import { BillingService } from '../services/BillingService';
import { OrderStatus } from '../../domain/entities/Order';
import { logger } from '../../infrastructure/utils/Logger';
import { SRI_MAX_DAILY_RETRIES, CONSUMIDOR_FINAL_RUC } from '../../config/billing.constants';
import { RestaurantConfig } from '../../domain/entities/RestaurantConfig';
import { dbConnection } from '../../infrastructure/database/DatabaseConnection';

/** Input parameters for invoice generation */
interface GenerateInvoiceParams {
    order: any;
    client: any;
    taxRate?: number;
    logoUrl?: string;
    id?: string; // Existing bill ID for retries
}

/** Result of invoice generation */
interface GenerateInvoiceResult {
    success: boolean;
    invoiceId: string;
    invoiceNumber: string;
    accessKey: string | undefined;
    customerLearning: any;
    xml: string;
    sriResponse: any;
    authorization: any;
    emailStatus: EmailStatus;
}

/** Email sending status */
interface EmailStatus {
    sent: boolean;
    skipped: boolean;
    error?: string;
    skipReason?: string;
}

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

    /**
     * Main execution method - orchestrates the entire invoice generation flow
     */
    async execute(params: GenerateInvoiceParams): Promise<GenerateInvoiceResult> {
        const { order, client, taxRate = 15, logoUrl } = params;

        // Step 1: Validate input and calculate totals
        this.validateClientEmail(client.email);
        const { details, subtotal, totalImpuestos, total } = this.calculateTotals(order.items, taxRate);
        this.billingService.validateConsumidorFinal(client.identification, total);

        // Step 2: Get configuration and sequential
        const config = await this.configRepository.get();
        const secuencial = await this.resolveSequential(params.id);

        // Step 3: Build invoice object
        const invoice = this.buildInvoice(order, client, details, subtotal, total, config, secuencial, logoUrl, taxRate);

        // Step 4: Validate real-time transmission (SRI 2026 compliance)
        this.billingService.validateRealTimeTransmission(invoice.info.fechaEmision);

        // Step 5: Auto-learn customer data (non-blocking)
        const autoLearnResult = await this.tryAutoLearnCustomer(client);

        // Step 6: Create draft bill in database
        const draftBill = await this.createDraftBill(params.id, invoice, details, totalImpuestos);

        // Step 7: Generate, sign, and send XML to SRI
        const { xml, signedXml, result, authResult, updatedInvoice } = await this.processWithSRI(
            invoice, config, draftBill.id
        );

        // Determine if consumidor final (needed for order status and email)
        const isConsumidorFinal = String(client.identification) === CONSUMIDOR_FINAL_RUC;

        // Step 8 & 9: Persist final result and update order status atomically
        // CRITICAL: These operations must succeed together or fail together (data consistency)
        await dbConnection.withTransaction(async (_session) => {
            // Step 8: Persist final result
            await this.persistFinalResult(draftBill.id, result, authResult);

            // Step 9: Update order status
            await this.updateOrderStatus(invoice.orderId, isConsumidorFinal);

            // NOTE: Currently repositories don't accept session parameter.
            // When implementing session support, add { session } option:
            // await this.billRepository.upsert({ ... }, { session });
            // await this.orderRepository.update(id, data, { session });
        });

        // Step 10: Send email notification
        const emailStatus = await this.handleEmailNotification(
            authResult, client, updatedInvoice || invoice, signedXml, isConsumidorFinal
        );

        // Step 11: Return result
        const finalDocumentNumber = `${invoice.info.estab}-${invoice.info.ptoEmi}-${(updatedInvoice || invoice).info.secuencial}`;
        return {
            success: true,
            invoiceId: draftBill.id,
            invoiceNumber: finalDocumentNumber,
            accessKey: (updatedInvoice || invoice).info.claveAcceso,
            customerLearning: autoLearnResult,
            xml: xml,
            sriResponse: result,
            authorization: authResult,
            emailStatus
        };
    }

    // ========== Private Helper Methods ==========

    /**
     * Validates client email format if provided
     */
    private validateClientEmail(email: string | undefined): void {
        if (email) {
            this.billingService.validateEmail(email);
        }
    }

    /**
     * Calculates invoice details and totals from order items
     */
    private calculateTotals(items: any[], taxRate: number): {
        details: InvoiceDetail[];
        subtotal: number;
        totalImpuestos: number;
        total: number;
    } {
        const details = this.billingService.calculateDetails(items, taxRate);
        const subtotal = details.reduce((sum, d) => sum + d.precioTotalSinImpuesto, 0);
        const totalImpuestos = details.reduce((sum, d) => sum + d.impuestos[0].valor, 0);
        const total = subtotal + totalImpuestos;

        return { details, subtotal, totalImpuestos, total };
    }

    /**
     * Resolves the sequential number - reuses existing for retries or generates new
     */
    private async resolveSequential(existingBillId?: string): Promise<string> {
        if (existingBillId) {
            const existingBill = await this.billRepository.findById(existingBillId);

            if (existingBill && existingBill.documentNumber) {
                // Check retry limit
                this.checkRetryLimit(existingBill);

                // Reuse existing sequential
                const parts = existingBill.documentNumber.split('-');
                const secuencial = parts[parts.length - 1];
                logger.info(`[GenerateInvoice] Reusing existing sequential: ${secuencial} for bill ${existingBillId}`);
                return secuencial;
            }
        }

        // Generate new sequential (atomic operation)
        const nextSequential = await this.configRepository.getNextSequential();
        const secuencial = nextSequential.toString().padStart(9, '0');
        logger.info(`[GenerateInvoice] New sequential generated: ${secuencial}`);
        return secuencial;
    }

    /**
     * Checks if retry limit has been reached for the day
     */
    private checkRetryLimit(bill: any): void {
        const todayISO = this.billingService.getCurrentDateEcuador().split('/').reverse().join('-');
        if (bill.lastRetryDate === todayISO && (bill.retryCount || 0) >= SRI_MAX_DAILY_RETRIES) {
            throw new Error(
                `SRI_LIMIT_REACHED: Límite de ${SRI_MAX_DAILY_RETRIES} intentos diarios alcanzado ` +
                `para este comprobante. Por favor intente mañana con una nueva clave automática.`
            );
        }
    }

    /**
     * Builds the invoice object from all collected data
     */
    private buildInvoice(
        order: any,
        client: any,
        details: InvoiceDetail[],
        subtotal: number,
        total: number,
        config: RestaurantConfig | null,
        secuencial: string,
        logoUrl: string | undefined,
        taxRate: number
    ): Invoice {
        const info = config || {} as any;
        const now = new Date();

        logger.info(`[GenerateInvoice] Config from DB: ${!!config}, Logo: ${info.logo ? 'EXISTS' : 'MISSING'}`);

        return {
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
                secuencial,
                fechaEmision: this.billingService.getCurrentDateEcuador(),
                obligadoContabilidad: info.obligadoContabilidad ? 'SI' : 'NO',
                tipoIdentificacionComprador: this.billingService.getIdentificacionType(client.identification),
                razonSocialComprador: String(client.identification) === CONSUMIDOR_FINAL_RUC ? 'CONSUMIDOR FINAL' : client.name,
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
    }

    /**
     * Attempts to auto-learn customer data (non-blocking)
     */
    private async tryAutoLearnCustomer(client: any): Promise<any> {
        try {
            return await this.billingService.autoLearnCustomer(client, new Date());
        } catch (error) {
            logger.warn('[GenerateInvoice] autoLearnCustomer failed (non-blocking):', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Creates or updates the draft bill in the database
     */
    private async createDraftBill(
        existingId: string | undefined,
        invoice: Invoice,
        details: InvoiceDetail[],
        totalImpuestos: number
    ): Promise<any> {
        const billData: any = {
            id: existingId,
            accessKey: undefined,
            documentNumber: `${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}`,
            orderId: invoice.orderId,
            date: new Date().toISOString(),
            documentType: 'Factura',
            customerName: invoice.info.razonSocialComprador,
            customerIdentification: String(invoice.info.identificacionComprador),
            customerAddress: invoice.info.direccionComprador,
            customerEmail: invoice.info.emailComprador,
            items: details.map(d => ({
                name: d.descripcion,
                quantity: d.cantidad,
                price: parseFloat(((d.precioTotalSinImpuesto + (d.impuestos[0]?.valor || 0)) / d.cantidad).toFixed(6)),
                total: d.precioTotalSinImpuesto + (d.impuestos[0]?.valor || 0)
            })),
            subtotal: invoice.info.totalSinImpuestos,
            tax: totalImpuestos,
            total: invoice.info.importeTotal,
            retryCount: 1,
            lastRetryDate: this.billingService.getCurrentDateEcuador().split('/').reverse().join('-')
        };

        return await this.billRepository.upsert(billData);
    }

    /**
     * Processes the invoice with SRI: generate XML, sign, send, authorize
     */
    private async processWithSRI(
        invoice: Invoice,
        config: RestaurantConfig | null,
        billId: string
    ): Promise<{
        xml: string;
        signedXml: string;
        result: any;
        authResult: any;
        updatedInvoice: Invoice | null;
    }> {
        const isProd = process.env.SRI_ENV === '2';

        // Generate and sign XML
        const xml = this.sriService.generateInvoiceXML(invoice);
        const signedXml = await this.sriService.signXML(xml, config || undefined);

        // Update bill with access key and signed XML
        await this.billRepository.upsert({
            id: billId,
            accessKey: invoice.info.claveAcceso,
            xmlContent: signedXml,
            sriStatus: 'VALIDADO'
        });

        // Send to SRI
        const result = await this.sriService.sendToSRI(signedXml, isProd);

        // Handle authorization
        const { authResult, updatedInvoice } = await this.handleSRIResponse(
            result, invoice, config, billId, isProd
        );

        return { xml, signedXml, result, authResult, updatedInvoice };
    }

    /**
     * Handles SRI response and authorization flow
     */
    private async handleSRIResponse(
        result: any,
        invoice: Invoice,
        config: RestaurantConfig | null,
        billId: string,
        isProd: boolean
    ): Promise<{ authResult: any; updatedInvoice: Invoice | null }> {
        const responseString = JSON.stringify(result);
        const isAlreadyRegistered = result.estado === 'DEVUELTA' &&
            (responseString.includes('CLAVE ACCESO REGISTRADA') || responseString.includes('EN PROCESAMIENTO'));

        // Normal authorization flow
        if (result.estado === 'RECIBIDA' || isAlreadyRegistered) {
            const authResult = await this.sriService.waitForAuthorization(invoice.info.claveAcceso!, isProd);
            return { authResult, updatedInvoice: null };
        }

        // Handle DEVUELTA with sequence error
        if (result.estado === 'DEVUELTA' && responseString.includes('ERROR SECUENCIAL REGISTRADO')) {
            return await this.handleSequenceError(invoice, config, billId, result, isProd);
        }

        return { authResult: null, updatedInvoice: null };
    }

    /**
     * Handles sequence error by auto-healing with new sequential
     */
    private async handleSequenceError(
        invoice: Invoice,
        config: RestaurantConfig | null,
        billId: string,
        originalResult: any,
        isProd: boolean
    ): Promise<{ authResult: any; updatedInvoice: Invoice }> {
        logger.info('⚠️ Sequence Registered Error detected. Auto-healing...');

        // Get new sequential
        const nextSequential = await this.configRepository.getNextSequential();
        const newSecuencial = nextSequential.toString().padStart(9, '0');
        logger.info(`[GenerateInvoice] Retrying with NEW Sequence: ${invoice.info.secuencial} -> ${newSecuencial}`);

        // Update invoice
        invoice.info.secuencial = newSecuencial;

        // Regenerate and sign XML
        const newXml = this.sriService.generateInvoiceXML(invoice);
        const newSignedXml = await this.sriService.signXML(newXml, config || undefined);

        // Resend to SRI
        const retryResult = await this.sriService.sendToSRI(newSignedXml, isProd);

        if (retryResult.estado === 'RECIBIDA') {
            logger.info('✅ Auto-heal successful. Invoice Received. Authorizing...');

            // Update DB with new document number
            const newDocumentNumber = `${invoice.info.estab}-${invoice.info.ptoEmi}-${newSecuencial}`;
            await this.billRepository.upsert({
                id: billId,
                documentNumber: newDocumentNumber,
                accessKey: invoice.info.claveAcceso
            });
            logger.info(`[GenerateInvoice] Auto-heal: Updated DB with new documentNumber=${newDocumentNumber}`);

            // Authorize
            const retryAuth = await this.sriService.authorizeInvoice(invoice.info.claveAcceso!, isProd);

            if (retryAuth?.estado === 'AUTORIZADO') {
                return { authResult: retryAuth, updatedInvoice: invoice };
            }

            return {
                authResult: retryAuth || { estado: 'ERROR_AUTH_NULL', mensajes: ['Error interno al autorizar'] },
                updatedInvoice: invoice
            };
        }

        logger.info('❌ Auto-heal failed.', retryResult);
        return {
            authResult: {
                ...originalResult,
                mensajes: [...(originalResult.mensajes || []), ...(retryResult.mensajes || [])]
            },
            updatedInvoice: invoice
        };
    }

    /**
     * Persists the final SRI result to the database
     */
    private async persistFinalResult(billId: string, result: any, authResult: any): Promise<void> {
        const finalStatus = authResult?.estado || result.estado;
        const finalMessage = (authResult?.mensajes || result.mensajes || []).join(' ');

        await this.billRepository.upsert({
            id: billId,
            sriStatus: finalStatus,
            authorizationDate: authResult?.fechaAutorizacion,
            sriMessage: finalMessage
        });

        // Log errors if not authorized
        if (finalStatus !== 'AUTORIZADO' && finalMessage) {
            await (this.billRepository as any).pushErrorLog(billId, {
                timestamp: new Date().toISOString(),
                sriStatus: finalStatus || 'DESCONOCIDO',
                message: finalMessage,
                attempt: 1
            });
        }
    }

    /**
     * Updates the order status after billing
     */
    private async updateOrderStatus(orderId: string, isConsumidorFinal: boolean): Promise<void> {
        await this.orderRepository.update(orderId, {
            billed: true,
            status: OrderStatus.Completed,
            billingType: isConsumidorFinal ? 'Consumidor Final' : 'Factura'
        });
    }

    /**
     * Handles email notification for authorized invoices
     */
    private async handleEmailNotification(
        authResult: any,
        client: any,
        invoice: Invoice,
        signedXml: string,
        isConsumidorFinal: boolean
    ): Promise<EmailStatus> {
        const emailStatus: EmailStatus = { sent: false, skipped: false };

        const isValidEmail = this.isValidClientEmail(client.email);

        // Skip if not authorized, consumidor final, or invalid email
        if (authResult?.estado !== 'AUTORIZADO' || isConsumidorFinal || !isValidEmail) {
            emailStatus.skipped = true;
            emailStatus.skipReason = this.getEmailSkipReason(authResult?.estado, isConsumidorFinal, isValidEmail);
            logger.info(`[GenerateInvoice] Skipping email - ${emailStatus.skipReason}`);
            return emailStatus;
        }

        // Send email
        logger.info(`[GenerateInvoice] Sending email to ${client.email}`);

        if (authResult.fechaAutorizacion) {
            invoice.authorizationDate = authResult.fechaAutorizacion;
        }

        const pdfBuffer = await this.pdfService.generateInvoicePDF(invoice);
        const emailResult = await this.emailService.sendInvoiceEmail(client.email, invoice, pdfBuffer, signedXml);

        emailStatus.sent = emailResult.success;
        if (!emailResult.success) {
            emailStatus.error = emailResult.error;
            logger.warn(`[GenerateInvoice] Email failed: ${emailResult.error}`);
        } else {
            logger.info(`[GenerateInvoice] Email sent successfully. MessageId: ${emailResult.messageId}`);
        }

        return emailStatus;
    }

    /**
     * Validates if client email is valid for sending
     */
    private isValidClientEmail(email: string | undefined): boolean {
        return !!(
            email &&
            !email.includes('consumidor@final') &&
            !email.includes('noemail') &&
            email.includes('@') &&
            email.includes('.')
        );
    }

    /**
     * Gets the reason for skipping email
     */
    private getEmailSkipReason(estado: string | undefined, isConsumidorFinal: boolean, isValidEmail: boolean): string {
        if (isConsumidorFinal) return 'Consumidor Final';
        if (!isValidEmail) return 'Email inválido o genérico';
        if (estado !== 'AUTORIZADO') return 'Factura no autorizada';
        return 'Razón desconocida';
    }
}
