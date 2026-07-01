/**
 * WhatsApp API Routes - Simplificado y Robusto
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getWhatsAppClient, isWhatsAppEnabled, getWhatsAppChatbot } from '../../services/whatsapp';
import { logger } from '../../utils/Logger';
import QRCode from 'qrcode';
import { getChatbotConfigRepository } from '../../repositories/ChatbotConfigRepository';

const router = Router();

// Middleware: verificar si WhatsApp está habilitado
const requireEnabled = (req: Request, res: Response, next: NextFunction) => {
    if (!isWhatsAppEnabled()) {
        return res.status(503).json({
            success: false,
            error: { code: 'DISABLED', message: 'WhatsApp no esta habilitado en el servidor' }
        });
    }
    next();
};

// ==================== ENDPOINTS ====================

// Verificar si está habilitado
router.get('/enabled', (req: Request, res: Response) => {
    const enabled = isWhatsAppEnabled();
    res.json({
        success: true,
        data: {
            enabled,
            message: enabled ? 'WhatsApp habilitado' : 'WhatsApp deshabilitado'
        }
    });
});

// Obtener estado de conexión
router.get('/status', requireEnabled, async (req: Request, res: Response) => {
    try {
        const client = getWhatsAppClient();

        if (!client) {
            return res.json({
                success: true,
                data: {
                    isConnected: false,
                    isAuthenticated: false,
                    phoneNumber: null,
                    hasQR: false,
                    lastActivity: null,
                    message: 'Cliente no inicializado'
                }
            });
        }

        const status = client.getStatus();

        res.json({
            success: true,
            data: {
                isConnected: status.isReady && status.isAuthenticated,
                isAuthenticated: status.isAuthenticated,
                phoneNumber: status.phoneNumber,
                hasQR: !!status.qrCode,
                lastActivity: status.lastActivity,
                isStarting: client.isClientStarting()
            }
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error getting status', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Obtener código QR
router.get('/qr', requireEnabled, async (req: Request, res: Response) => {
    try {
        const client = getWhatsAppClient();

        if (!client) {
            return res.json({
                success: true,
                data: { qrCode: null, message: 'Cliente no inicializado. Presiona Conectar.' }
            });
        }

        const status = client.getStatus();

        // Ya está conectado
        if (status.isAuthenticated) {
            return res.json({
                success: true,
                data: { qrCode: null, message: 'Ya conectado', phoneNumber: status.phoneNumber }
            });
        }

        // Está iniciando
        if (client.isClientStarting()) {
            return res.json({
                success: true,
                data: { qrCode: null, message: 'Iniciando WhatsApp... espera 30-60 segundos' }
            });
        }

        // No hay QR todavía
        if (!status.qrCode) {
            return res.json({
                success: true,
                data: { qrCode: null, message: 'Esperando codigo QR...' }
            });
        }

        // Generar imagen QR
        const qrImage = await QRCode.toDataURL(status.qrCode, { width: 300, margin: 2 });

        res.json({
            success: true,
            data: { qrCode: qrImage, message: 'Escanea este codigo con WhatsApp' }
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error getting QR', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Conectar (iniciar cliente)
router.post('/connect', requireEnabled, async (req: Request, res: Response) => {
    try {
        const client = getWhatsAppClient();

        if (!client) {
            return res.status(500).json({
                success: false,
                error: { message: 'No se pudo obtener el cliente de WhatsApp' }
            });
        }

        const status = client.getStatus();

        if (status.isReady && status.isAuthenticated) {
            return res.json({ success: true, data: { message: 'Ya esta conectado' } });
        }

        if (client.isClientStarting()) {
            return res.json({ success: true, data: { message: 'Ya esta iniciando, espera...' } });
        }

        // Iniciar en background
        client.start().catch(err => {
            logger.error('[WhatsAppAPI] Error starting client', { error: err.message });
        });

        res.json({ success: true, data: { message: 'Iniciando WhatsApp... espera 30-60 segundos para el QR' } });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error connecting', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Desconectar
router.post('/disconnect', requireEnabled, async (req: Request, res: Response) => {
    try {
        const client = getWhatsAppClient();
        if (client) {
            await client.logoutAndClear();
        }
        res.json({ success: true, data: { message: 'Sesion cerrada' } });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error disconnecting', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Reiniciar sesión
router.post('/reset-session', requireEnabled, async (req: Request, res: Response) => {
    try {
        const client = getWhatsAppClient();
        if (client) {
            await client.logoutAndClear();
        }
        res.json({ success: true, data: { message: 'Sesion reiniciada. Espera unos segundos y presiona Conectar.' } });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error resetting session', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Enviar mensaje manual
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

        if (!client || !client.isEnabled()) {
            return res.status(400).json({
                success: false,
                error: { message: 'WhatsApp no esta conectado' }
            });
        }

        const result = await client.sendText(phone, message);

        if (result.success) {
            res.json({ success: true, data: { message: 'Mensaje enviado', messageId: result.messageId } });
        } else {
            res.status(400).json({ success: false, error: { message: result.error } });
        }
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error sending message', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Obtener configuración del chatbot
router.get('/chatbot-config', async (req: Request, res: Response) => {
    try {
        const configRepo = getChatbotConfigRepository();
        const config = await configRepo.get();
        res.json({ success: true, data: config });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error getting chatbot config', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Actualizar configuración del chatbot
router.put('/chatbot-config', async (req: Request, res: Response) => {
    try {
        const configRepo = getChatbotConfigRepository();
        const config = await configRepo.update(req.body);

        // Recargar config en el chatbot
        const chatbot = getWhatsAppChatbot();
        if (chatbot) {
            // El chatbot recargará la config en el próximo mensaje
        }

        res.json({ success: true, data: config });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error updating chatbot config', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Test: enviar menú a un número
router.post('/test-menu', requireEnabled, async (req: Request, res: Response) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: { message: 'phone es requerido' }
            });
        }

        const chatbot = getWhatsAppChatbot();

        // Simular mensaje entrante
        await chatbot.processMessage({ from: phone, text: 'test' });

        res.json({ success: true, data: { message: 'Menu enviado (si el cliente esta conectado)' } });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error testing menu', { error: error.message });
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

export default router;
