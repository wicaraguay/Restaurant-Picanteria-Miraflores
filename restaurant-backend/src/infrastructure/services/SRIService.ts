import { Invoice } from '../../domain/billing/invoice';
import { CreditNote } from '../../domain/billing/creditNote';
import { RestaurantConfig } from '../../domain/entities/RestaurantConfig';
import { logger } from '../utils/Logger';
import { XMLGenerator } from './sri/XMLGenerator';
import { SRISigner } from './sri/SRISigner';
import { SRISender } from './sri/SRISender';
import { SRIAuthorizer } from './sri/SRIAuthorizer';
import { SRIReceptionResponse, SRIAuthResponse } from './sri/types';

// Solo loguear XMLs completos en desarrollo
const DEBUG_XML = process.env.NODE_ENV === 'development';

/**
 * Servicio para gestionar la comunicación con el SRI
 * FACADE PATTERN: Orquesta módulos especializados para:
 * - Generación de XML (XMLGenerator)
 * - Firma Electrónica XAdES-BES (SRISigner)
 * - Envío y Recepción (SRISender)
 * - Autorización (SRIAuthorizer)
 *
 * Mantiene 100% compatibilidad hacia atrás con la API anterior.
 */
export class SRIService {
    private xmlGenerator: XMLGenerator;
    private signer: SRISigner;
    private sender: SRISender;
    private authorizer: SRIAuthorizer;

    constructor() {
        this.xmlGenerator = new XMLGenerator();
        this.signer = new SRISigner();
        this.sender = new SRISender();
        this.authorizer = new SRIAuthorizer();
    }

    /**
     * Helper para comparar estructuras de XML (diagnóstico) - Solo en desarrollo
     */
    private logXMLComparison(label1: string, xml1: string, label2: string, xml2: string) {
        if (!DEBUG_XML) return;
        logger.debug(`XML COMPARISON: ${label1} (${xml1.length} chars) vs ${label2} (${xml2.length} chars)`);
    }

    /**
     * Escapa y sanitiza texto para XML compatible con el SRI
     * @deprecated Use XMLGenerator.escapeXML directly for new code
     */
    private escapeXML(text: string): string {
        return this.xmlGenerator.escapeXML(text);
    }

    /**
     * Log de auditoría para operaciones SRI (Priority 3 - SRI 2026 Compliance)
     */
    private auditLog(operation: string, detail: string, status: 'SUCCESS' | 'FAIL' | 'INFO' = 'INFO'): void {
        const logMethod = status === 'FAIL' ? 'error' : status === 'SUCCESS' ? 'info' : 'debug';
        logger[logMethod](`[SRI-AUDIT] [${operation}] ${detail}`, { status });
    }

    /**
     * Genera el XML en formato string a partir del modelo de Factura
     * @param invoice Invoice model
     * @param existingAccessKey (Optional) Use this key instead of generating a new one (for resending/retrying)
     */
    public generateInvoiceXML(invoice: Invoice, existingAccessKey?: string): string {
        return this.xmlGenerator.generateInvoiceXML(invoice, existingAccessKey);
    }

    /**
     * Firma el XML usando el certificado digital (.p12) con XAdES-BES
     * Implementación usando librería 'ec-sri-invoice-signer'
     */
    public async signXML(xmlContent: string, config?: RestaurantConfig): Promise<string> {
        try {
            // Detect document type and delegate to appropriate signer
            const isCreditNote = xmlContent.includes('<notaCredito');
            return isCreditNote
                ? await this.signer.signCreditNoteXml(xmlContent, config)
                : await this.signer.signInvoiceXml(xmlContent, config);
        } catch (error: any) {
            logger.error('[SRI] Error signing XML', { error: error.message });
            throw error;
        }
    }

    /**
     * Envía el XML firmado al Web Service del SRI (Recepción)
     * FIX D-01: Now protected by circuit breaker
     */
    public async sendToSRI(signedXml: string, isProduction: boolean = false): Promise<SRIReceptionResponse> {
        return this.sender.sendToSRI(signedXml, isProduction);
    }

    /**
     * Polls the SRI Authorization service until the document is authorized or a terminal state is reached.
     * FIX M-09: Now uses exponential backoff to avoid overwhelming SRI when slow
     * @param accessKey Clave de acceso to check
     * @param isProduction Whether to use production or test environment
     * @param maxAttempts Maximum number of polling attempts (default 5)
     * @param baseDelay Base delay between attempts in ms (default 2000) - grows exponentially
     */
    public async waitForAuthorization(
        accessKey: string,
        isProduction: boolean = false,
        maxAttempts: number = 5,
        baseDelay: number = 2000
    ): Promise<SRIAuthResponse> {
        return this.authorizer.pollUntilAuthorized(accessKey, isProduction, maxAttempts, baseDelay);
    }

    /**
     * Consulta la Autorización del comprobante al SRI
     * FIX D-01: Now protected by circuit breaker
     */
    public async authorizeInvoice(accessKey: string, isProduction: boolean = false): Promise<SRIAuthResponse> {
        return this.authorizer.authorizeInvoice(accessKey, isProduction);
    }

    /**
     * Calcula el Dígito Verificador (Módulo 11) para la Clave de Acceso
     * @deprecated Use AccessKeyGenerator.calculateMod11 directly for new code
     */
    private calculateMod11(input: string): number {
        let factor = 2;
        let sum = 0;

        for (let i = input.length - 1; i >= 0; i--) {
            sum += parseInt(input.charAt(i)) * factor;
            factor = factor === 7 ? 2 : factor + 1;
        }

        const remainder = sum % 11;
        const result = 11 - remainder;

        if (result === 11) return 0;
        if (result === 10) return 1;
        return result;
    }

    /**
     * Genera el XML de una Nota de Crédito en formato string
     * @param creditNote Credit note model
     * @param existingAccessKey (Opcional) Reutilizar clave existente en reintentos
     */
    public generateCreditNoteXML(creditNote: CreditNote, existingAccessKey?: string): string {
        return this.xmlGenerator.generateCreditNoteXML(creditNote, existingAccessKey);
    }

    /**
     * Envía el XML de Nota de Crédito firmado al Web Service del SRI (Recepción)
     * FIX D-01: Now protected by circuit breaker
     */
    public async sendCreditNoteToSRI(signedXml: string, isProduction: boolean = false): Promise<SRIReceptionResponse> {
        return this.sender.sendCreditNoteToSRI(signedXml, isProduction);
    }

    /**
     * Consulta la Autorización de una Nota de Crédito al SRI
     * FIX D-01: Now protected by circuit breaker
     */
    public async authorizeCreditNote(accessKey: string, isProduction: boolean = false): Promise<SRIAuthResponse> {
        return this.authorizer.authorizeCreditNote(accessKey, isProduction);
    }

    /**
     * Helper para agrupar impuestos por código y porcentaje (SRI 2026 Compliance)
     * Requerido cuando una factura tiene items con diferentes tarifas de IVA (ej: 0% y 15%)
     * @deprecated Use XMLGenerator.groupTaxes directly for new code
     */
    private groupTaxes(detalles: any[]): any[] {
        return this.xmlGenerator.groupTaxes(detalles);
    }
}
