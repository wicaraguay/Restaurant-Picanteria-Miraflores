/**
 * Chatbot Daily Send Repository
 *
 * Controla que los mensajes automáticos del chatbot (menú del día, horario)
 * se envíen COMO MÁXIMO UNA VEZ POR DÍA CALENDARIO a cada usuario.
 * Al cambiar el día (hora Ecuador), todos vuelven a ser elegibles.
 *
 * Persistente en MongoDB: sobrevive reinicios y deploys (un registro en
 * memoria se resetearía con cada despliegue y duplicaría envíos el mismo día).
 */

import mongoose, { Schema } from 'mongoose';
import { logger } from '../utils/Logger';

const ChatbotDailySendSchema = new Schema({
    jid: { type: String, required: true },              // usuario de WhatsApp
    type: { type: String, enum: ['menu', 'closed'], required: true },
    date: { type: String, required: true }              // YYYY-MM-DD (hora Ecuador)
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

// Un envío por usuario+tipo+día — la unicidad ES la regla de negocio
ChatbotDailySendSchema.index({ jid: 1, type: 1, date: 1 }, { unique: true });
// Limpieza automática: los registros caducan a los 3 días
ChatbotDailySendSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 });

const ChatbotDailySendModel = mongoose.model('ChatbotDailySend', ChatbotDailySendSchema);

class ChatbotDailySendRepository {
    /**
     * Intenta registrar el envío de hoy de forma ATÓMICA.
     * @returns true si es el PRIMER envío del día para este usuario+tipo
     *          (procede enviar); false si ya se le envió hoy.
     */
    async tryMarkSentToday(jid: string, type: 'menu' | 'closed', date: string): Promise<boolean> {
        try {
            await ChatbotDailySendModel.create({ jid, type, date });
            return true; // insertó → primera vez hoy
        } catch (error: any) {
            if (error?.code === 11000) {
                return false; // índice único: ya se le envió hoy
            }
            // Error inesperado de BD (NO es el 11000 de "ya enviado hoy"). Fallamos CERRADO:
            // no enviar, para no arriesgar un envío DUPLICADO (que agrava el riesgo de baneo).
            // Pero NO en silencio: se registra con contexto y consecuencia explícita para que
            // sea visible en monitoreo — el cliente NO recibió su mensaje automático esta vez.
            logger.error('[ChatbotDailySend] Fallo al registrar envío en BD; se OMITE el envío automático (el cliente NO lo recibirá)', {
                jid, type, date, error: error?.message
            });
            return false;
        }
    }

    /** Revierte la marca si el envío falló (para reintentar cuando vuelva a escribir) */
    async unmark(jid: string, type: 'menu' | 'closed', date: string): Promise<void> {
        await ChatbotDailySendModel.deleteOne({ jid, type, date }).catch(() => { /* noop */ });
    }
}

let instance: ChatbotDailySendRepository | null = null;

export function getChatbotDailySendRepository(): ChatbotDailySendRepository {
    if (!instance) {
        instance = new ChatbotDailySendRepository();
    }
    return instance;
}
