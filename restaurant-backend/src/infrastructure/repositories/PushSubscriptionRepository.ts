/**
 * Push Subscription Repository
 *
 * Guarda las suscripciones Web Push de los dispositivos del personal.
 * Cada teléfono/navegador que activa las notificaciones registra aquí su
 * "dirección de entrega" (endpoint + claves de cifrado del navegador).
 */

import mongoose, { Schema } from 'mongoose';
import { logger } from '../utils/Logger';

const PushSubscriptionSchema = new Schema({
    endpoint: { type: String, required: true, unique: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
    },
    userAgent: { type: String, default: null },
    userId: { type: String, default: null }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

const PushSubscriptionModel = mongoose.model('PushSubscription', PushSubscriptionSchema);

export interface PushSubscriptionData {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userAgent?: string | null;
    userId?: string | null;
}

class PushSubscriptionRepository {
    /** Guarda o actualiza una suscripción (idempotente por endpoint) */
    async save(sub: PushSubscriptionData): Promise<void> {
        await PushSubscriptionModel.updateOne(
            { endpoint: sub.endpoint },
            { $set: { keys: sub.keys, userAgent: sub.userAgent || null, userId: sub.userId || null } },
            { upsert: true }
        );
        logger.info('[Push] Subscription saved', { endpoint: sub.endpoint.slice(0, 40) + '...' });
    }

    /** Elimina una suscripción (dispositivo desactivó notificaciones o expiró) */
    async deleteByEndpoint(endpoint: string): Promise<void> {
        await PushSubscriptionModel.deleteOne({ endpoint });
        logger.info('[Push] Subscription removed', { endpoint: endpoint.slice(0, 40) + '...' });
    }

    /** Todas las suscripciones activas */
    async findAll(): Promise<PushSubscriptionData[]> {
        const docs = await PushSubscriptionModel.find().lean();
        return docs.map((d: any) => ({
            endpoint: d.endpoint,
            keys: { p256dh: d.keys.p256dh, auth: d.keys.auth },
            userAgent: d.userAgent,
            userId: d.userId
        }));
    }

    async count(): Promise<number> {
        return PushSubscriptionModel.countDocuments();
    }
}

let instance: PushSubscriptionRepository | null = null;

export function getPushSubscriptionRepository(): PushSubscriptionRepository {
    if (!instance) {
        instance = new PushSubscriptionRepository();
    }
    return instance;
}
