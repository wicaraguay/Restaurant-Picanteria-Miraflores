/**
 * @file CreditNote.ts
 * @description Entidad de dominio que representa una Nota de Crédito
 * 
 * @purpose
 * Define la estructura de datos de una Nota de Crédito electrónica
 * cumpliendo con requisitos del SRI (Ecuador). Documenta la reversión,
 * anulación o corrección de facturas previamente emitidas.
 * 
 * @connections
 * - Usado por: ICreditNoteRepository (domain/repositories)
 * - Usado por: MongoCreditNoteRepository (infrastructure/repositories)
 * - Usado por: CreditNoteSchema (infrastructure/database/schemas)
 * - Usado por: GenerateCreditNote, GetCreditNotes (application/use-cases)
 * - Relacionado con: Bill entity (NC modifica facturas)
 * 
 * @layer Domain - Entidad pura sin dependencias externas
 */

export interface CreditNoteItem {
    name: string;
    quantity: number;
    price: number;
    total: number;
}

export class CreditNote {
    constructor(
        public readonly id: string,
        public readonly documentNumber: string, // 001-001-000000001
        public readonly billId: string, // ID de factura original
        public readonly originalAccessKey: string, // Clave de acceso de factura original
        public readonly orderId: string,
        public readonly date: string, // Fecha de emisión de la NC
        public readonly reason: string, // Código del motivo (01-07)
        public readonly reasonDescription: string, // Descripción del motivo
        public readonly customerName: string,
        public readonly customerIdentification: string,
        public readonly customerAddress: string,
        public readonly customerEmail: string,
        public readonly items: CreditNoteItem[],
        public readonly subtotal: number,
        public readonly tax: number,
        public readonly total: number,
        public readonly accessKey?: string, // Clave de acceso de la NC
        public readonly sriStatus?: string, // AUTORIZADO, DEVUELTA, etc.
        public readonly environment?: string, // '1' (pruebas) o '2' (producción)
        public readonly authorizationDate?: string,
        public readonly xmlUrl?: string,
        public readonly pdfUrl?: string,
        public readonly createdAt?: Date
    ) { }
}
