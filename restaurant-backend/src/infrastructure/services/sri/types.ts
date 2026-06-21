/**
 * Shared types and interfaces for SRI service modules
 */

export interface SRIReceptionResponse {
    estado: string;
    rawResponse: string;
    mensajes: string[];
}

export interface SRIAuthResponse {
    estado: string;
    numeroAutorizacion: string;
    fechaAutorizacion: string;
    comprobanteAutorizado: string;
    rawResponse: string;
    mensajes?: string[];
}

export interface AccessKeyParams {
    fechaEmision: string;
    codDoc: string;
    ruc: string;
    ambiente: string;
    estab: string;
    ptoEmi: string;
    secuencial: string;
    codigoNumerico: string;
}

export interface TaxGroup {
    codigo: string;
    codigoPorcentaje: string;
    baseImponible: number;
    valor: number;
}
