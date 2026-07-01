/**
 * WhatsApp API Routes - Versión Simplificada
 * Solo conexión, QR y configuración básica
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getWhatsAppClient, isWhatsAppEnabled } from '../../services/whatsapp';
import { logger } from '../../utils/Logger';
import QRCode from 'qrcode';
import { getChatbotConfigRepository } from '../../repositories/ChatbotConfigRepository';

const router = Router();

const requireWhatsAppEnabled = (req: Request, res: Response, next: NextFunction) => {
    if (!isWhatsAppEnabled()) {
        return res.status(503).json({
            success: false,
            error: {
                code: 'WHATSAPP_DISABLED',
                message: 'WhatsApp está deshabilitado. Configure WHATSAPP_ENABLED=true.'
            }
        });
    }
    next();
};

const getClient = () => {
    const client = getWhatsAppClient();
    if (!client) throw new Error('WhatsApp client not available');
    return client;
};

// Check if enabled
router.get('/enabled', (req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            enabled: isWhatsAppEnabled(),
            message: isWhatsAppEnabled() ? 'WhatsApp habilitado' : 'WhatsApp deshabilitado'
        }
    });
});

router.use(requireWhatsAppEnabled);

// Get status
router.get('/status', async (req: Request, res: Response) => {
    try {
        const client = getClient();
        const status = client.getStatus();

        res.json({
            success: true,
            data: {
                isConnected: status.isReady && status.isAuthenticated,
                isAuthenticated: status.isAuthenticated,
                phoneNumber: status.phoneNumber,
                hasQR: !!status.qrCode,
                lastActivity: status.lastActivity
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Get QR code
router.get('/qr', async (req: Request, res: Response) => {
    try {
        const client = getClient();
        const status = client.getStatus();

        if (status.isAuthenticated) {
            return res.json({
                success: true,
                data: { qrCode: null, message: 'Ya conectado', phoneNumber: status.phoneNumber }
            });
        }

        if (!status.qrCode) {
            return res.json({
                success: true,
                data: { qrCode: null, message: 'Esperando QR...' }
            });
        }

        const qrImageBase64 = await QRCode.toDataURL(status.qrCode, { width: 300, margin: 2 });

        res.json({
            success: true,
            data: { qrCode: qrImageBase64, message: 'Escanea este codigo' }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Connect
router.post('/connect', async (req: Request, res: Response) => {
    try {
        const client = getClient();
        if (client.getStatus().isReady) {
            return res.json({ success: true, data: { message: 'Ya conectado' } });
        }

        client.start().catch(err => logger.error('[WhatsAppAPI] Error starting', { error: err }));
        res.json({ success: true, data: { message: 'Iniciando conexion...' } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Disconnect
router.post('/disconnect', async (req: Request, res: Response) => {
    try {
        const client = getClient();
        await client.logoutAndClear();
        res.json({ success: true, data: { message: 'Sesion cerrada' } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Reset session
router.post('/reset-session', async (req: Request, res: Response) => {
    try {
        const client = getClient();
        await client.logoutAndClear();
        res.json({ success: true, data: { message: 'Sesion reiniciada' } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Send message (manual)
router.post('/send', async (req: Request, res: Response) => {
    try {
        const { phone, message } = req.body;

        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                error: { message: 'phone y message son requeridos' }
            });
        }

        const client = getClient();
        if (!client.isEnabled()) {
            return res.status(400).json({
                success: false,
                error: { message: 'WhatsApp no conectado' }
            });
        }

        const result = await client.sendText(phone, message);

        if (result.success) {
            res.json({ success: true, data: { message: 'Enviado' } });
        } else {
            res.status(400).json({ success: false, error: { message: result.error } });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Get chatbot config
router.get('/chatbot-config', async (req: Request, res: Response) => {
    try {
        const configRepo = getChatbotConfigRepository();
        const config = await configRepo.get();
        res.json({ success: true, data: config });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Update chatbot config
router.put('/chatbot-config', async (req: Request, res: Response) => {
    try {
        const configRepo = getChatbotConfigRepository();
        const config = await configRepo.update(req.body);
        res.json({ success: true, data: config });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
});

export default router;
