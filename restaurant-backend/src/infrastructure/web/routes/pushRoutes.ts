/**
 * Push Notification Routes
 *
 * Endpoints para que los dispositivos del personal activen/desactiven
 * las notificaciones push de alertas de WhatsApp.
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/JWTAuthMiddleware';
import { getPushNotificationService } from '../../services/PushNotificationService';
import { getPushSubscriptionRepository } from '../../repositories/PushSubscriptionRepository';
import { logger } from '../../utils/Logger';

const router = Router();

/**
 * GET /api/push/public-key
 * Clave pública VAPID (necesaria para que el navegador se suscriba).
 * Pública por diseño — la clave pública no es un secreto.
 */
router.get('/public-key', (req: Request, res: Response) => {
    const service = getPushNotificationService();
    res.json({
        success: true,
        data: {
            enabled: service.isConfigured(),
            publicKey: service.getPublicKey()
        }
    });
});

/**
 * POST /api/push/subscribe
 * Registra la suscripción push de este dispositivo (requiere sesión).
 */
router.post('/subscribe', jwtAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const { endpoint, keys } = req.body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_SUBSCRIPTION', message: 'Suscripción push inválida' }
            });
        }

        await getPushSubscriptionRepository().save({
            endpoint,
            keys,
            userAgent: req.headers['user-agent'] || null,
            userId: (req as any).user?.userId || null
        });

        res.json({ success: true, data: { subscribed: true } });
    } catch (error: any) {
        logger.error('[Push] Subscribe error', { error });
        res.status(500).json({ success: false, error: { code: 'SUBSCRIBE_ERROR', message: error.message } });
    }
});

/**
 * POST /api/push/unsubscribe
 * Elimina la suscripción de este dispositivo (requiere sesión).
 */
router.post('/unsubscribe', jwtAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const { endpoint } = req.body;
        if (endpoint) {
            await getPushSubscriptionRepository().deleteByEndpoint(endpoint);
        }
        res.json({ success: true, data: { subscribed: false } });
    } catch (error: any) {
        logger.error('[Push] Unsubscribe error', { error });
        res.status(500).json({ success: false, error: { code: 'UNSUBSCRIBE_ERROR', message: error.message } });
    }
});

export default router;
