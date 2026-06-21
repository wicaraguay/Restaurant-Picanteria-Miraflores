/**
 * @file ErrorLogSchema.ts
 * @description Schema de Mongoose para logs de errores SRI con TTL automático
 *
 * @purpose
 * Almacena errores de integración SRI con auto-eliminación después de 90 días.
 * TTL index automáticamente limpia registros antiguos para optimizar almacenamiento.
 *
 * @connections
 * - Usado por: BillRepository cuando ocurren errores SRI
 * - Exporta: ErrorLogModel para registro de errores
 *
 * @layer Infrastructure - Persistencia de datos
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IErrorLogDocument extends Document {
    billId: string;
    timestamp: Date;
    sriStatus: string;
    message: string;
    attempt: number;
    createdAt: Date; // TTL index field
}

const ErrorLogSchema = new Schema({
    billId: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true },
    sriStatus: { type: String, required: true },
    message: { type: String, required: true },
    attempt: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: false // We manually control createdAt for TTL
});

// ==================== INDEXES ====================
// TTL index: automatically delete documents after 90 days
// MongoDB runs a background task every 60 seconds to clean up expired documents
ErrorLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days

// Compound index for efficient queries
ErrorLogSchema.index({ billId: 1, createdAt: -1 }); // Error history per bill
ErrorLogSchema.index({ sriStatus: 1, createdAt: -1 }); // Errors by status

export const ErrorLogModel = mongoose.model<IErrorLogDocument>('ErrorLog', ErrorLogSchema);
