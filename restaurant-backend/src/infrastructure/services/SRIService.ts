import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { Invoice, InvoiceDetail } from '../../domain/billing/invoice';
import { CreditNote, CreditNoteDetail } from '../../domain/billing/creditNote';
import { signInvoiceXml, signCreditNoteXml } from 'ec-sri-invoice-signer';
import { logger } from '../utils/Logger';
import { certificateEncryption } from '../utils/CertificateEncryption';
import { RestaurantConfig } from '../../domain/entities/RestaurantConfig';

// Solo loguear XMLs completos en desarrollo
const DEBUG_XML = process.env.NODE_ENV === 'development';

/**
 * Servicio para gestionar la comunicación con el SRI
 * - Generación de XML
 * - Firma Electrónica (XAdES-BES)
 * - Envío y Autorización
 */
export class SRIService {

    /**
     * Helper para comparar estructuras de XML (diagnóstico) - Solo en desarrollo
     */
    private logXMLComparison(label1: string, xml1: string, label2: string, xml2: string) {
        if (!DEBUG_XML) return;
        logger.debug(`XML COMPARISON: ${label1} (${xml1.length} chars) vs ${label2} (${xml2.length} chars)`);
    }

    /**
     * Escapa y sanitiza texto para XML compatible con el SRI
     * - Convierte tildes y caracteres especiales a ASCII
     * - Escapa caracteres XML especiales
     * - Remueve caracteres no permitidos
     */
    private escapeXML(text: string): string {
        if (!text) return '';

        // 1. Normalize accented characters to ASCII equivalents
        const normalized = text
            .normalize('NFD')  // Decompose accented characters
            .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics

        // 2. Escape XML special characters
        const escaped = normalized
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

        // 3. Remove any remaining non-printable or problematic characters
        const cleaned = escaped.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

        return cleaned;
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
     */
    /**
     * Genera el XML en formato string a partir del modelo de Factura
     * @param existingAccessKey - (Optional) Use this key instead of generating a new one (for resending/retrying)
     */
    public generateInvoiceXML(invoice: Invoice, existingAccessKey?: string): string {
        logger.info('[SRI] Generating invoice XML', { secuencial: invoice.info.secuencial });

        let claveAcceso = existingAccessKey;

        if (!claveAcceso) {
            // 1. Generate Access Key (Clave de Acceso)
            // Format Date: dd/mm/yyyy -> ddMMyyyy
            const dateParts = invoice.info.fechaEmision.split('/');
            // Ensure padding if necessary (though localeDateString usually does it, safer to be sure)
            const day = dateParts[0].padStart(2, '0');
            const month = dateParts[1].padStart(2, '0');
            const year = dateParts[2];
            const fechaSimple = `${day}${month}${year}`;

            // Generate random 8-digit numeric code (CRITICAL for unique access keys)
            // Each invoice must have a different random code to avoid SRI collisions
            const codigoNumerico = Math.floor(10000000 + Math.random() * 90000000).toString();

            const keyPayload =
                fechaSimple +
                '01' + // CodDoc (Factura)
                invoice.info.ruc +
                invoice.info.ambiente +
                invoice.info.estab +
                invoice.info.ptoEmi +
                invoice.info.secuencial +
                codigoNumerico +
                '1'; // Tipo Emision (Normal)

            const digitoVerificador = this.calculateMod11(keyPayload);
            claveAcceso = keyPayload + digitoVerificador;
        } else {
            logger.debug('[SRI] Using existing access key for regeneration');
        }

        // Save key to invoice
        invoice.info.claveAcceso = claveAcceso;
        logger.info('[SRI] Access key generated', { claveAcceso: claveAcceso.substring(0, 10) + '...' });

        // FIX: Derive the tax percentage code dynamically from the first detail item
        // instead of hardcoding '4' (15%). This ensures correctness for all tax rates.
        const invoiceTaxCode = invoice.detalles[0]?.impuestos[0]?.codigoPorcentaje ?? '4';

        const xml = `
<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="1.1.0">
    <infoTributaria>
        <ambiente>${invoice.info.ambiente}</ambiente>
        <tipoEmision>1</tipoEmision>
        <razonSocial>${this.escapeXML(invoice.info.razonSocial)}</razonSocial>
        ${invoice.info.nombreComercial ? `<nombreComercial>${this.escapeXML(invoice.info.nombreComercial)}</nombreComercial>` : ''}
        <ruc>${invoice.info.ruc}</ruc>
        <claveAcceso>${claveAcceso}</claveAcceso>
        <codDoc>01</codDoc>
        <estab>${invoice.info.estab}</estab>
        <ptoEmi>${invoice.info.ptoEmi}</ptoEmi>
        <secuencial>${invoice.info.secuencial}</secuencial>
        <dirMatriz>${this.escapeXML(invoice.info.dirMatriz)}</dirMatriz>
        ${(invoice.info.regime && invoice.info.regime.includes('RIMPE')) ? `<regimenRimpe>CONTRIBUYENTE RÉGIMEN RIMPE</regimenRimpe>` : ''}
        ${invoice.info.agenteRetencion ? `<agenteRetencion>${invoice.info.agenteRetencion}</agenteRetencion>` : ''}
        ${invoice.info.contribuyenteEspecial ? `<contribuyenteEspecial>${invoice.info.contribuyenteEspecial}</contribuyenteEspecial>` : ''}
    </infoTributaria>
    <infoFactura>
        <fechaEmision>${invoice.info.fechaEmision}</fechaEmision>
        <dirEstablecimiento>${this.escapeXML(invoice.info.dirEstablecimiento || invoice.info.dirMatriz)}</dirEstablecimiento>
        <obligadoContabilidad>${invoice.info.obligadoContabilidad}</obligadoContabilidad>
        <tipoIdentificacionComprador>${invoice.info.tipoIdentificacionComprador}</tipoIdentificacionComprador>
        <razonSocialComprador>${this.escapeXML(invoice.info.razonSocialComprador)}</razonSocialComprador>
        <identificacionComprador>${invoice.info.identificacionComprador}</identificacionComprador>
        <totalSinImpuestos>${invoice.info.totalSinImpuestos.toFixed(2)}</totalSinImpuestos>
        <totalDescuento>${invoice.info.totalDescuento.toFixed(2)}</totalDescuento>
        <totalConImpuestos>
            ${this.groupTaxes(invoice.detalles).map((tax: any) => `
            <totalImpuesto>
                <codigo>${tax.codigo}</codigo>
                <codigoPorcentaje>${tax.codigoPorcentaje}</codigoPorcentaje>
                <baseImponible>${tax.baseImponible.toFixed(2)}</baseImponible>
                <valor>${tax.valor.toFixed(2)}</valor>
            </totalImpuesto>`).join('')}
        </totalConImpuestos>
        <propina>0.00</propina>
        <importeTotal>${invoice.info.importeTotal.toFixed(2)}</importeTotal>
        <moneda>${invoice.info.moneda}</moneda>
        <pagos>
            <pago>
                <formaPago>${invoice.info.formaPago || '01'}</formaPago>
                <total>${invoice.info.importeTotal.toFixed(2)}</total>
                <plazo>0</plazo>
                <unidadTiempo>dias</unidadTiempo>
            </pago>
        </pagos>
    </infoFactura>
    <detalles>
        ${invoice.detalles.map((d: InvoiceDetail) => {
            const imp = d.impuestos[0];
            return `
        <detalle>
            <codigoPrincipal>${this.escapeXML(d.codigoPrincipal)}</codigoPrincipal>
            <descripcion>${this.escapeXML(d.descripcion)}</descripcion>
            <cantidad>${d.cantidad}</cantidad>
            <precioUnitario>${d.precioUnitario}</precioUnitario>
            <descuento>0.00</descuento>
            <precioTotalSinImpuesto>${d.precioTotalSinImpuesto.toFixed(2)}</precioTotalSinImpuesto>
            <impuestos>
                <impuesto>
                    <codigo>${imp.codigo}</codigo>
                    <codigoPorcentaje>${imp.codigoPorcentaje}</codigoPorcentaje>
                    <tarifa>${imp.tarifa}</tarifa>
                    <baseImponible>${imp.baseImponible.toFixed(2)}</baseImponible>
                    <valor>${imp.valor.toFixed(2)}</valor>
                </impuesto>
            </impuestos>
        </detalle>`;
        }).join('')}
    </detalles>
    <infoAdicional>
        ${invoice.info.direccionComprador ? `<campoAdicional nombre="Dirección">${this.escapeXML(invoice.info.direccionComprador)}</campoAdicional>` : ''}
        ${invoice.info.telefonoComprador ? `<campoAdicional nombre="Teléfono">${this.escapeXML(invoice.info.telefonoComprador)}</campoAdicional>` : ''}
        ${invoice.info.emailComprador ? `<campoAdicional nombre="Email">${this.escapeXML(invoice.info.emailComprador)}</campoAdicional>` : ''}
        ${invoice.info.contribuyenteEspecial ? `<campoAdicional nombre="Contribuyente Especial">${invoice.info.contribuyenteEspecial}</campoAdicional>` : ''}
        ${(invoice.info.regime && invoice.info.regime.includes('RIMPE')) ? `<campoAdicional nombre="Régimen">Contribuyente Régimen RIMPE</campoAdicional>` : ''}
        ${invoice.info.agenteRetencion ? `<campoAdicional nombre="Agente de Retención">Resolución No. ${invoice.info.agenteRetencion}</campoAdicional>` : ''}
    </infoAdicional>
</factura>`;

        return xml.trim();
    }

    /**
     * Firma el XML usando el certificado digital (.p12) con XAdES-BES
     * Implementación usando librería 'ec-sri-invoice-signer'
     */
    public async signXML(xmlContent: string, config?: RestaurantConfig): Promise<string> {
        try {
            logger.info('[SRI] Signing XML...');

            let p12Base64: string;
            let signaturePassword: string;

            // 1. Try to load from database (encriptado)
            if (config?.sriCertificate) {
                logger.info('[SRI] Loading certificate from database');
                p12Base64 = certificateEncryption.decrypt(config.sriCertificate.certificateBase64);
                signaturePassword = certificateEncryption.decrypt(config.sriCertificate.passwordEncrypted);
            } else {
                // 2. Fallback to environment variables (legacy)
                logger.warn('[SRI] Certificate not found in database, falling back to environment variables');
                const signaturePath = process.env.SRI_SIGNATURE_PATH;
                const p12Base64Env = process.env.SRI_SIGNATURE_BASE64;
                const signaturePasswordEnv = process.env.SRI_SIGNATURE_PASSWORD;

                if ((!signaturePath && !p12Base64Env) || !signaturePasswordEnv) {
                    throw new Error('SRI Signature configuration missing. You must provide either SRI_SIGNATURE_PATH or SRI_SIGNATURE_BASE64, and SRI_SIGNATURE_PASSWORD.');
                }

                if (p12Base64Env) {
                    p12Base64 = p12Base64Env;
                } else {
                    // Read from file system
                    let p12Path = path.resolve(process.cwd(), signaturePath!);

                    // Smart Fallback for Render/Cloud Environments
                    if (!fs.existsSync(p12Path)) {
                        const filename = path.basename(signaturePath!);
                        const renderSecretPath = path.join('/etc/secrets', filename);

                        if (fs.existsSync(renderSecretPath)) {
                            logger.debug('[SRI] Using Render secret path for P12');
                            p12Path = renderSecretPath;
                        } else {
                            throw new Error(`Signature file not found at: ${p12Path} OR ${renderSecretPath}`);
                        }
                    }

                    const p12Buffer = fs.readFileSync(p12Path);
                    p12Base64 = p12Buffer.toString('base64');
                }

                signaturePassword = signaturePasswordEnv!;
            }

            // Convert base64 to buffer
            logger.debug('[SRI] Converting P12 from base64 to buffer');
            const p12Buffer = Buffer.from(p12Base64, 'base64');

            if (p12Buffer.length === 0) {
                throw new Error('The loaded P12 certificate is empty (0 bytes)!');
            }

            // Use appropriate signer based on document type
            const isCreditNote = xmlContent.includes('<notaCredito');
            let signedXml: string;

            try {
                signedXml = isCreditNote
                    ? signCreditNoteXml(xmlContent, p12Buffer, { pkcs12Password: signaturePassword })
                    : signInvoiceXml(xmlContent, p12Buffer, { pkcs12Password: signaturePassword });
            } catch (signingError: any) {
                logger.error('[SRI] Critical signing error', { error: signingError.message });
                // Detect common node-forge errors related to bad password or corrupt file
                if (signingError.message?.includes('Only 8, 16, 24, or 32 bits supported') ||
                    signingError.message?.includes('Too few bytes to parse') ||
                    signingError.message?.includes('Invalid password')) {
                    throw new Error('Error de Firma Electrónica: Es probable que la CONTRASEÑA sea incorrecta o el archivo .p12 esté CORRUPTO/DAÑADO. Verifique sus credenciales.');
                }
                throw signingError;
            }

            logger.info('[SRI] XML signed successfully');
            if (DEBUG_XML) {
                logger.debug('[SRI] Signed XML preview', { preview: signedXml.substring(0, 200) });
            }

            return signedXml;

        } catch (error: any) {
            logger.error('[SRI] Error signing XML', { error: error.message });
            throw error;
        }
    }

    /**
     * Envía el XML firmado al Web Service del SRI (Recepción)
     */
    public async sendToSRI(signedXml: string, isProduction: boolean = false): Promise<any> {
        const url = isProduction
            ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl'
            : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl';

        logger.info('[SRI] Sending to SRI', { env: isProduction ? 'PROD' : 'TEST' });

        // 1. Encode XML to Base64
        const xmlBase64 = Buffer.from(signedXml).toString('base64');

        // 2. Construct SOAP Envelope
        const soapEnvelope = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">
                <soapenv:Header/>
                <soapenv:Body>
                    <ec:validarComprobante>
                        <xml>${xmlBase64}</xml>
                    </ec:validarComprobante>
                </soapenv:Body>
            </soapenv:Envelope>
        `;

        try {
            // 3. Send Request
            const response = await axios.post(url, soapEnvelope, {
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': ''
                }
            });

            // 4. Parse Response (Basic Regex used for simplicity)
            const responseBody = response.data;
            const estadoMatch = responseBody.match(/<estado>(.*?)<\/estado>/);
            const estado = estadoMatch ? estadoMatch[1] : 'UNKNOWN';

            logger.info('[SRI] Reception response', { estado });

            // If "RECHAZADA", try to extract messages
            let mensajes: string[] = [];
            if (estado === 'DEVUELTA') {
                if (DEBUG_XML) logger.debug('[SRI] Full response', { body: responseBody });
                const mensajeMatch = responseBody.match(/<mensaje>(.*?)<\/mensaje>/);
                if (mensajeMatch) mensajes.push(mensajeMatch[1]);
            }

            // 5. Check for common errors in messages to provide better feedback
            if (mensajes.length > 0) {
                const combinedMessages = mensajes.join(' ');
                if (combinedMessages.includes('ERROR SECUENCIAL REGISTRADO')) {
                    throw new Error('Error de Secuencia: El número de factura ya existe en el SRI. Por favor, actualice el secuencial en la configuración o use el script de arreglo.');
                }
            }

            return {
                estado: estado, // RECIBIDA or DEVUELTA
                rawResponse: responseBody,
                mensajes: mensajes
            };

        } catch (error: any) {
            logger.error('[SRI] Error sending to SRI', { error: error.message });

            // Check if it's an axios error with response
            if (error.response) {
                logger.error('[SRI] Response error', { status: error.response.status });

                // IMPROVED ERROR HANDLING: Distinguish between SRI server errors and connectivity issues
                if (error.response.status === 500) {
                    // SRI Server Error (Internal Server Error)
                    const errorData = error.response.data;

                    // Check if it's a database error from SRI
                    if (errorData && (
                        errorData.includes('GenericJDBCException') ||
                        errorData.includes('could not execute statement') ||
                        errorData.includes('soap:Server')
                    )) {
                        throw new Error(
                            '⚠️ El servicio del SRI está experimentando problemas internos (Error 500). ' +
                            'Esto no es un problema de tu aplicación. Por favor, intenta nuevamente en 15-30 minutos. ' +
                            'Si el problema persiste, verifica el estado del SRI en https://www.sri.gob.ec'
                        );
                    }

                    // Generic 500 error
                    throw new Error(
                        '⚠️ El servidor del SRI está temporalmente no disponible (Error 500). ' +
                        'Por favor, intenta nuevamente en unos minutos.'
                    );
                }

                // Other HTTP errors (400, 401, 403, etc.)
                throw new Error(
                    `Error del SRI (HTTP ${error.response.status}): ${error.message}. ` +
                    'Verifica tu configuración o contacta con soporte técnico del SRI.'
                );
            }

            // Propagate specific errors (like the unexpected one we just threw)
            if (error.message.includes('Error de Secuencia')) {
                throw error;
            }

            // Network/Connectivity errors (no response from server)
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
                throw new Error(
                    '🔌 No se pudo conectar al servicio del SRI. ' +
                    'Verifica tu conexión a internet o que el SRI no esté en mantenimiento.'
                );
            }

            // Generic fallback
            throw new Error(
                'Failed to connect to SRI Web Service: ' + error.message
            );
        }
    }


    /**
     * Polls the SRI Authorization service until the document is authorized or a terminal state is reached.
     * @param accessKey Clave de acceso to check
     * @param isProduction Whether to use production or test environment
     * @param maxAttempts Maximum number of polling attempts (default 5)
     * @param delay Delay between attempts in ms (default 3000)
     */
    public async waitForAuthorization(accessKey: string, isProduction: boolean = false, maxAttempts: number = 5, delay: number = 2000): Promise<any> {
        let authResult;
        let attempts = 0;

        logger.info('[SRI] Starting authorization polling', { maxAttempts });

        while (attempts < maxAttempts) {
            attempts++;
            if (attempts > 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            logger.debug('[SRI] Authorization attempt', { attempt: attempts, maxAttempts });
            authResult = await this.authorizeInvoice(accessKey, isProduction);

            if (authResult.estado === 'AUTORIZADO') {
                logger.info('[SRI] Document authorized successfully');
                return authResult;
            }

            if (authResult.estado === 'DEVUELTA') {
                // Check if it's actually just processing hidden in a message
                const responseStr = JSON.stringify(authResult);
                if (responseStr.includes('EN PROCESAMIENTO') || responseStr.includes('CLAVE DE ACCESO EN PROCESAMIENTO')) {
                    logger.debug('[SRI] Status DEVUELTA but processing, retrying...');
                    continue;
                }
                logger.warn('[SRI] Document rejected by SRI');
                return authResult;
            }

            if (authResult.estado === 'UNKNOWN' || authResult.estado === 'EN PROCESO') {
                logger.debug('[SRI] Status pending, retrying', { estado: authResult.estado });
                continue;
            }
        }

        return authResult || { estado: 'TIMEOUT', mensajes: ['El SRI tardó demasiado en responder.'] };
    }

    /**
     * Consulta la Autorización del comprobante al SRI
     */
    public async authorizeInvoice(accessKey: string, isProduction: boolean = false): Promise<any> {
        const url = isProduction
            ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
            : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl';

        logger.info('[SRI] Authorizing with SRI', { env: isProduction ? 'PROD' : 'TEST' });

        const soapEnvelope = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">
                <soapenv:Header/>
                <soapenv:Body>
                    <ec:autorizacionComprobante>
                        <claveAccesoComprobante>${accessKey}</claveAccesoComprobante>
                    </ec:autorizacionComprobante>
                </soapenv:Body>
            </soapenv:Envelope>
        `;

        try {
            const response = await axios.post(url, soapEnvelope, {
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': ''
                }
            });

            const responseBody = response.data;
            const estadoMatch = responseBody.match(/<estado>(.*?)<\/estado>/);
            let estado = estadoMatch ? estadoMatch[1] : 'UNKNOWN';

            logger.info('[SRI] Authorization response', { estado });

            let numeroAutorizacion = '';
            let fechaAutorizacion = '';
            let comprobanteAutorizado = '';

            if (estado === 'AUTORIZADO') {
                const numMatch = responseBody.match(/<numeroAutorizacion>(.*?)<\/numeroAutorizacion>/);
                if (numMatch) numeroAutorizacion = numMatch[1];

                const fechaMatch = responseBody.match(/<fechaAutorizacion>(.*?)<\/fechaAutorizacion>/);
                if (fechaMatch) fechaAutorizacion = fechaMatch[1];

                // Extract the CDATA content of the authorized XML
                const compMatch = responseBody.match(/<comprobante><!\[CDATA\[([\s\S]*?)\]\]><\/comprobante>/);
                if (compMatch) comprobanteAutorizado = compMatch[1];
            } else {
                // Check if it's a "Not Found" or "Pending" case (0 authorizations)
                if (responseBody.includes('<numeroComprobantes>0</numeroComprobantes>')) {
                    logger.debug('[SRI] 0 authorizations returned, may be pending');
                    if (DEBUG_XML) logger.debug('[SRI] Response body', { body: responseBody });
                    estado = 'EN PROCESO'; // More friendly status
                } else {
                    if (DEBUG_XML) logger.debug('[SRI] Full auth response', { body: responseBody });
                }
            }

            return {
                estado,
                numeroAutorizacion,
                fechaAutorizacion,
                comprobanteAutorizado,
                rawResponse: responseBody
            };

        } catch (error: any) {
            this.auditLog('AUTHORIZE_INVOICE', `Error: ${error.message}`, 'FAIL');
            logger.error('[SRI] Error authorizing invoice', { error: error.message });
            throw new Error('Failed to connect to SRI Authorization Service');
        }

    }

    /**
     * Calcula el Dígito Verificador (Módulo 11) para la Clave de Acceso
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
     * @param existingAccessKey - (Opcional) Reutilizar clave existente en reintentos
     */
    public generateCreditNoteXML(creditNote: CreditNote, existingAccessKey?: string): string {
        logger.info('[SRI] Generating credit note XML');

        if (creditNote.info.ruc !== process.env.RUC) {
            logger.error('[SRI] RUC mismatch detected - will cause FIRMA INVALIDA error', {
                creditNoteRuc: creditNote.info.ruc,
                certificateRuc: process.env.RUC
            });
        }

        logger.debug('[SRI] Generating credit note for bill', { billId: creditNote.billId });

        let claveAcceso = existingAccessKey;

        if (!claveAcceso) {
            // 1. Generate Access Key (Clave de Acceso)
            const dateParts = creditNote.info.fechaEmision.split('/');
            const day = dateParts[0].padStart(2, '0');
            const month = dateParts[1].padStart(2, '0');
            const year = dateParts[2];
            const fechaSimple = `${day}${month}${year}`;

            // Generate random 8-digit numeric code (CRITICAL for unique access keys)
            const codigoNumerico = Math.floor(10000000 + Math.random() * 90000000).toString();

            const keyPayload =
                fechaSimple +
                '04' + // CodDoc (Nota de Crédito)
                creditNote.info.ruc +
                creditNote.info.ambiente +
                creditNote.info.estab +
                creditNote.info.ptoEmi +
                creditNote.info.secuencial +
                codigoNumerico +
                '1'; // Tipo Emision (Normal)

            const digitoVerificador = this.calculateMod11(keyPayload);
            claveAcceso = keyPayload + digitoVerificador;
        } else {
            logger.debug('[SRI] Using existing access key for credit note');
        }

        // Save key to credit note
        creditNote.info.claveAcceso = claveAcceso;
        logger.info('[SRI] Credit note access key ready', { keyPrefix: claveAcceso.substring(0, 10) });

        // FIX: Derive the tax percentage code dynamically from the first detail item
        // instead of hardcoding '4' (15%). This ensures correctness for all tax rates.
        const cnTaxCode = creditNote.detalles[0]?.impuestos[0]?.codigoPorcentaje ?? '4';

        // Build XML structure for Credit Note with PROPERLY ESCAPED TEXT
        const xml = `
<?xml version="1.0" encoding="UTF-8"?>
<notaCredito id="comprobante" version="1.1.0">
    <infoTributaria>
        <ambiente>${creditNote.info.ambiente}</ambiente>
        <tipoEmision>1</tipoEmision>
        <razonSocial>${this.escapeXML(creditNote.info.razonSocial)}</razonSocial>
        ${creditNote.info.nombreComercial ? `<nombreComercial>${this.escapeXML(creditNote.info.nombreComercial)}</nombreComercial>` : ''}
        <ruc>${creditNote.info.ruc}</ruc>
        <claveAcceso>${claveAcceso}</claveAcceso>
        <codDoc>04</codDoc>
        <estab>${creditNote.info.estab}</estab>
        <ptoEmi>${creditNote.info.ptoEmi}</ptoEmi>
        <secuencial>${creditNote.info.secuencial}</secuencial>
        <dirMatriz>${this.escapeXML(creditNote.info.dirMatriz)}</dirMatriz>
        ${(creditNote.info.regime && creditNote.info.regime.includes('RIMPE')) ? `<regimenRimpe>CONTRIBUYENTE RÉGIMEN RIMPE</regimenRimpe>` : ''}
        ${creditNote.info.agenteRetencion ? `<agenteRetencion>${creditNote.info.agenteRetencion}</agenteRetencion>` : ''}
        ${creditNote.info.contribuyenteEspecial ? `<contribuyenteEspecial>${creditNote.info.contribuyenteEspecial}</contribuyenteEspecial>` : ''}
    </infoTributaria>
    <infoNotaCredito>
        <fechaEmision>${creditNote.info.fechaEmision}</fechaEmision>
        <dirEstablecimiento>${this.escapeXML(creditNote.info.dirEstablecimiento || creditNote.info.dirMatriz)}</dirEstablecimiento>
        <tipoIdentificacionComprador>${creditNote.info.tipoIdentificacionComprador}</tipoIdentificacionComprador>
        <razonSocialComprador>${this.escapeXML(creditNote.info.razonSocialComprador)}</razonSocialComprador>
        <identificacionComprador>${creditNote.info.identificacionComprador}</identificacionComprador>
        <obligadoContabilidad>${creditNote.info.obligadoContabilidad}</obligadoContabilidad>
        <codDocModificado>${creditNote.info.codDocModificado}</codDocModificado>
        <numDocModificado>${creditNote.info.numDocModificado}</numDocModificado>
        <fechaEmisionDocSustento>${creditNote.info.fechaEmisionDocSustento}</fechaEmisionDocSustento>
        <totalSinImpuestos>${creditNote.info.totalSinImpuestos.toFixed(2)}</totalSinImpuestos>
        <valorModificacion>${creditNote.info.importeTotal.toFixed(2)}</valorModificacion>
        <moneda>${creditNote.info.moneda}</moneda>
        <totalConImpuestos>
            ${this.groupTaxes(creditNote.detalles).map((tax: any) => `
            <totalImpuesto>
                <codigo>${tax.codigo}</codigo>
                <codigoPorcentaje>${tax.codigoPorcentaje}</codigoPorcentaje>
                <baseImponible>${tax.baseImponible.toFixed(2)}</baseImponible>
                <valor>${tax.valor.toFixed(2)}</valor>
            </totalImpuesto>`).join('')}
        </totalConImpuestos>
        <motivo>${this.escapeXML(creditNote.info.motivo)}</motivo>
    </infoNotaCredito>
    <detalles>
        ${creditNote.detalles.map((d: CreditNoteDetail) => {
            const imp = d.impuestos[0];
            return `
        <detalle>
            <codigoInterno>${this.escapeXML(d.codigoPrincipal)}</codigoInterno>
            <descripcion>${this.escapeXML(d.descripcion)}</descripcion>
            <cantidad>${d.cantidad}</cantidad>
            <precioUnitario>${d.precioUnitario}</precioUnitario>
            <descuento>0.00</descuento>
            <precioTotalSinImpuesto>${d.precioTotalSinImpuesto.toFixed(2)}</precioTotalSinImpuesto>
            <impuestos>
                <impuesto>
                    <codigo>${imp.codigo}</codigo>
                    <codigoPorcentaje>${imp.codigoPorcentaje}</codigoPorcentaje>
                    <tarifa>${imp.tarifa}</tarifa>
                    <baseImponible>${imp.baseImponible.toFixed(2)}</baseImponible>
                    <valor>${imp.valor.toFixed(2)}</valor>
                </impuesto>
            </impuestos>
        </detalle>`;
        }).join('')}
    </detalles>
    <infoAdicional>
        ${creditNote.info.emailComprador ? `<campoAdicional nombre="Email">${this.escapeXML(creditNote.info.emailComprador)}</campoAdicional>` : ''}
        ${creditNote.info.contribuyenteEspecial ? `<campoAdicional nombre="Contribuyente Especial">${creditNote.info.contribuyenteEspecial}</campoAdicional>` : ''}
        ${(creditNote.info.regime && creditNote.info.regime.includes('RIMPE')) ? `<campoAdicional nombre="Régimen">Contribuyente Régimen RIMPE</campoAdicional>` : ''}
        ${creditNote.info.agenteRetencion ? `<campoAdicional nombre="Agente de Retención">Resolución No. ${creditNote.info.agenteRetencion}</campoAdicional>` : ''}
    </infoAdicional>
</notaCredito>`;

        if (DEBUG_XML) logger.debug('[SRI] Generated credit note XML', { xmlLength: xml.length });

        return xml.trim();
    }

    /**
     * Envía el XML de Nota de Crédito firmado al Web Service del SRI (Recepción)
     */
    public async sendCreditNoteToSRI(signedXml: string, isProduction: boolean = false): Promise<any> {
        const url = isProduction
            ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl'
            : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl';

        logger.info('[SRI] Sending credit note to SRI', { env: isProduction ? 'PROD' : 'TEST' });

        // 1. Encode XML to Base64
        const xmlBase64 = Buffer.from(signedXml).toString('base64');

        // 2. Construct SOAP Envelope (same as invoice)
        const soapEnvelope = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">
                <soapenv:Header/>
                <soapenv:Body>
                    <ec:validarComprobante>
                        <xml>${xmlBase64}</xml>
                    </ec:validarComprobante>
                </soapenv:Body>
            </soapenv:Envelope>
        `;

        try {
            // 3. Send Request
            const response = await axios.post(url, soapEnvelope, {
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': ''
                }
            });

            // 4. Parse Response
            const responseBody = response.data;
            const estadoMatch = responseBody.match(/<estado>(.*?)<\/estado>/);
            const estado = estadoMatch ? estadoMatch[1] : 'UNKNOWN';

            logger.info('[SRI] Credit note reception response', { estado });

            // Extract messages if DEVUELTA
            let mensajes = [];
            if (estado === 'DEVUELTA') {
                if (DEBUG_XML) logger.debug('[SRI] Full SRI response', { body: responseBody });
                const mensajeMatch = responseBody.match(/<mensaje>(.*?)<\/mensaje>/);
                if (mensajeMatch) mensajes.push(mensajeMatch[1]);
            }

            // Check for common errors in messages
            if (mensajes.length > 0) {
                const combinedMessages = mensajes.join(' ');
                if (combinedMessages.includes('ERROR SECUENCIAL REGISTRADO')) {
                    throw new Error('Error de Secuencia: El número de NOTA DE CRÉDITO ya existe en el SRI. Por favor, actualice el secuencial en la configuración.');
                }
            }

            return {
                estado: estado, // RECIBIDA or DEVUELTA
                rawResponse: responseBody,
                mensajes: mensajes
            };

        } catch (error: any) {
            logger.error('[SRI] Error sending credit note', { error: error.message });

            if (error.response) {
                logger.error('[SRI] Credit note response error', { status: error.response.status });

                // IMPROVED ERROR HANDLING: Same as invoice sending
                if (error.response.status === 500) {
                    const errorData = error.response.data;

                    if (errorData && (
                        errorData.includes('GenericJDBCException') ||
                        errorData.includes('could not execute statement') ||
                        errorData.includes('soap:Server')
                    )) {
                        throw new Error(
                            '⚠️ El servicio del SRI está experimentando problemas internos (Error 500). ' +
                            'Esto no es un problema de tu aplicación. Por favor, intenta nuevamente en 15-30 minutos. ' +
                            'Si el problema persiste, verifica el estado del SRI en https://www.sri.gob.ec'
                        );
                    }

                    throw new Error(
                        '⚠️ El servidor del SRI está temporalmente no disponible (Error 500). ' +
                        'Por favor, intenta nuevamente en unos minutos.'
                    );
                }

                throw new Error(
                    `Error del SRI (HTTP ${error.response.status}): ${error.message}. ` +
                    'Verifica tu configuración o contacta con soporte técnico del SRI.'
                );
            }

            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
                throw new Error(
                    '🔌 No se pudo conectar al servicio del SRI. ' +
                    'Verifica tu conexión a internet o que el SRI no esté en mantenimiento.'
                );
            }

            throw new Error('Failed to connect to SRI Web Service for Credit Note: ' + error.message);
        }
    }

    /**
     * Consulta la Autorización de una Nota de Crédito al SRI
     */
    public async authorizeCreditNote(accessKey: string, isProduction: boolean = false): Promise<any> {
        const url = isProduction
            ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
            : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl';

        logger.info('[SRI] Authorizing credit note', { env: isProduction ? 'PROD' : 'TEST' });

        const soapEnvelope = `
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">
                <soapenv:Header/>
                <soapenv:Body>
                    <ec:autorizacionComprobante>
                        <claveAccesoComprobante>${accessKey}</claveAccesoComprobante>
                    </ec:autorizacionComprobante>
                </soapenv:Body>
            </soapenv:Envelope>
        `;

        try {
            const response = await axios.post(url, soapEnvelope, {
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': ''
                }
            });

            const responseBody = response.data;
            const estadoMatch = responseBody.match(/<estado>(.*?)<\/estado>/);
            let estado = estadoMatch ? estadoMatch[1] : 'UNKNOWN';

            logger.info('[SRI] Credit note authorization response', { estado });

            let numeroAutorizacion = '';
            let fechaAutorizacion = '';
            let comprobanteAutorizado = '';

            if (estado === 'AUTORIZADO') {
                const numMatch = responseBody.match(/<numeroAutorizacion>(.*?)<\/numeroAutorizacion>/);
                if (numMatch) numeroAutorizacion = numMatch[1];

                const fechaMatch = responseBody.match(/<fechaAutorizacion>(.*?)<\/fechaAutorizacion>/);
                if (fechaMatch) fechaAutorizacion = fechaMatch[1];

                const compMatch = responseBody.match(/<comprobante><!\[CDATA\[([\s\S]*?)\]\]><\/comprobante>/);
                if (compMatch) comprobanteAutorizado = compMatch[1];
            } else {
                // Extract error messages for rejected credit notes
                const mensajeRegex = /<mensaje>(.*?)<\/mensaje>/g;
                let match;
                const mensajes: string[] = [];
                while ((match = mensajeRegex.exec(responseBody)) !== null) {
                    mensajes.push(match[1]);
                }
                if (mensajes.length > 0) {
                    logger.warn('[SRI] Credit note rejected', { mensajes });
                }
                if (DEBUG_XML) logger.debug('[SRI] Full rejection response', { body: responseBody });

                if (responseBody.includes('<numeroComprobantes>0</numeroComprobantes>')) {
                    estado = 'EN PROCESO';
                }
            }

            return {
                estado,
                numeroAutorizacion,
                fechaAutorizacion,
                comprobanteAutorizado,
                rawResponse: responseBody
            };

        } catch (error: any) {
            logger.error('[SRI] Error authorizing credit note', { error: error.message });
            throw new Error('Failed to connect to SRI Authorization Service for Credit Note');
        }
    }

    /**
     * Helper para agrupar impuestos por código y porcentaje (SRI 2026 Compliance)
     * Requerido cuando una factura tiene items con diferentes tarifas de IVA (ej: 0% y 15%)
     */
    private groupTaxes(detalles: any[]): any[] {
        const taxes: Record<string, any> = {};

        detalles.forEach(d => {
            d.impuestos.forEach((imp: any) => {
                const key = `${imp.codigo}-${imp.codigoPorcentaje}`;
                if (!taxes[key]) {
                    taxes[key] = {
                        codigo: imp.codigo,
                        codigoPorcentaje: imp.codigoPorcentaje,
                        baseImponible: 0,
                        valor: 0
                    };
                }
                taxes[key].baseImponible += imp.baseImponible;
                taxes[key].valor += imp.valor;
            });
        });

        return Object.values(taxes);
    }
}
