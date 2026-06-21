import { Invoice, InvoiceDetail } from '../../../domain/billing/invoice';
import { CreditNote, CreditNoteDetail } from '../../../domain/billing/creditNote';
import { logger } from '../../utils/Logger';
import { AccessKeyGenerator } from './AccessKeyGenerator';
import { TaxGroup } from './types';

const DEBUG_XML = process.env.NODE_ENV === 'development';

/**
 * Responsible for generating XML documents for invoices and credit notes
 * Handles XML escaping, tax grouping, and structure compliance
 */
export class XMLGenerator {
    private accessKeyGenerator: AccessKeyGenerator;

    constructor() {
        this.accessKeyGenerator = new AccessKeyGenerator();
    }

    /**
     * Generates invoice XML in SRI format
     * @param invoice Invoice model
     * @param existingAccessKey Optional - use existing key for retries
     * @returns XML string
     */
    public generateInvoiceXML(invoice: Invoice, existingAccessKey?: string): string {
        logger.info('[XMLGen] Generating invoice XML', { secuencial: invoice.info.secuencial });

        let claveAcceso = existingAccessKey;

        if (!claveAcceso) {
            claveAcceso = this.accessKeyGenerator.generateAccessKey({
                fechaEmision: invoice.info.fechaEmision,
                codDoc: '01',
                ruc: invoice.info.ruc,
                ambiente: invoice.info.ambiente,
                estab: invoice.info.estab,
                ptoEmi: invoice.info.ptoEmi,
                secuencial: invoice.info.secuencial,
                codigoNumerico: this.accessKeyGenerator.generateRandomCode()
            });
        } else {
            logger.debug('[XMLGen] Using existing access key');
        }

        invoice.info.claveAcceso = claveAcceso;

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
            ${this.groupTaxes(invoice.detalles).map((tax: TaxGroup) => `
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
     * Generates credit note XML in SRI format
     * @param creditNote Credit note model
     * @param existingAccessKey Optional - use existing key for retries
     * @returns XML string
     */
    public generateCreditNoteXML(creditNote: CreditNote, existingAccessKey?: string): string {
        logger.info('[XMLGen] Generating credit note XML');

        if (creditNote.info.ruc !== process.env.RUC) {
            logger.error('[XMLGen] RUC mismatch - will cause FIRMA INVALIDA', {
                creditNoteRuc: creditNote.info.ruc,
                certificateRuc: process.env.RUC
            });
        }

        let claveAcceso = existingAccessKey;

        if (!claveAcceso) {
            claveAcceso = this.accessKeyGenerator.generateAccessKey({
                fechaEmision: creditNote.info.fechaEmision,
                codDoc: '04',
                ruc: creditNote.info.ruc,
                ambiente: creditNote.info.ambiente,
                estab: creditNote.info.estab,
                ptoEmi: creditNote.info.ptoEmi,
                secuencial: creditNote.info.secuencial,
                codigoNumerico: this.accessKeyGenerator.generateRandomCode()
            });
        } else {
            logger.debug('[XMLGen] Using existing access key for credit note');
        }

        creditNote.info.claveAcceso = claveAcceso;

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
            ${this.groupTaxes(creditNote.detalles).map((tax: TaxGroup) => `
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

        if (DEBUG_XML) logger.debug('[XMLGen] Generated credit note XML', { xmlLength: xml.length });

        return xml.trim();
    }

    /**
     * Escapes and sanitizes text for SRI-compatible XML
     * - Converts accents to ASCII
     * - Escapes XML special characters
     * - Removes emojis and non-BMP characters (FIX M-07)
     */
    public escapeXML(text: string): string {
        if (!text) return '';

        // 1. Normalize accented characters to ASCII equivalents
        const normalized = text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        // FIX M-07: Remove emojis and other non-BMP characters
        const noEmoji = normalized
            .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
            .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols & Pictographs
            .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport & Map
            .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical Symbols
            .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric Shapes Extended
            .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows-C
            .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols & Pictographs
            .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
            .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols & Pictographs Ext-A
            .replace(/[\u{1FB00}-\u{1FBFF}]/gu, '') // Symbols for Legacy Computing
            .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols (sun, cloud, etc)
            .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
            .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation Selectors
            .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Regional Indicators (flags)

        // 2. Escape XML special characters
        const escaped = noEmoji
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
     * Groups taxes by code and percentage
     * Required when invoice has items with different tax rates (e.g., 0% and 15%)
     */
    public groupTaxes(detalles: any[]): TaxGroup[] {
        const taxes: Record<string, TaxGroup> = {};

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
