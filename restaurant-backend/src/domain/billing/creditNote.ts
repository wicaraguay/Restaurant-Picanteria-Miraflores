/**
 * Modelos de Dominio para Notas de Crédito Electrónicas SRI - Ecuador
 * Basado en la Ficha Técnica de Comprobantes Electrónicos Offline v2.21
 * Código de Documento: 04 (Nota de Crédito)
 */

export type CreditNoteReason =
    | '01' // Devolución de mercancías
    | '02' // Descuento concedido
    | '03' // Devolución por comprobante anulado
    | '04' // Descuento por comprobante anulado
    | '05' // Error en el RUC
    | '06' // Error en descripción
    | '07'; // Corrección de precio

export interface CreditNoteReasonDetails {
    code: CreditNoteReason;
    description: string;
}

export const CREDIT_NOTE_REASONS: Record<CreditNoteReason, string> = {
    '01': 'Devolución de mercancías',
    '02': 'Descuento concedido',
    '03': 'Devolución por comprobante anulado',
    '04': 'Descuento por comprobante anulado',
    '05': 'Error en el RUC',
    '06': 'Error en descripción',
    '07': 'Corrección de precio'
};

export interface CreditNoteDetail {
    codigoPrincipal: string; // ID del producto
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    precioTotalSinImpuesto: number;
    impuestos: {
        codigo: string; // '2' para IVA
        codigoPorcentaje: string; // '0', '2', '3', '4' (tarifas)
        tarifa: number;
        baseImponible: number;
        valor: number;
    }[];
}

export interface CreditNoteInfo {
    // Info Tributaria
    ambiente: '1' | '2'; // 1: Pruebas, 2: Producción
    tipoEmision: '1'; // 1: Emisión Normal
    razonSocial: string;
    nombreComercial?: string;
    ruc: string;
    claveAcceso?: string; // Generado automáticamente
    codDoc: '04'; // 04: Nota de Crédito
    estab: string; // 001
    ptoEmi: string; // 001
    secuencial: string; // 9 dígitos
    dirMatriz: string;
    contribuyenteEspecial?: string; // Número de resolución

    // Info Nota de Crédito
    fechaEmision: string; // dd/mm/aaaa
    dirEstablecimiento?: string;

    // Documento Modificado (Factura Original)
    codDocModificado: '01'; // 01: Factura
    numDocModificado: string; // Número de la factura original (001-001-000000001)
    fechaEmisionDocSustento: string; // Fecha de emisión de la factura original

    // Cliente
    tipoIdentificacionComprador: '04' | '05' | '06' | '07';
    razonSocialComprador: string;
    identificacionComprador: string;

    // Motivo
    motivo: string; // Descripción del motivo

    // Totales
    totalSinImpuestos: number;
    totalDescuento: number;
    totalImpuestos: {
        codigo: string;
        codigoPorcentaje: string;
        tarifa: number;
        baseImponible: number;
        valor: number;
    }[];
    importeTotal: number;
    moneda: 'DOLAR';

    // Additional Fields
    obligadoContabilidad: 'SI' | 'NO';
    emailComprador?: string;
    logoUrl?: string;
    emailMatriz?: string;
}

export interface CreditNote {
    info: CreditNoteInfo;
    detalles: CreditNoteDetail[];

    // Campos adicionales para control interno
    billId: string; // ID de la factura original
    orderId?: string; // ID de la orden (si aplica)
    status: 'PENDING' | 'SIGNED' | 'SENT' | 'AUTHORIZED' | 'REJECTED';
    authorizationDate?: string;
    creationDate?: Date;
    sriResponse?: any;
}
