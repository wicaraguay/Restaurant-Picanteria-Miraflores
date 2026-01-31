import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { Invoice, InvoiceDetail } from '../../domain/billing/invoice';
import { CreditNote, CreditNoteDetail } from '../../domain/billing/creditNote';
import { signInvoiceXml, signCreditNoteXml } from 'ec-sri-invoice-signer';

/**
 * Servicio para gestionar la comunicación con el SRI
 * - Generación de XML
 * - Firma Electrónica (XAdES-BES)
 * - Envío y Autorización
 */
export class SRIService {

    /**
     * Helper para comparar estructuras de XML (diagnóstico)
     */
    private logXMLComparison(label1: string, xml1: string, label2: string, xml2: string) {
        console.log('\n==============================================');
        console.log(`XML COMPARISON: ${label1} vs ${label2}`);
        console.log('==============================================');
        console.log(`${label1} length: ${xml1.length} chars`);
        console.log(`${label2} length: ${xml2.length} chars`);
        console.log(`First 300 chars of ${label1}:`);
        console.log(xml1.substring(0, 300));
        console.log(`\nFirst 300 chars of ${label2}:`);
        console.log(xml2.substring(0, 300));
        console.log('==============================================\n');
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
     * Formato: [ISO_TIMESTAMP] [SRI-AUDIT] [OPERATION] Detail - Status: SUCCESS/FAIL/INFO
     */
    private auditLog(operation: string, detail: string, status: 'SUCCESS' | 'FAIL' | 'INFO' = 'INFO'): void {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [SRI-AUDIT] [${operation}] ${detail} - Status: ${status}`);
    }

    /**
     * Genera el XML en formato string a partir del modelo de Factura
     */
    public generateInvoiceXML(invoice: Invoice): string {
        console.log('Generating XML for invoice', invoice.info.secuencial);

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
        const claveAcceso = keyPayload + digitoVerificador;

        // Save generated key to invoice
        invoice.info.claveAcceso = claveAcceso;
        console.log('Generated Access Key:', claveAcceso);

        // Mock XML structure for now (Reused from previous implementation)
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
            <totalImpuesto>
                <codigo>2</codigo>
                <codigoPorcentaje>4</codigoPorcentaje>
                <baseImponible>${invoice.info.totalSinImpuestos.toFixed(2)}</baseImponible>
                <valor>${(invoice.info.importeTotal - invoice.info.totalSinImpuestos).toFixed(2)}</valor>
            </totalImpuesto>
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
            const imp = d.impuestos[0]; // Assuming single tax for now
            return `
        <detalle>
            <codigoPrincipal>${this.escapeXML(d.codigoPrincipal)}</codigoPrincipal>
            <descripcion>${this.escapeXML(d.descripcion)}</descripcion>
            <cantidad>${d.cantidad}</cantidad>
            <precioUnitario>${d.precioUnitario}</precioUnitario>
            <descuento>0.00</descuento>
            <precioTotalSinImpuesto>${d.precioTotalSinImpuesto}</precioTotalSinImpuesto>
            <impuestos>
                <impuesto>
                    <codigo>${imp.codigo}</codigo>
                    <codigoPorcentaje>${imp.codigoPorcentaje}</codigoPorcentaje>
                    <tarifa>${imp.tarifa}</tarifa>
                    <baseImponible>${imp.baseImponible}</baseImponible>
                    <valor>${imp.valor}</valor>
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
    </infoAdicional>
</factura>`;



        return xml.trim();
    }

    /**
     * Firma el XML usando el certificado digital (.p12) con XAdES-BES
     * Implementación usando librería 'ec-sri-invoice-signer'
     */
    public async signXML(xmlContent: string): Promise<string> {
        try {
            console.log('[SRIService] Signing XML with ec-sri-invoice-signer...');

            const signaturePath = process.env.SRI_SIGNATURE_PATH;
            const signaturePassword = process.env.SRI_SIGNATURE_PASSWORD;

            if (!signaturePath || !signaturePassword) {
                throw new Error('SRI Signature configuration missing (.env)');
            }

            let p12Path = path.resolve(process.cwd(), signaturePath);

            // Smart Fallback for Render/Cloud Environments
            // If the configured path (relative) doesn't exist, check the standard /etc/secrets/ directory used by Render Secret Files
            if (!fs.existsSync(p12Path)) {
                const filename = path.basename(signaturePath);
                const renderSecretPath = path.join('/etc/secrets', filename);

                if (fs.existsSync(renderSecretPath)) {
                    console.log(`[SRIService] Configured path (${p12Path}) not found. Using Render Secret at: ${renderSecretPath}`);
                    p12Path = renderSecretPath;
                } else {
                    // Only throw if NEITHER exists
                    throw new Error(`Signature file not found at: ${p12Path} OR ${renderSecretPath} (Ensure the file is uploaded to Render Secret Files)`);
                }
            }

            const p12Buffer = fs.readFileSync(p12Path);
            console.log(`[SRIService] P12 file loaded from ${p12Path}. Size: ${p12Buffer.length} bytes`);

            if (p12Buffer.length === 0) {
                throw new Error(`The P12 file at ${p12Path} is empty (0 bytes)! Please re-upload it.`);
            }

            // Use appropriate signer based on document type
            const isCreditNote = xmlContent.includes('<notaCredito');
            let signedXml: string;

            try {
                signedXml = isCreditNote
                    ? signCreditNoteXml(xmlContent, p12Buffer, { pkcs12Password: signaturePassword })
                    : signInvoiceXml(xmlContent, p12Buffer, { pkcs12Password: signaturePassword });
            } catch (signingError: any) {
                console.error('[SRIService] Critical Signing Error:', signingError);
                // Detect common node-forge errors related to bad password or corrupt file
                if (signingError.message?.includes('Only 8, 16, 24, or 32 bits supported') ||
                    signingError.message?.includes('Too few bytes to parse') ||
                    signingError.message?.includes('Invalid password')) {
                    throw new Error('Error de Firma Electrónica: Es probable que la CONTRASEÑA sea incorrecta o el archivo .p12 esté CORRUPTO/DAÑADO. Verifique sus credenciales.');
                }
                throw signingError;
            }

            console.log('[SRIService] XML signed successfully');



            console.log('==============================================');
            console.log('DEBUG: Signed XML (first 500 chars):');
            console.log(signedXml.substring(0, 500));
            console.log('==============================================');

            return signedXml;

        } catch (error) {
            console.error('[SRIService] Error signing XML with ec-sri-invoice-signer:', error);
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

        console.log(`Sending to SRI (${isProduction ? 'PROD' : 'TEST'}):`, url);

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

            console.log('================================================================');
            console.log(`📡 SRI RECEPCIÓN: ${estado}`);
            console.log('================================================================');

            // If "RECHAZADA", try to extract messages
            let mensajes = [];
            if (estado === 'DEVUELTA') {
                console.log('Full SRI Response (Debug):', responseBody); // Debug Dump
                const mensajeMatch = responseBody.match(/<mensaje>(.*?)<\/mensaje>/);
                if (mensajeMatch) mensajes.push(mensajeMatch[1]);
            }

            return {
                estado: estado, // RECIBIDA or DEVUELTA
                rawResponse: responseBody,
                mensajes: mensajes
            };

        } catch (error: any) {
            console.error('Error sending to SRI:', error.message);
            // Check if it's an axios error with response
            if (error.response) {
                console.error('SRI Error Data:', error.response.data);
            }
            throw new Error('Failed to connect to SRI Web Service');
        }
    }

    /**
     * Consulta la Autorización del comprobante al SRI
     */
    public async authorizeInvoice(accessKey: string, isProduction: boolean = false): Promise<any> {
        const url = isProduction
            ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
            : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl';

        console.log(`Authorizing with SRI (${isProduction ? 'PROD' : 'TEST'}):`, url);

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

            console.log('================================================================');
            console.log(`🔐 SRI AUTORIZACIÓN: ${estado}`);
            console.log('================================================================');

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
                    console.log('SRI returned 0 authorizations. Invoice might be pending or rejected.');
                    console.log('DEBUG SRI BODY:', responseBody); // Force log of body to see potential errors
                    estado = 'EN PROCESO'; // More friendly status
                } else {
                    console.log('Full Authorization Response (Debug):', responseBody);
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
            console.error('Error authorizing invoice:', error.message);
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
     */
    public generateCreditNoteXML(creditNote: CreditNote): string {
        console.log('[SRIService] Generating Credit Note XML...');
        console.log('[SRIService] Credit Note RUC:', creditNote.info.ruc);
        console.log('[SRIService] Certificate should be for RUC:', process.env.RUC);

        if (creditNote.info.ruc !== process.env.RUC) {
            console.error('❌ RUC MISMATCH DETECTED!');
            console.error(`Credit Note RUC: ${creditNote.info.ruc}`);
            console.error(`Certificate RUC: ${process.env.RUC}`);
            console.error('This will cause FIRMA INVALIDA error!');
        }

        console.log('Generating Credit Note XML for bill', creditNote.billId);

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
        const claveAcceso = keyPayload + digitoVerificador;

        // Save generated key to credit note
        creditNote.info.claveAcceso = claveAcceso;
        console.log('Generated Credit Note Access Key:', claveAcceso);

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
            <totalImpuesto>
                <codigo>2</codigo>
                <codigoPorcentaje>4</codigoPorcentaje>
                <baseImponible>${creditNote.info.totalSinImpuestos.toFixed(2)}</baseImponible>
                <valor>${(creditNote.info.importeTotal - creditNote.info.totalSinImpuestos).toFixed(2)}</valor>
            </totalImpuesto>
        </totalConImpuestos>
        <motivo>${this.escapeXML(creditNote.info.motivo)}</motivo>
    </infoNotaCredito>
    <detalles>
        ${creditNote.detalles.map((d: CreditNoteDetail) => {
            const imp = d.impuestos[0]; // Assuming single tax for now
            return `
        <detalle>
            <codigoInterno>${this.escapeXML(d.codigoPrincipal)}</codigoInterno>
            <descripcion>${this.escapeXML(d.descripcion)}</descripcion>
            <cantidad>${d.cantidad}</cantidad>
            <precioUnitario>${d.precioUnitario}</precioUnitario>
            <descuento>0.00</descuento>
            <precioTotalSinImpuesto>${d.precioTotalSinImpuesto}</precioTotalSinImpuesto>
            <impuestos>
                <impuesto>
                    <codigo>${imp.codigo}</codigo>
                    <codigoPorcentaje>${imp.codigoPorcentaje}</codigoPorcentaje>
                    <tarifa>${imp.tarifa}</tarifa>
                    <baseImponible>${imp.baseImponible}</baseImponible>
                    <valor>${imp.valor}</valor>
                </impuesto>
            </impuestos>
        </detalle>`;
        }).join('')}
    </detalles>
    <infoAdicional>
        ${creditNote.info.emailComprador ? `<campoAdicional nombre="Email">${this.escapeXML(creditNote.info.emailComprador)}</campoAdicional>` : ''}
        ${creditNote.info.contribuyenteEspecial ? `<campoAdicional nombre="Contribuyente Especial">${creditNote.info.contribuyenteEspecial}</campoAdicional>` : ''}
    </infoAdicional>
</notaCredito>`;

        console.log('==============================================');
        console.log('DEBUG: Generated Credit Note XML:');
        console.log(xml);
        console.log('==============================================');

        return xml.trim();
    }

    /**
     * Envía el XML de Nota de Crédito firmado al Web Service del SRI (Recepción)
     */
    public async sendCreditNoteToSRI(signedXml: string, isProduction: boolean = false): Promise<any> {
        const url = isProduction
            ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl'
            : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl';

        console.log(`Sending Credit Note to SRI (${isProduction ? 'PROD' : 'TEST'}):`, url);

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

            console.log('================================================================');
            console.log(`📡 SRI CREDIT NOTE RECEPCIÓN: ${estado}`);
            console.log('================================================================');

            // Extract messages if DEVUELTA
            let mensajes = [];
            if (estado === 'DEVUELTA') {
                console.log('Full SRI Response (Debug):', responseBody);
                const mensajeMatch = responseBody.match(/<mensaje>(.*?)<\/mensaje>/);
                if (mensajeMatch) mensajes.push(mensajeMatch[1]);
            }

            return {
                estado: estado, // RECIBIDA or DEVUELTA
                rawResponse: responseBody,
                mensajes: mensajes
            };

        } catch (error: any) {
            console.error('Error sending Credit Note to SRI:', error.message);
            if (error.response) {
                console.error('SRI Error Data:', error.response.data);
            }
            throw new Error('Failed to connect to SRI Web Service for Credit Note');
        }
    }

    /**
     * Consulta la Autorización de una Nota de Crédito al SRI
     */
    public async authorizeCreditNote(accessKey: string, isProduction: boolean = false): Promise<any> {
        const url = isProduction
            ? 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl'
            : 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl';

        console.log(`Authorizing Credit Note with SRI (${isProduction ? 'PROD' : 'TEST'}):`, url);

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

            console.log('================================================================');
            console.log(`🔐 SRI CREDIT NOTE AUTORIZACIÓN: ${estado}`);
            console.log('================================================================');

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
                // ENHANCED DEBUGGING FOR REJECTED CREDIT NOTES
                console.log('==============================================');
                console.log('❌ CREDIT NOTE REJECTED BY SRI');
                console.log('==============================================');
                console.log('Full SRI Authorization Response:');
                console.log(responseBody);
                console.log('==============================================');

                // Try to extract error messages
                const mensajeRegex = /<mensaje>(.*?)<\/mensaje>/g;
                let match;
                const mensajes = [];
                while ((match = mensajeRegex.exec(responseBody)) !== null) {
                    mensajes.push(match[1]);
                }
                if (mensajes.length > 0) {
                    console.log('SRI Error Messages:');
                    mensajes.forEach((msg, i) => console.log(`  ${i + 1}. ${msg}`));
                }

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
            console.error('Error authorizing Credit Note:', error.message);
            throw new Error('Failed to connect to SRI Authorization Service for Credit Note');
        }
    }
}
