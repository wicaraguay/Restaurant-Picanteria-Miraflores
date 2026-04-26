/**
 * @file billing.types.ts
 * @description Tipos para el módulo de facturación.
 */

export interface BillItem {
    name: string;
    quantity: number;
    price: number;
    total: number;
}

/** Entrada del log de errores SRI — acumulativa, nunca se sobreescribe */
export interface BillErrorEntry {
    /** ISO timestamp del intento */
    timestamp: string;
    /** Estado del SRI: DEVUELTA, ERROR, TIMEOUT, etc. */
    sriStatus: string;
    /** Mensaje(s) de error del SRI */
    message: string;
    /** Número de intento (1, 2, 3...) */
    attempt: number;
}

export interface Bill {
    id: string;
    orderId: string;
    documentNumber: string;
    date: string;
    customerName: string;
    customerIdentification: string;
    customerAddress: string;
    customerEmail?: string;
    customerPhone?: string;
    paymentMethod?: string;
    items: BillItem[];
    subtotal: number;
    tax: number;
    total: number;
    sriStatus?: string;
    accessKey?: string;
    environment?: string;
    sriMessage?: string;
    xmlContent?: string;
    hasCreditNote?: boolean;
    retryCount?: number;
    lastRetryDate?: string;
    /** Historial completo de errores del SRI — nunca se sobreescribe, se acumula */
    errorLog?: BillErrorEntry[];
}

export interface CreditNote {
    id: string;
    billId: string;
    documentNumber: string;
    date: string;
    reason: string;
    reasonDescription: string;
    customerName: string;
    customerIdentification: string;
    customerAddress: string;
    customerEmail?: string;
    subtotal: number;
    tax: number;
    total: number;
    sriStatus?: string;
    accessKey?: string;
    environment?: string;
    authorizationDate?: string;
    retryCount?: number;
    lastRetryDate?: string;
    sriMessage?: string;
    /** Historial completo de errores del SRI para la nota de crédito */
    errorLog?: BillErrorEntry[];
}
