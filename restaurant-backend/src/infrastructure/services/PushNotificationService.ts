/**
 * Push Notification Service (Web Push)
 *
 * Envía notificaciones push reales a los dispositivos del personal —
 * llegan aunque el navegador esté cerrado o la app en segundo plano.
 *
 * Requiere claves VAPID en variables de entorno:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)
 * Si no están configuradas, el servicio se degrada silenciosamente
 * (solo log de advertencia — el resto del sistema no se afecta).
 */

import webpush from 'web-push';
import { logger } from '../utils/Logger';
import { getPushSubscriptionRepository } from '../repositories/PushSubscriptionRepository';

export interface PushPayload {
    title: string;
    body: string;
    url?: string;
    tag?: string;
}

class PushNotificationService {
    private configured = false;

    constructor() {
        const publicKey = process.env.VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        const subject = process.env.VAPID_SUBJECT || 'mailto:admin@picanteriamiraflores.com';

        if (publicKey && privateKey) {
            webpush.setVapidDetails(subject, publicKey, privateKey);
            this.configured = true;
            logger.info('[Push] Web Push configured');
        } else {
            logger.warn('[Push] VAPID keys not set — push notifications DISABLED (set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');
        }
    }

    public isConfigured(): boolean {
        return this.configured;
    }

    public getPublicKey(): string | null {
        return process.env.VAPID_PUBLIC_KEY || null;
    }

    /**
     * Envía la notificación a TODOS los dispositivos suscritos.
     * Las suscripciones muertas (404/410 = app desinstalada, permiso revocado)
     * se eliminan automáticamente.
     */
    public async sendToAll(payload: PushPayload): Promise<{ sent: number; failed: number }> {
        if (!this.configured) {
            return { sent: 0, failed: 0 };
        }

        const repo = getPushSubscriptionRepository();
        const subscriptions = await repo.findAll();

        if (subscriptions.length === 0) {
            return { sent: 0, failed: 0 };
        }

        const body = JSON.stringify(payload);
        let sent = 0;
        let failed = 0;

        await Promise.all(subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: sub.keys },
                    body,
                    { TTL: 60 * 60 } // Si el dispositivo está apagado, el push espera hasta 1 hora
                );
                sent++;
            } catch (error: any) {
                failed++;
                // 404/410: la suscripción ya no existe (permiso revocado, app desinstalada)
                if (error?.statusCode === 404 || error?.statusCode === 410) {
                    await repo.deleteByEndpoint(sub.endpoint).catch(() => { /* noop */ });
                } else {
                    logger.warn('[Push] Send failed', { status: error?.statusCode, message: error?.message });
                }
            }
        }));

        logger.info('[Push] Notification dispatched', { sent, failed, total: subscriptions.length });
        return { sent, failed };
    }
}

let instance: PushNotificationService | null = null;

export function getPushNotificationService(): PushNotificationService {
    if (!instance) {
        instance = new PushNotificationService();
    }
    return instance;
}
