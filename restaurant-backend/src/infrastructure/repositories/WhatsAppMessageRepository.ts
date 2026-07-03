/**
 * WhatsApp Message Repository
 *
 * Historial de conversaciones del chat integrado en el admin.
 * Guarda mensajes entrantes (cliente) y salientes (personal / chatbot)
 * para poder chatear desde el sistema sin depender del celular del negocio.
 */

import mongoose, { Schema } from 'mongoose';
import { logger } from '../utils/Logger';

const WhatsAppMessageSchema = new Schema({
    phone: { type: String, required: true },
    direction: { type: String, enum: ['in', 'out'], required: true },
    text: { type: String, required: true },
    /** Nombre visible del cliente (entrantes) o quién envió (salientes: username o 'chatbot') */
    senderName: { type: String, default: null }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

// Consulta principal: conversación de un cliente en orden cronológico
WhatsAppMessageSchema.index({ phone: 1, createdAt: 1 });
// TTL: el historial se limpia solo a los 90 días (no acumular sin límite)
WhatsAppMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const WhatsAppMessageModel = mongoose.model('WhatsAppMessage', WhatsAppMessageSchema);

export interface WhatsAppChatMessage {
    id: string;
    phone: string;
    direction: 'in' | 'out';
    text: string;
    senderName: string | null;
    createdAt: Date;
}

class WhatsAppMessageRepository {
    private mapToEntity(doc: any): WhatsAppChatMessage {
        return {
            id: doc._id.toString(),
            phone: doc.phone,
            direction: doc.direction,
            text: doc.text,
            senderName: doc.senderName || null,
            createdAt: doc.createdAt
        };
    }

    async save(data: { phone: string; direction: 'in' | 'out'; text: string; senderName?: string | null }): Promise<WhatsAppChatMessage> {
        const doc = await WhatsAppMessageModel.create({
            phone: data.phone,
            direction: data.direction,
            text: data.text.substring(0, 4096),
            senderName: data.senderName || null
        });
        return this.mapToEntity(doc);
    }

    /** Últimos N mensajes de la conversación, en orden cronológico (viejo → nuevo) */
    async findByPhone(phone: string, limit: number = 100): Promise<WhatsAppChatMessage[]> {
        const docs = await WhatsAppMessageModel
            .find({ phone })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return docs.map(d => this.mapToEntity(d)).reverse();
    }
}

let instance: WhatsAppMessageRepository | null = null;

export function getWhatsAppMessageRepository(): WhatsAppMessageRepository {
    if (!instance) {
        instance = new WhatsAppMessageRepository();
    }
    return instance;
}
