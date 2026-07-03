/**
 * WhatsApp Alert Repository
 *
 * Persiste las alertas de "cliente escribiendo por WhatsApp" para que el personal
 * pueda verlas aunque no tuviera el admin abierto cuando llegó el mensaje.
 * Cada alerta queda PENDIENTE hasta que alguien la marque como atendida.
 */

import mongoose, { Schema, Document } from 'mongoose';
import { logger } from '../utils/Logger';

export interface WhatsAppAlertDoc extends Document {
    phone: string;
    name?: string | null;
    text?: string;
    attended: boolean;
    attendedAt?: Date | null;
    createdAt: Date;
}

const WhatsAppAlertSchema = new Schema({
    phone: { type: String, required: true },
    name: { type: String, default: null },
    text: { type: String, default: '' },
    attended: { type: Boolean, default: false },
    attendedAt: { type: Date, default: null }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

// Índices: la consulta principal es "pendientes, más recientes primero"
WhatsAppAlertSchema.index({ attended: 1, createdAt: -1 });
// TTL: las alertas atendidas se limpian solas a los 30 días (no acumular basura)
WhatsAppAlertSchema.index(
    { attendedAt: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { attended: true } }
);

const WhatsAppAlertModel = mongoose.model<WhatsAppAlertDoc>('WhatsAppAlert', WhatsAppAlertSchema);

export interface WhatsAppAlert {
    id: string;
    phone: string;
    name: string | null;
    text: string;
    attended: boolean;
    createdAt: Date;
}

class WhatsAppAlertRepository {
    private mapToEntity(doc: any): WhatsAppAlert {
        return {
            id: doc._id.toString(),
            phone: doc.phone,
            name: doc.name || null,
            text: doc.text || '',
            attended: doc.attended,
            createdAt: doc.createdAt
        };
    }

    /** Guarda una nueva alerta pendiente */
    async create(data: { phone: string; name?: string | null; text?: string }): Promise<WhatsAppAlert> {
        const doc = await WhatsAppAlertModel.create({
            phone: data.phone,
            name: data.name || null,
            text: data.text || ''
        });
        logger.info('[WhatsAppAlert] Alert persisted', { phone: data.phone });
        return this.mapToEntity(doc);
    }

    /** Alertas pendientes (no atendidas), más recientes primero */
    async findPending(limit: number = 50): Promise<WhatsAppAlert[]> {
        const docs = await WhatsAppAlertModel
            .find({ attended: false })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return docs.map(d => this.mapToEntity(d));
    }

    /** Marca una alerta como atendida */
    async markAttended(id: string): Promise<boolean> {
        if (!mongoose.Types.ObjectId.isValid(id)) return false;
        const result = await WhatsAppAlertModel.updateOne(
            { _id: id, attended: false },
            { $set: { attended: true, attendedAt: new Date() } }
        );
        return result.modifiedCount > 0;
    }

    /** Marca todas las alertas pendientes como atendidas */
    async markAllAttended(): Promise<number> {
        const result = await WhatsAppAlertModel.updateMany(
            { attended: false },
            { $set: { attended: true, attendedAt: new Date() } }
        );
        logger.info('[WhatsAppAlert] All alerts attended', { count: result.modifiedCount });
        return result.modifiedCount;
    }
}

let instance: WhatsAppAlertRepository | null = null;

export function getWhatsAppAlertRepository(): WhatsAppAlertRepository {
    if (!instance) {
        instance = new WhatsAppAlertRepository();
    }
    return instance;
}
