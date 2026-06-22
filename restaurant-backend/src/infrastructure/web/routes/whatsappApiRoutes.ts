/**
 * WhatsApp API Routes (whatsapp-web.js)
 * Endpoints para gestión de WhatsApp desde el panel
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getWhatsAppChatbot, getWhatsAppClient, isWhatsAppEnabled } from '../../services/whatsapp';
import { logger } from '../../utils/Logger';
import QRCode from 'qrcode';
import { getChatbotConfigRepository } from '../../repositories/ChatbotConfigRepository';

const router = Router();

/**
 * Middleware: Check if WhatsApp is enabled
 */
const requireWhatsAppEnabled = (req: Request, res: Response, next: NextFunction) => {
    if (!isWhatsAppEnabled()) {
        return res.status(503).json({
            success: false,
            error: {
                code: 'WHATSAPP_DISABLED',
                message: 'WhatsApp está deshabilitado en este servidor. Configure WHATSAPP_ENABLED=true para habilitarlo.'
            }
        });
    }
    next();
};

/**
 * Helper to get WhatsApp client with non-null assertion
 * Safe to use after requireWhatsAppEnabled middleware
 */
const getClient = (): NonNullable<ReturnType<typeof getWhatsAppClient>> => {
    const client = getWhatsAppClient();
    if (!client) {
        throw new Error('WhatsApp client not available');
    }
    return client;
};

/**
 * GET /api/whatsapp/enabled
 * Check if WhatsApp is enabled (always works, no middleware)
 */
router.get('/enabled', (req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            enabled: isWhatsAppEnabled(),
            message: isWhatsAppEnabled()
                ? 'WhatsApp está habilitado'
                : 'WhatsApp está deshabilitado. Configure WHATSAPP_ENABLED=true para habilitarlo.'
        }
    });
});

// Apply middleware to all OTHER routes
router.use(requireWhatsAppEnabled);

/**
 * GET /api/whatsapp/status
 * Obtiene el estado de conexión de WhatsApp
 */
router.get('/status', async (req: Request, res: Response) => {
    try {
        const client = getClient();
        const status = client.getStatus();

        // isConnected debe ser true solo si está autenticado Y listo
        const isConnected = status.isReady && status.isAuthenticated;

        res.json({
            success: true,
            data: {
                isConnected: isConnected,
                isAuthenticated: status.isAuthenticated,
                phoneNumber: status.phoneNumber,
                hasQR: !!status.qrCode,
                lastActivity: status.lastActivity
            }
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error getting status', { error });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/whatsapp/qr
 * Obtiene el código QR para escanear (como imagen base64)
 */
router.get('/qr', async (req: Request, res: Response) => {
    try {
        const client = getClient();
        const status = client.getStatus();

        if (status.isAuthenticated) {
            return res.json({
                success: true,
                data: {
                    qrCode: null,
                    message: 'Ya estas conectado',
                    phoneNumber: status.phoneNumber
                }
            });
        }

        if (!status.qrCode) {
            return res.json({
                success: true,
                data: {
                    qrCode: null,
                    message: 'Esperando generacion de QR... Intenta de nuevo en unos segundos'
                }
            });
        }

        // Convertir QR a imagen base64
        const qrImageBase64 = await QRCode.toDataURL(status.qrCode, {
            width: 300,
            margin: 2
        });

        res.json({
            success: true,
            data: {
                qrCode: qrImageBase64,
                message: 'Escanea este codigo con WhatsApp'
            }
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error getting QR', { error });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/whatsapp/connect
 * Inicia la conexión de WhatsApp (genera QR)
 */
router.post('/connect', async (req: Request, res: Response) => {
    try {
        const client = getClient();
        const status = client.getStatus();

        if (status.isReady) {
            return res.json({
                success: true,
                data: { message: 'WhatsApp ya esta conectado' }
            });
        }

        // Iniciar cliente (generará QR)
        client.start().catch((err: Error) => {
            logger.error('[WhatsAppAPI] Error starting client', { error: err });
        });

        res.json({
            success: true,
            data: { message: 'Iniciando conexion... Obten el QR en /api/whatsapp/qr' }
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error connecting', { error });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/whatsapp/disconnect
 * Cierra sesión de WhatsApp
 */
router.post('/disconnect', async (req: Request, res: Response) => {
    try {
        const client = getClient();
        await client.logout();

        res.json({
            success: true,
            data: { message: 'Sesion cerrada. Necesitaras escanear QR de nuevo.' }
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error disconnecting', { error });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/whatsapp/conversations
 * Obtiene las conversaciones activas del chatbot
 */
router.get('/conversations', async (req: Request, res: Response) => {
    try {
        const chatbot = getWhatsAppChatbot();
        const conversations = chatbot.getActiveConversations();

        res.json({
            success: true,
            data: conversations
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error getting conversations', { error });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/whatsapp/conversations/:id
 * Obtiene una conversación específica
 */
router.get('/conversations/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const chatbot = getWhatsAppChatbot();
        const conversation = chatbot.getConversation(id);

        res.json({
            success: true,
            data: conversation || null
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error getting conversation', { error });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/whatsapp/stats
 * Obtiene estadísticas de WhatsApp
 */
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const chatbot = getWhatsAppChatbot();
        const client = getClient();
        const conversations = chatbot.getActiveConversations();
        const status = client.getStatus();

        res.json({
            success: true,
            data: {
                isConnected: status.isReady,
                phoneNumber: status.phoneNumber,
                totalConversations: conversations.length,
                activeConversations: conversations.filter(c => c.status === 'active').length,
                lastActivity: status.lastActivity
            }
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error getting stats', { error });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/whatsapp/send
 * Envía un mensaje manual
 */
router.post('/send', async (req: Request, res: Response) => {
    try {
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'phone y message son requeridos' }
            });
        }

        const client = getClient();

        if (!client.isEnabled()) {
            return res.status(400).json({
                success: false,
                error: { code: 'NOT_CONNECTED', message: 'WhatsApp no esta conectado' }
            });
        }

        const result = await client.sendText(phone, message);

        if (result.success) {
            res.json({
                success: true,
                data: { message: 'Mensaje enviado', messageId: result.messageId }
            });
        } else {
            res.status(400).json({
                success: false,
                error: { code: 'SEND_ERROR', message: result.error }
            });
        }
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error sending message', { error });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/whatsapp/reload-menu
 * Recarga el menú del chatbot desde la base de datos
 */
router.post('/reload-menu', async (req: Request, res: Response) => {
    try {
        const chatbot = getWhatsAppChatbot();
        const itemsLoaded = await chatbot.loadMenuFromDatabase();

        res.json({
            success: true,
            data: { itemsLoaded }
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error reloading menu', { error });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/whatsapp/chatbot-config
 * Obtiene la configuracion del chatbot
 */
router.get('/chatbot-config', async (req: Request, res: Response) => {
    try {
        const configRepo = getChatbotConfigRepository();
        const config = await configRepo.get();

        res.json({
            success: true,
            data: config
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error getting chatbot config', { error });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * PUT /api/whatsapp/chatbot-config
 * Actualiza la configuracion del chatbot
 */
router.put('/chatbot-config', async (req: Request, res: Response) => {
    try {
        const configRepo = getChatbotConfigRepository();
        const config = await configRepo.update(req.body);

        // Recargar configuracion en el chatbot
        const chatbot = getWhatsAppChatbot();
        await chatbot.reloadConfig();

        res.json({
            success: true,
            data: config
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error updating chatbot config', { error });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/whatsapp/take-conversation
 * Activa modo manual para una conversación (admin toma control)
 * El chatbot dejará de responder automáticamente
 */
router.post('/take-conversation', async (req: Request, res: Response) => {
    logger.info('[WhatsAppAPI] take-conversation called', { body: req.body });

    try {
        const { phone } = req.body;

        if (!phone) {
            logger.warn('[WhatsAppAPI] take-conversation: phone is missing');
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'phone es requerido' }
            });
        }

        logger.info('[WhatsAppAPI] Setting manual mode for phone', { phone });
        const chatbot = getWhatsAppChatbot();
        const success = await chatbot.setManualMode(phone, true);

        logger.info('[WhatsAppAPI] setManualMode result', { phone, success });

        if (success) {
            logger.info('[WhatsAppAPI] Conversation taken by admin', { phone });
            res.json({
                success: true,
                data: { message: 'Has tomado control de la conversación. El chatbot no responderá automáticamente.' }
            });
        } else {
            logger.warn('[WhatsAppAPI] Could not take conversation', { phone });
            res.status(400).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'No se pudo tomar la conversación' }
            });
        }
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error taking conversation', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/whatsapp/release-conversation
 * Desactiva modo manual, devuelve control al chatbot
 */
router.post('/release-conversation', async (req: Request, res: Response) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'phone es requerido' }
            });
        }

        const chatbot = getWhatsAppChatbot();
        const success = await chatbot.setManualMode(phone, false);

        if (success) {
            logger.info('[WhatsAppAPI] Conversation released to chatbot', { phone });
            res.json({
                success: true,
                data: { message: 'El chatbot ahora responderá automáticamente.' }
            });
        } else {
            res.status(400).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'No se encontró la conversación' }
            });
        }
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error releasing conversation', { error });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/whatsapp/manual-conversations
 * Obtiene todas las conversaciones en modo manual
 */
router.get('/manual-conversations', async (req: Request, res: Response) => {
    try {
        const chatbot = getWhatsAppChatbot();
        const conversations = chatbot.getManualModeConversations();

        res.json({
            success: true,
            data: conversations
        });
    } catch (error: any) {
        logger.error('[WhatsAppAPI] Error getting manual conversations', { error });
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

export default router;
