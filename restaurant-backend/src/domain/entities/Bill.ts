/**
 * @file Bill.ts
 * @description Entidad de dominio que representa una factura o nota de venta
 * 
 * @purpose
 * Define la estructura de datos de un documento de facturación (Factura o Nota de Venta)
 * cumpliendo con requisitos del SRI (Ecuador). Incluye información del cliente, items,
 * cálculos de impuestos y número de documento.
 * 
 * @connections
 * - Usado por: IBillRepository (domain/repositories)
 * - Usado por: MongoBillRepository (infrastructure/repositories)
 * - Usado por: BillSchema (infrastructure/database/schemas)
 * - Usado por: CreateBill, GetBills (application/use-cases)
 * - Usado por: billRoutes (infrastructure/web/routes)
 * - Relacionado con: Order entity (facturas generadas de órdenes)
 * - Relacionado con: RestaurantConfig (secuencias de facturación)
 * 
 * @layer Domain - Entidad pura sin dependencias externas
 */

export interface BillItem {
    name: string;
    quantity: number;
    price: number;
    total: number;
}

export class Bill {
    constructor(
        public readonly id: string,
        public readonly documentNumber: string,
        public readonly orderId: string,
        public readonly date: string,
        public readonly documentType: 'Factura' | 'Nota de Venta',
        public readonly customerName: string,
        public readonly customerIdentification: string,
        public readonly customerAddress: string,
        public readonly customerEmail: string,
        public readonly items: BillItem[],
        public readonly subtotal: number,
        public readonly tax: number,
        public readonly total: number,
        public readonly regime: string,
        public readonly accessKey?: string,
        public readonly sriStatus?: string,
        public readonly environment?: string,
        public readonly authorizationDate?: string,
        public readonly xmlUrl?: string,
        public readonly pdfUrl?: string,
        public readonly hasCreditNote?: boolean,
        public readonly createdAt?: Date
    ) { }
}
