/**
 * Modelos de Dominio para Facturación Electrónica SRI - Ecuador
 * Basado en la Ficha Técnica de Comprobantes Electrónicos Offline v2.21
 */

export interface TaxValue {
    codigo: string; // '2' para IVA
    codigoPorcentaje: string; // '0', '2', '3', '4' (tarifas)
    tarifa: number;
    baseImponible: number;
    valor: number;
}

export interface InvoiceDetail {
    codigoPrincipal: string; // ID del producto
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    precioTotalSinImpuesto: number;
    impuestos: TaxValue[];
}

export interface InvoiceInfo {
    // Info Tributaria
    ambiente: '1' | '2'; // 1: Pruebas, 2: Producción
    tipoEmision: '1'; // 1: Emisión Normal
    razonSocial: string;
    nombreComercial?: string;
    ruc: string;
    claveAcceso?: string; // Generado automáticamente
    codDoc: '01'; // 01: Factura
    estab: string; // 001
    ptoEmi: string; // 001
    secuencial: string; // 9 dígitos
    dirMatriz: string;
    contribuyenteEspecial?: string; // Número de resolución (ej: "12345")

    // Info Factura
    fechaEmision: string; // dd/mm/aaaa
    dirEstablecimiento?: string;
    obligadoContabilidad: 'SI' | 'NO';
    tipoIdentificacionComprador: '04' | '05' | '06' | '07'; // 04: RUC, 05: Cedula, 06: Pasaporte, 07: Consumidor Final
    razonSocialComprador: string;
    identificacionComprador: string;
    direccionComprador?: string;
    totalSinImpuestos: number;
    totalDescuento: number;
    totalImpuestos: TaxValue[]; // Resumen de impuestos
    importeTotal: number;
    moneda: 'DOLAR';

    // Additional Display Fields (Not strictly for XML mapping but needed for PDF/Email)
    emailComprador?: string;
    telefonoComprador?: string;
    formaPago?: string; // '01', '19', '20', etc.
    logoUrl?: string;
    tasaIva?: string; // e.g. "15"
    emailMatriz?: string; // Business email
}

export interface Invoice {
    info: InvoiceInfo;
    detalles: InvoiceDetail[];
    // Campos adicionales para control interno
    orderId: string;
    status: 'PENDING' | 'SIGNED' | 'SENT' | 'AUTHORIZED' | 'REJECTED';
    authorizationDate?: string;
    creationDate?: Date;
    sriResponse?: any;
}
