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
}
