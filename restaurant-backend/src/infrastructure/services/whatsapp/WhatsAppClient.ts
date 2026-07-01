/**
 * WhatsApp Client usando Baileys
 * Ligero, rápido, sin Chromium
 */

import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    proto,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import { EventEmitter } from 'events';
import { logger } from '../../utils/Logger';
import path from 'path';
import fs from 'fs';
import pino from 'pino';

export interface WhatsAppStatus {
    isConnected: boolean;
    qrCode: string | null;
    qrCodeBase64: string | null;
    phoneNumber: string | null;
    lastActivity: Date | null;
}

export interface SendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

class WhatsAppClient extends EventEmitter {
    private socket: WASocket | null = null;
    private sessionPath: string;
    private status: WhatsAppStatus = {
        isConnected: false,
        qrCode: null,
        qrCodeBase64: null,
        phoneNumber: null,
        lastActivity: null
    };
    private isConnecting: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;

    constructor() {
        super();
        this.sessionPath = process.env.WHATSAPP_SESSION_PATH ||
            path.join(process.cwd(), 'whatsapp-session');

        // Crear directorio si no existe
        if (!fs.existsSync(this.sessionPath)) {
            fs.mkdirSync(this.sessionPath, { recursive: true });
        }

        logger.info('[WhatsApp] Client initialized', { sessionPath: this.sessionPath });
    }

    /**
     * Conecta a WhatsApp
     */
    public async connect(): Promise<void> {
        if (this.isConnecting) {
            logger.warn('[WhatsApp] Already connecting...');
            return;
        }

        if (this.status.isConnected && this.socket) {
            logger.info('[WhatsApp] Already connected');
            return;
        }

        this.isConnecting = true;
        logger.info('[WhatsApp] Connecting...');

        try {
            // Cargar estado de autenticación
            const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

            // Crear socket con configuración silenciosa
            const silentLogger = pino({ level: 'silent' });

            this.socket = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, silentLogger)
                },
                printQRInTerminal: false,
                logger: silentLogger,
                browser: ['Ubuntu', 'Chrome', '114.0.0.0'],
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                markOnlineOnConnect: false,
                syncFullHistory: false
            });

            // Manejar actualizaciones de conexión
            this.socket.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                // QR Code recibido
                if (qr) {
                    this.status.qrCode = qr;
                    try {
                        this.status.qrCodeBase64 = await QRCode.toDataURL(qr, { width: 300 });
                    } catch (e) {
                        logger.error('[WhatsApp] Error generating QR image', { error: e });
                    }
                    logger.info('[WhatsApp] QR Code ready - scan with your phone');
                    this.emit('qr', qr, this.status.qrCodeBase64);
                }

                // Conexión establecida
                if (connection === 'open') {
                    this.status.isConnected = true;
                    this.status.qrCode = null;
                    this.status.qrCodeBase64 = null;
                    this.status.lastActivity = new Date();
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;

                    // Obtener número de teléfono
                    const user = this.socket?.user;
                    this.status.phoneNumber = user?.id?.split(':')[0] || null;

                    logger.info('[WhatsApp] Connected!', { phone: this.status.phoneNumber });
                    this.emit('connected', this.status.phoneNumber);
                }

                // Conexión cerrada
                if (connection === 'close') {
                    this.status.isConnected = false;
                    this.isConnecting = false;

                    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    logger.warn('[WhatsApp] Disconnected', {
                        statusCode,
                        shouldReconnect,
                        reason: DisconnectReason[statusCode] || 'unknown'
                    });

                    if (statusCode === DisconnectReason.loggedOut) {
                        // Usuario cerró sesión desde el teléfono
                        logger.info('[WhatsApp] Logged out from phone, clearing session...');
                        await this.clearSession();
                        this.emit('logged_out');
                    } else if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                        // Intentar reconectar
                        this.reconnectAttempts++;
                        const delay = Math.min(5000 * this.reconnectAttempts, 30000);
                        logger.info('[WhatsApp] Reconnecting...', { attempt: this.reconnectAttempts, delay });
                        setTimeout(() => this.connect(), delay);
                    }

                    this.emit('disconnected', statusCode);
                }
            });

            // Guardar credenciales cuando cambien
            this.socket.ev.on('creds.update', saveCreds);

            // Manejar mensajes entrantes
            this.socket.ev.on('messages.upsert', async ({ messages, type }) => {
                if (type !== 'notify') return;

                for (const msg of messages) {
                    // Ignorar mensajes propios
                    if (msg.key.fromMe) continue;

                    // Ignorar mensajes de estado/broadcast
                    const jid = msg.key.remoteJid;
                    if (!jid || jid === 'status@broadcast' || jid.endsWith('@g.us')) continue;

                    const text = msg.message?.conversation ||
                                 msg.message?.extendedTextMessage?.text ||
                                 '';

                    if (text) {
                        this.status.lastActivity = new Date();
                        logger.info('[WhatsApp] Message received', {
                            from: jid,
                            text: text.substring(0, 50)
                        });
                        this.emit('message', { from: jid, text, raw: msg });
                    }
                }
            });

        } catch (error: any) {
            this.isConnecting = false;
            logger.error('[WhatsApp] Connection error', { error: error.message });
            throw error;
        }
    }

    /**
     * Envía un mensaje de texto
     */
    public async sendText(to: string, text: string): Promise<SendResult> {
        if (!this.socket || !this.status.isConnected) {
            return { success: false, error: 'WhatsApp no está conectado' };
        }

        try {
            const jid = this.formatJid(to);

            const result = await this.socket.sendMessage(jid, { text });

            this.status.lastActivity = new Date();
            logger.info('[WhatsApp] Message sent', { to: jid });

            return {
                success: true,
                messageId: result?.key?.id || undefined
            };
        } catch (error: any) {
            logger.error('[WhatsApp] Send error', { to, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Formatea número a JID de WhatsApp
     */
    private formatJid(phone: string): string {
        // Quitar sufijos existentes
        let cleaned = phone.replace(/@(s\.whatsapp\.net|c\.us|g\.us)$/i, '');
        // Quitar caracteres especiales
        cleaned = cleaned.replace(/[\s\-\(\)\+]/g, '');

        // Ecuador: 09xxxxxxxx -> 593xxxxxxxx
        if (cleaned.startsWith('09') && cleaned.length === 10) {
            cleaned = '593' + cleaned.substring(1);
        } else if (cleaned.startsWith('9') && cleaned.length === 9) {
            cleaned = '593' + cleaned;
        }

        return cleaned + '@s.whatsapp.net';
    }

    /**
     * Obtiene el estado actual
     */
    public getStatus(): WhatsAppStatus {
        return { ...this.status };
    }

    /**
     * Verifica si está conectado
     */
    public isConnected(): boolean {
        return this.status.isConnected;
    }

    /**
     * Verifica si está conectando
     */
    public isClientConnecting(): boolean {
        return this.isConnecting;
    }

    /**
     * Cierra sesión y limpia archivos
     */
    public async logout(): Promise<void> {
        logger.info('[WhatsApp] Logging out...');

        try {
            if (this.socket) {
                await this.socket.logout();
            }
        } catch (e) {
            // Ignorar errores
        }

        await this.clearSession();
    }

    /**
     * Limpia archivos de sesión
     */
    private async clearSession(): Promise<void> {
        try {
            if (this.socket) {
                this.socket.end(undefined);
                this.socket = null;
            }
        } catch (e) {
            // Ignorar
        }

        this.status = {
            isConnected: false,
            qrCode: null,
            qrCodeBase64: null,
            phoneNumber: null,
            lastActivity: null
        };

        // Eliminar archivos de sesión
        try {
            if (fs.existsSync(this.sessionPath)) {
                fs.rmSync(this.sessionPath, { recursive: true, force: true });
                fs.mkdirSync(this.sessionPath, { recursive: true });
            }
            logger.info('[WhatsApp] Session cleared');
        } catch (e) {
            logger.warn('[WhatsApp] Could not clear session files');
        }

        this.emit('session_cleared');
    }

    /**
     * Desconecta sin borrar sesión
     */
    public async disconnect(): Promise<void> {
        if (this.socket) {
            this.socket.end(undefined);
            this.socket = null;
        }
        this.status.isConnected = false;
        logger.info('[WhatsApp] Disconnected');
    }

    /**
     * Detiene el cliente (alias de disconnect)
     */
    public async stop(): Promise<void> {
        await this.disconnect();
    }
}

// ==================== Singleton ====================

let instance: WhatsAppClient | null = null;

export function isWhatsAppEnabled(): boolean {
    const enabled = process.env.WHATSAPP_ENABLED?.toLowerCase();
    return enabled === 'true' || enabled === '1';
}

export function getWhatsAppClient(): WhatsAppClient | null {
    if (!isWhatsAppEnabled()) {
        return null;
    }
    if (!instance) {
        instance = new WhatsAppClient();
    }
    return instance;
}

export { WhatsAppClient };
