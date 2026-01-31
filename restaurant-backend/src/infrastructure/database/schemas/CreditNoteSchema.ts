/**
 * @file CreditNoteSchema.ts
 * @description Schema de Mongoose para la colección de Notas de Crédito
 * 
 * @purpose
 * Define la estructura de datos de MongoDB para Notas de Crédito electrónicas (SRI Ecuador).
 * Incluye transformación de _id a id en toObject para compatibilidad con frontend.
 * 
 * @connections
 * - Usa: CreditNote entity (domain/entities) - como referencia de tipos
 * - Usado por: MongoCreditNoteRepository (infrastructure/repositories)
 * - Exporta: CreditNoteModel para operaciones de BD
 * 
 * @layer Infrastructure - Persistencia de datos
 */

import mongoose, { Schema, Document } from 'mongoose';
import { CreditNote } from '../../../domain/entities/CreditNote';

export interface ICreditNoteDocument extends Document, Omit<CreditNote, 'id'> {
}

const CreditNoteSchema = new Schema({
    documentNumber: { type: String, required: true }, // 001-001-000000001
    billId: { type: Schema.Types.ObjectId, ref: 'Bill', required: true }, // Referencia a factura original
    originalAccessKey: { type: String, required: true }, // Clave de acceso de la factura
    orderId: { type: String, required: true },
    date: { type: String, required: true }, // dd/mm/yyyy
    reason: { type: String, required: true, enum: ['01', '02', '03', '04', '05', '06', '07'] },
    reasonDescription: { type: String, required: true },
    customerName: { type: String, required: true },
    customerIdentification: { type: String, required: true },
    customerAddress: { type: String, required: true },
    customerEmail: { type: String },
    items: [{
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        total: { type: Number, required: true }
    }],
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    accessKey: { type: String, unique: true, sparse: true }, // Clave de acceso de la NC
    sriStatus: { type: String }, // AUTORIZADO, DEVUELTA, PENDIENTE, etc.
    environment: { type: String }, // '1' (pruebas) o '2' (producción)
    authorizationDate: { type: String },
    xmlUrl: { type: String },
    pdfUrl: { type: String }
}, {
    timestamps: true
});

// ==================== INDEXES FOR PERFORMANCE ====================
CreditNoteSchema.index({ documentNumber: 1 }, { unique: true }); // Unique document numbers
CreditNoteSchema.index({ billId: 1 }); // For finding credit notes by bill
CreditNoteSchema.index({ orderId: 1 }); // For finding credit notes by order
CreditNoteSchema.index({ date: -1 }); // For sorting by date
CreditNoteSchema.index({ customerIdentification: 1 }); // For customer credit note lookup
CreditNoteSchema.index({ createdAt: -1 }); // For sorting by creation date
CreditNoteSchema.index({ accessKey: 1 }); // For SRI lookups

// Configure toObject to map _id to id
CreditNoteSchema.set('toObject', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

export const CreditNoteModel = mongoose.model<ICreditNoteDocument>('CreditNote', CreditNoteSchema);
