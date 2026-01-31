/**
 * @file BillSchema.ts
 * @description Schema de Mongoose para la colección de facturas/notas de venta
 * 
 * @purpose
 * Define la estructura de datos de MongoDB para documentos de facturación (SRI Ecuador).
 * Incluye transformación de _id a id en toObject para compatibilidad con frontend.
 * 
 * @connections
 * - Usa: Bill entity (domain/entities) - como referencia de tipos
 * - Usado por: MongoBillRepository (infrastructure/repositories)
 * - Exporta: BillModel para operaciones de BD
 * 
 * @layer Infrastructure - Persistencia de datos
 */

import mongoose, { Schema, Document } from 'mongoose';
import { Bill } from '../../../domain/entities/Bill';

export interface IBillDocument extends Document, Omit<Bill, 'id'> {
}

const BillSchema = new Schema({
    documentNumber: { type: String, required: true },
    orderId: { type: String, required: true },
    date: { type: String, required: true },
    documentType: { type: String, enum: ['Factura', 'Nota de Venta'], required: true },
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
    regime: { type: String, required: true },
    accessKey: { type: String, unique: true, sparse: true },
    sriStatus: { type: String },
    environment: { type: String },
    authorizationDate: { type: String },
    xmlUrl: { type: String },
    pdfUrl: { type: String },
    hasCreditNote: { type: Boolean, default: false }
}, {
    timestamps: true
});

// ==================== INDEXES FOR PERFORMANCE ====================
BillSchema.index({ documentNumber: 1 }, { unique: true }); // Unique document numbers
BillSchema.index({ orderId: 1 }); // For finding bills by order
BillSchema.index({ date: -1 }); // For sorting by date
BillSchema.index({ customerIdentification: 1 }); // For customer bill lookup
BillSchema.index({ createdAt: -1 }); // For sorting by creation date

// Configure toObject to map _id to id
BillSchema.set('toObject', {
    transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});

export const BillModel = mongoose.model<IBillDocument>('Bill', BillSchema);
