/**
 * WhatsApp Web Client - Versión Simplificada y Robusta
 */

import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { logger } from '../../utils/Logger';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';

export interface SendMessageResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export interface WhatsAppStatus {
    isReady: boolean;
    isAuthenticated: boolean;
    qrCode: string | null;
    phoneNumber: string | null;
    lastActivity: Date | null;
}

class WhatsAppWebClient extends EventEmitter {
    private client: Client | null = null;
    private status: WhatsAppStatus = {
        isReady: false,
        isAuthenticated: false,
        qrCode: null,
        phoneNumber: null,
        lastActivity: null
    };
    private isStarting: boolean = false;
    private sessionPath: string;

    constructor() {
        super();
        this.sessionPath = process.env.WHATSAPP_SESSION_PATH || path.join(process.cwd(), 'whatsapp-session');

        // Crear directorio de sesión si no existe
        if (!fs.existsSync(this.sessionPath)) {
            fs.mkdirSync(this.sessionPath, { recursive: true });
        }

        logger.info('[WhatsApp] Client created', { sessionPath: this.sessionPath });
    }

    /**
     * Inicia el cliente de WhatsApp
     */
    public async start(): Promise<void> {
        if (this.isStarting) {
            logger.warn('[WhatsApp] Already starting, skipping');
            return;
        }

        if (this.status.isReady) {
            logger.info('[WhatsApp] Already ready, skipping start');
            return;
        }

        this.isStarting = true;
        logger.info('[WhatsApp] Starting client...');

        try {
            // Crear cliente con configuración optimizada
            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: this.sessionPath
                }),
                puppeteer: {
                    headless: true,
                    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-extensions'
                    ],
                    timeout: 60000
                },
                webVersionCache: {
                    type: 'local',
                    path: './.wwebjs_cache',
                    strict: false
                }
            });

            this.setupListeners();

            // Inicializar con timeout
            const initPromise = this.client.initialize();
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Timeout: 90 segundos')), 90000);
            });

            await Promise.race([initPromise, timeoutPromise]);

            logger.info('[WhatsApp] Client initialized');
        } catch (error: any) {
            logger.error('[WhatsApp] Failed to start', { error: error.message });
            this.isStarting = false;
            throw error;
        }

        this.isStarting = false;
    }

    private setupListeners(): void {
        if (!this.client) return;

        this.client.on('qr', (qr: string) => {
            this.status.qrCode = qr;
            this.status.isAuthenticated = false;
            logger.info('[WhatsApp] QR generated - scan with your phone');
            this.emit('qr', qr);
        });

        this.client.on('authenticated', () => {
            this.status.isAuthenticated = true;
            this.status.qrCode = null;
            logger.info('[WhatsApp] Authenticated');
            this.emit('authenticated');
        });

        this.client.on('ready', () => {
            this.status.isReady = true;
            this.status.lastActivity = new Date();

            const info = this.client?.info;
            this.status.phoneNumber = info?.wid?.user || null;

            logger.info('[WhatsApp] READY', { phone: this.status.phoneNumber });
            this.emit('ready', this.status.phoneNumber);
        });

        this.client.on('message', (message: Message) => {
            this.status.lastActivity = new Date();
            this.emit('message', message);
        });

        this.client.on('disconnected', async (reason: string) => {
            logger.warn('[WhatsApp] Disconnected', { reason });
            this.status.isReady = false;
            this.status.isAuthenticated = false;
            this.emit('disconnected', reason);

            // Si desconectaron desde el teléfono, limpiar sesión
            if (reason === 'LOGOUT' || reason === 'CONFLICT') {
                await this.clearSession();
            }
        });

        this.client.on('auth_failure', (msg: string) => {
            logger.error('[WhatsApp] Auth failed', { msg });
            this.status.isAuthenticated = false;
            this.status.qrCode = null;
            this.emit('auth_failure', msg);
        });
    }

    /**
     * Envía un mensaje de texto
     */
    public async sendText(to: string, message: string): Promise<SendMessageResult> {
        if (!this.isEnabled()) {
            const error = 'WhatsApp not connected';
            logger.warn('[WhatsApp] Cannot send - not ready');
            return { success: false, error };
        }

        try {
            const chatId = this.formatPhone(to);
            logger.info('[WhatsApp] Sending message', { to: chatId });

            const result = await this.client!.sendMessage(chatId, message);
            this.status.lastActivity = new Date();

            logger.info('[WhatsApp] Message sent', { to: chatId, id: result?.id?._serialized });
            return { success: true, messageId: result?.id?._serialized };
        } catch (error: any) {
            logger.error('[WhatsApp] Send failed', { to, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Formatea número de teléfono para WhatsApp
     */
    private formatPhone(phone: string): string {
        // Quitar sufijos de WhatsApp
        let cleaned = phone.replace(/@(c\.us|lid|s\.whatsapp\.net|g\.us)$/i, '');
        // Quitar caracteres especiales
        cleaned = cleaned.replace(/[\s\-\(\)\+]/g, '');

        // Ecuador: 09xxxxxxxx -> 593xxxxxxxx
        if (cleaned.startsWith('09') && cleaned.length === 10) {
            cleaned = '593' + cleaned.substring(1);
        } else if (cleaned.startsWith('9') && cleaned.length === 9) {
            cleaned = '593' + cleaned;
        }

        return cleaned + '@c.us';
    }

    public getStatus(): WhatsAppStatus {
        return { ...this.status };
    }

    public isEnabled(): boolean {
        return this.status.isReady && this.status.isAuthenticated;
    }

    public isClientStarting(): boolean {
        return this.isStarting;
    }

    /**
     * Cierra sesión y limpia archivos
     */
    public async logoutAndClear(): Promise<void> {
        logger.info('[WhatsApp] Logout and clear');

        try {
            if (this.client && this.status.isAuthenticated) {
                await this.client.logout();
            }
        } catch (e) {
            // Ignorar errores de logout
        }

        await this.clearSession();
    }

    private async clearSession(): Promise<void> {
        try {
            if (this.client) {
                await this.client.destroy();
                this.client = null;
            }
        } catch (e) {
            // Ignorar
        }

        this.status = {
            isReady: false,
            isAuthenticated: false,
            qrCode: null,
            phoneNumber: null,
            lastActivity: null
        };

        // Limpiar archivos de sesión
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

    public async stop(): Promise<void> {
        try {
            if (this.client) {
                await this.client.destroy();
                this.status.isReady = false;
                logger.info('[WhatsApp] Client stopped');
            }
        } catch (error) {
            logger.error('[WhatsApp] Error stopping', { error });
        }
    }

    /**
     * Pre-inicializa en background
     */
    public warmup(): void {
        if (this.isStarting || this.status.isReady) return;

        logger.info('[WhatsApp] Warmup starting...');
        this.start().catch(err => {
            logger.warn('[WhatsApp] Warmup failed', { error: err.message });
        });
    }
}

// ==================== Singleton ====================

let instance: WhatsAppWebClient | null = null;

export function isWhatsAppEnabled(): boolean {
    const enabled = process.env.WHATSAPP_ENABLED?.toLowerCase();
    return enabled === 'true' || enabled === '1';
}

export function getWhatsAppClient(): WhatsAppWebClient | null {
    if (!isWhatsAppEnabled()) {
        return null;
    }
    if (!instance) {
        instance = new WhatsAppWebClient();
    }
    return instance;
}

export async function initWhatsAppClient(): Promise<void> {
    const client = getWhatsAppClient();
    if (client) {
        await client.start();
    }
}

// ==================== Chatbot Singleton ====================

import { WhatsAppChatbot } from './WhatsAppChatbot';

let chatbotInstance: WhatsAppChatbot | null = null;

export function getWhatsAppChatbot(): WhatsAppChatbot {
    if (!chatbotInstance) {
        chatbotInstance = new WhatsAppChatbot();
    }
    return chatbotInstance;
}

export { WhatsAppWebClient };
