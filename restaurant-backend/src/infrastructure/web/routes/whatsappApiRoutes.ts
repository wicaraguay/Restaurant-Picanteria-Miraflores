/**
 * WhatsApp API Routes - Baileys
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getWhatsAppClient, isWhatsAppEnabled, getWhatsAppChatbot } from '../../services/whatsapp';
import { logger } from '../../utils/Logger';
import { getChatbotConfigRepository } from '../../repositories/ChatbotConfigRepository';
import { getWhatsAppAlertRepository } from '../../repositories/WhatsAppAlertRepository';
import { getWhatsAppMessageRepository } from '../../repositories/WhatsAppMessageRepository';
import { whatsAppSocketManager } from '../../websocket/WhatsAppSocketManager';
import { jwtAuthMiddleware } from '../middleware/JWTAuthMiddleware';

const router = Router();

// Middleware: verificar si está habilitado
const requireEnabled = (req: Request, res: Response, next: NextFunction) => {
    if (!isWhatsAppEnabled()) {
        return res.status(503).json({
            success: false,
            error: { code: 'DISABLED', message: 'WhatsApp no esta habilitado' }
        });
    }
    next();
};

// ==================== CHAT INTEGRADO ====================

// Historial de conversación con un cliente (últimos 100 mensajes)
router.get('/chats/:phone/messages', jwtAuthMiddleware, async (req: Request, res: Response) => {
    try {
        const phone = req.params.phone.replace(/\D/g, ''); // solo dígitos
        const messages = await getWhatsAppMessageRepository().findByPhone(phone);
        res.json({ success: true, data: messages });
    } catch (error: any) {
        logger.error('[WhatsApp] Error fetching chat', { error });
        res.status(500).json({ success: false, error: { code: 'CHAT_ERROR', message: error.message } });
    }
});

// Enviar mensaje a un cliente desde el sistema (sale por el servidor, no por el celular)
router.post('/chats/:phone/send', jwtAuthMiddleware, requireEnabled, async (req: Request, res: Response) => {
    try {
        const phone = req.params.phone.replace(/\D/g, '');
        const text = (req.body?.text || '').trim();

        if (!text || text.length > 4096) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_MESSAGE', message: 'El mensaje no puede estar vacío ni superar 4096 caracteres' }
            });
        }

        const client = getWhatsAppClient();
        if (!client || !client.isConnected()) {
            return res.status(503).json({
                success: false,
                error: { code: 'NOT_CONNECTED', message: 'WhatsApp no está conectado' }
            });
        }

        const result = await client.sendText(phone, text);
        if (!result.success) {
            return res.status(502).json({
                success: false,
                error: { code: 'SEND_FAILED', message: result.error || 'No se pudo enviar el mensaje' }
            });
        }

        // Persistir en el historial con quién respondió
        const senderName = (req as any).user?.username || 'staff';
        const saved = await getWhatsAppMessageRepository().save({
            phone,
            direction: 'out',
            text,
            senderName
        });

        // Responder = atender: la conversación sale del contador de pendientes
        await getWhatsAppAlertRepository().markAttendedByPhone(phone);

        // Avisar a los demás admins abiertos (y refrescar sus chats/contadores)
        whatsAppSocketManager.broadcast('chat_message', {
            phone,
            direction: 'out',
            text,
            senderName
        });

        res.json({ success: true, data: saved });
    } catch (error: any) {
        logger.error('[WhatsApp] Error sending chat message', { error });
        res.status(500).json({ success: false, error: { code: 'SEND_ERROR', message: error.message } });
    }
});

// ==================== ALERTAS "CLIENTE ESCRIBIENDO" ====================

// Alertas pendientes (se conservan hasta marcarlas como atendidas)
router.get('/alerts', async (req: Request, res: Response) => {
    try {
        const alerts = await getWhatsAppAlertRepository().findPending();
        res.json({ success: true, data: alerts });
    } catch (error: any) {
        logger.error('[WhatsApp] Error fetching alerts', { error });
        res.status(500).json({ success: false, error: { code: 'ALERTS_ERROR', message: error.message } });
    }
});

// Marcar todas las alertas como atendidas
router.put('/alerts/attend-all', async (req: Request, res: Response) => {
    try {
        const count = await getWhatsAppAlertRepository().markAllAttended();
        res.json({ success: true, data: { attended: count } });
    } catch (error: any) {
        logger.error('[WhatsApp] Error attending all alerts', { error });
        res.status(500).json({ success: false, error: { code: 'ALERTS_ERROR', message: error.message } });
    }
});

// Marcar una alerta como atendida
router.put('/alerts/:id/attend', async (req: Request, res: Response) => {
    try {
        const ok = await getWhatsAppAlertRepository().markAttended(req.params.id);
        res.json({ success: true, data: { attended: ok } });
    } catch (error: any) {
        logger.error('[WhatsApp] Error attending alert', { error, id: req.params.id });
        res.status(500).json({ success: false, error: { code: 'ALERTS_ERROR', message: error.message } });
    }
});

// ==================== ENDPOINTS ====================

// Verificar si está habilitado
router.get('/enabled', (req: Request, res: Response) => {
    const enabled = isWhatsAppEnabled();
    res.json({
        success: true,
        data: { enabled, message: enabled ? 'WhatsApp habilitado' : 'WhatsApp deshabilitado' }
    });
});

// Estado de conexión
router.get('/status', requireEnabled, (req: Request, res: Response) => {
    try {
        const client = getWhatsAppClient();

        if (!client) {
            return res.json({
                success: true,
                data: {
                    isConnected: false,
                    phoneNumber: null,
                    hasQR: false,
                    message: 'Cliente no inicializado'
                }
            });
        }

        const status = client.getStatus();

        res.json({
            success: true,
            data: {
                isConnected: status.isConnected,
                phoneNumber: status.phoneNumber,
                hasQR: !!status.qrCode,
                lastActivity: status.lastActivity,
                isConnecting: client.isClientConnecting()
            }
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Status error', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Obtener QR
router.get('/qr', requireEnabled, (req: Request, res: Response) => {
    try {
        const client = getWhatsAppClient();

        if (!client) {
            return res.json({
                success: true,
                data: { qrCode: null, message: 'Presiona Conectar primero' }
            });
        }

        const status = client.getStatus();

        if (status.isConnected) {
            return res.json({
                success: true,
                data: { qrCode: null, message: 'Ya conectado', phoneNumber: status.phoneNumber }
            });
        }

        if (client.isClientConnecting() && !status.qrCodeBase64) {
            return res.json({
                success: true,
                data: { qrCode: null, message: 'Generando QR... espera unos segundos' }
            });
        }

        if (!status.qrCodeBase64) {
            return res.json({
                success: true,
                data: { qrCode: null, message: 'Presiona Conectar para generar QR' }
            });
        }

        res.json({
            success: true,
            data: { qrCode: status.qrCodeBase64, message: 'Escanea con WhatsApp' }
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] QR error', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Conectar
router.post('/connect', requireEnabled, async (req: Request, res: Response) => {
    try {
        const client = getWhatsAppClient();

        if (!client) {
            return res.status(500).json({
                success: false,
                error: { message: 'No se pudo crear el cliente' }
            });
        }

        if (client.isConnected()) {
            return res.json({ success: true, data: { message: 'Ya conectado' } });
        }

        if (client.isClientConnecting()) {
            return res.json({ success: true, data: { message: 'Ya conectando, espera...' } });
        }

        // Conectar en background
        client.connect().catch(err => {
            logger.error('[WhatsAppAPI] Connect error', { error: err.message });
        });

        res.json({ success: true, data: { message: 'Conectando... el QR aparecera en segundos' } });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Connect error', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Desconectar
router.post('/disconnect', requireEnabled, async (req: Request, res: Response) => {
    try {
        const client = getWhatsAppClient();
        if (client) {
            await client.logout();
        }
        res.json({ success: true, data: { message: 'Sesion cerrada' } });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Disconnect error', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Reiniciar sesión
router.post('/reset-session', requireEnabled, async (req: Request, res: Response) => {
    try {
        const client = getWhatsAppClient();
        if (client) {
            await client.logout();
        }
        res.json({ success: true, data: { message: 'Sesion reiniciada' } });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Reset error', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Enviar mensaje
router.post('/send', requireEnabled, async (req: Request, res: Response) => {
    try {
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                error: { message: 'phone y message son requeridos' }
            });
        }

        const client = getWhatsAppClient();

        if (!client || !client.isConnected()) {
            return res.status(400).json({
                success: false,
                error: { message: 'WhatsApp no conectado' }
            });
        }

        const result = await client.sendText(phone, message);

        if (result.success) {
            res.json({ success: true, data: { message: 'Enviado', messageId: result.messageId } });
        } else {
            res.status(400).json({ success: false, error: { message: result.error } });
        }
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Send error', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Config del chatbot
router.get('/chatbot-config', async (req: Request, res: Response) => {
    try {
        const repo = getChatbotConfigRepository();
        const config = await repo.get();
        res.json({ success: true, data: config });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

router.put('/chatbot-config', async (req: Request, res: Response) => {
    try {
        const repo = getChatbotConfigRepository();
        const config = await repo.update(req.body);
        res.json({ success: true, data: config });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Test enviar menú
router.post('/test-menu', requireEnabled, async (req: Request, res: Response) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ success: false, error: { message: 'phone requerido' } });
        }

        const chatbot = getWhatsAppChatbot();
        await chatbot.processMessage({ from: phone, text: 'test' });

        res.json({ success: true, data: { message: 'Menu enviado' } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

export default router;
