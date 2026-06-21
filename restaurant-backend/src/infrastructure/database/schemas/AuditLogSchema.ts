/**
 * @file AuditLogSchema.ts
 * @description Schema para registrar auditoría de todas las operaciones CRUD del sistema.
 *
 * Este schema almacena un historial completo de cambios para cumplimiento,
 * debugging y recuperación de datos.
 */

import { Schema, model, Document } from 'mongoose';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE' | 'RESTORE';

export interface IAuditLog {
    action: AuditAction;
    collection: string;
    documentId: string;
    before: Record<string, any> | null;
    after: Record<string, any> | null;
    changes?: Record<string, { from: any; to: any }>;
    userId?: string;
    userEmail?: string;
    userRole?: string;
    ip?: string;
    userAgent?: string;
    reason?: string;
    timestamp: Date;
}

// Usar Omit para evitar conflicto con Document.collection
export interface IAuditLogDocument extends Omit<Document, 'collection'>, IAuditLog {}

const AuditLogSchema = new Schema<IAuditLogDocument>(
    {
        action: {
            type: String,
            required: true,
            enum: ['CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE'],
            index: true
        },
        collection: {
            type: String,
            required: true,
            index: true
        },
        documentId: {
            type: String,
            required: true,
            index: true
        },
        before: {
            type: Schema.Types.Mixed,
            default: null
        },
        after: {
            type: Schema.Types.Mixed,
            default: null
        },
        changes: {
            type: Schema.Types.Mixed,
            default: null
        },
        userId: {
            type: String,
            index: true
        },
        userEmail: {
            type: String
        },
        userRole: {
            type: String
        },
        ip: {
            type: String
        },
        userAgent: {
            type: String
        },
        reason: {
            type: String
        },
        timestamp: {
            type: Date,
            required: true,
            default: Date.now,
            index: true
        }
    },
    {
        collection: 'audit_logs',
        // No versionKey para auditoría
        versionKey: false
    }
);

// Índice compuesto para búsquedas comunes
AuditLogSchema.index({ collection: 1, documentId: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

// TTL Index: Mantener logs por 1 año (365 días)
// Después de este tiempo, MongoDB los elimina automáticamente
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AuditLogModel = model<IAuditLogDocument>('AuditLog', AuditLogSchema);
