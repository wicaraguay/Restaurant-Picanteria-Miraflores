/**
 * @file WhatsAppWebClient.ts
 * @description Cliente de WhatsApp usando whatsapp-web.js (GRATIS)
 *
 * @purpose
 * Automatiza WhatsApp usando WhatsApp Web (como si fuera tu navegador).
 * No requiere cuenta de Meta Business ni pagos.
 *
 * @setup
 * 1. Escanear QR desde el panel de administración
 * 2. La sesión se guarda en MongoDB
 * 3. Reconecta automáticamente
 */

import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { logger } from '../../utils/Logger';
import { EventEmitter } from 'events';

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

export class WhatsAppWebClient extends EventEmitter {
    private client: Client | null = null;
    private isReady: boolean = false;
    private isAuthenticated: boolean = false;
    private currentQR: string | null = null;
    private phoneNumber: string | null = null;
    private lastActivity: Date | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;

    constructor() {
        super();
        this.initializeClient();
    }

    /**
     * Inicializa el cliente de WhatsApp Web
     */
    private initializeClient(): void {
        try {
            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: './whatsapp-session'
                }),
                puppeteer: {
                    headless: true,
                    // Use system Chromium if available (Docker/production)
                    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                        '--single-process', // Important for Alpine Linux
                        '--disable-features=VizDisplayCompositor',
                        '--disable-software-rasterizer'
                    ]
                },
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
                }
            });

            this.setupEventListeners();

            logger.info('[WhatsAppWeb] Client initialized, waiting for QR or session restore');
        } catch (error) {
            logger.error('[WhatsAppWeb] Failed to initialize client', { error });
        }
    }

    /**
     * Configura los event listeners del cliente
     */
    private setupEventListeners(): void {
        if (!this.client) return;

        // QR Code para escanear
        this.client.on('qr', (qr: string) => {
            this.currentQR = qr;
            this.isAuthenticated = false;
            logger.info('[WhatsAppWeb] QR Code generated - scan with your phone');
            this.emit('qr', qr);
        });

        // Autenticado exitosamente
        this.client.on('authenticated', () => {
            this.isAuthenticated = true;
            this.currentQR = null;
            this.reconnectAttempts = 0;
            logger.info('[WhatsAppWeb] Authenticated successfully');
            this.emit('authenticated');
        });

        // Cliente listo para enviar/recibir
        this.client.on('ready', async () => {
            this.isReady = true;
            this.lastActivity = new Date();

            // Obtener número de teléfono
            const info = this.client?.info;
            this.phoneNumber = info?.wid?.user || null;

            logger.info('[WhatsAppWeb] Client is ready', { phone: this.phoneNumber });
            this.emit('ready', this.phoneNumber);
        });

        // Mensaje recibido
        this.client.on('message', async (message: Message) => {
            this.lastActivity = new Date();
            logger.info('[WhatsAppWeb] Message received', {
                from: message.from,
                body: message.body?.substring(0, 50)
            });
            this.emit('message', message);
        });

        // Desconectado
        this.client.on('disconnected', (reason: string) => {
            this.isReady = false;
            this.isAuthenticated = false;
            logger.warn('[WhatsAppWeb] Client disconnected', { reason });
            this.emit('disconnected', reason);

            // Intentar reconectar
            this.attemptReconnect();
        });

        // Error de autenticación
        this.client.on('auth_failure', (message: string) => {
            this.isAuthenticated = false;
            this.isReady = false;
            logger.error('[WhatsAppWeb] Authentication failed', { message });
            this.emit('auth_failure', message);
        });
    }

    /**
     * Inicia el cliente (genera QR o restaura sesión)
     */
    public async start(): Promise<void> {
        if (!this.client) {
            this.initializeClient();
        }

        if (!this.client) {
            logger.error('[WhatsAppWeb] Client is null after initialization');
            throw new Error('Failed to initialize WhatsApp client');
        }

        try {
            logger.info('[WhatsAppWeb] Starting client... (this may take 30-60 seconds)');
            logger.info('[WhatsAppWeb] Launching Puppeteer/Chrome...');

            // Initialize with timeout and retry logic
            const initPromise = this.client.initialize();

            // Log progress
            const progressInterval = setInterval(() => {
                logger.info('[WhatsAppWeb] Still initializing... waiting for Chrome');
            }, 10000);

            // Add timeout to detect stuck initialization
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('WhatsApp initialization timeout after 90 seconds')), 90000)
            );

            await Promise.race([initPromise, timeoutPromise]);

            clearInterval(progressInterval);
            logger.info('[WhatsAppWeb] Client initialized successfully');
        } catch (error: any) {
            logger.error('[WhatsAppWeb] Failed to start client', {
                error: error.message,
                stack: error.stack
            });

            // If it's a "browser already running" error, suggest clearing session
            if (error.message?.includes('browser is already running')) {
                logger.error('[WhatsAppWeb] CRITICAL: Session files are locked. This usually means a previous instance did not shut down cleanly.');
                logger.error('[WhatsAppWeb] To fix: Set WHATSAPP_ENABLED=false temporarily, redeploy, then set back to true');
            }

            throw error;
        }
    }

    /**
     * Detiene el cliente
     */
    public async stop(): Promise<void> {
        try {
            if (this.client) {
                await this.client.destroy();
                this.isReady = false;
                this.isAuthenticated = false;
                logger.info('[WhatsAppWeb] Client stopped');
            }
        } catch (error) {
            logger.error('[WhatsAppWeb] Error stopping client', { error });
        }
    }

    /**
     * Cierra sesión (requiere escanear QR de nuevo)
     */
    public async logout(): Promise<void> {
        try {
            if (this.client) {
                await this.client.logout();
                this.isReady = false;
                this.isAuthenticated = false;
                this.phoneNumber = null;
                this.currentQR = null;
                logger.info('[WhatsAppWeb] Logged out successfully');
            }
        } catch (error) {
            logger.error('[WhatsAppWeb] Error logging out', { error });
        }
    }

    /**
     * Intenta reconectar automáticamente
     */
    private async attemptReconnect(): Promise<void> {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('[WhatsAppWeb] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

        logger.info('[WhatsAppWeb] Attempting reconnect', {
            attempt: this.reconnectAttempts,
            delayMs: delay
        });

        setTimeout(async () => {
            try {
                await this.start();
            } catch (error) {
                logger.error('[WhatsAppWeb] Reconnect failed', { error });
            }
        }, delay);
    }

    /**
     * Obtiene el estado actual del cliente
     */
    public getStatus(): WhatsAppStatus {
        return {
            isReady: this.isReady,
            isAuthenticated: this.isAuthenticated,
            qrCode: this.currentQR,
            phoneNumber: this.phoneNumber,
            lastActivity: this.lastActivity
        };
    }

    /**
     * Verifica si el cliente está listo para enviar mensajes
     */
    public isEnabled(): boolean {
        return this.isReady && this.isAuthenticated;
    }

    /**
     * Formatea número de teléfono para WhatsApp
     */
    private formatPhoneNumber(phone: string): string {
        let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

        // Ecuador: convertir 09xxxxxxxx a 593xxxxxxxx
        if (cleaned.startsWith('09') && cleaned.length === 10) {
            cleaned = '593' + cleaned.substring(1);
        } else if (cleaned.startsWith('9') && cleaned.length === 9) {
            cleaned = '593' + cleaned;
        }

        // Agregar @c.us para WhatsApp
        if (!cleaned.includes('@')) {
            cleaned = cleaned + '@c.us';
        }

        return cleaned;
    }

    /**
     * Envía un mensaje de texto
     */
    public async sendText(to: string, message: string): Promise<SendMessageResult> {
        if (!this.isEnabled()) {
            logger.warn('[WhatsAppWeb] Cannot send - client not ready');
            return { success: false, error: 'WhatsApp no está conectado' };
        }

        try {
            const chatId = this.formatPhoneNumber(to);
            const result = await this.client?.sendMessage(chatId, message);

            this.lastActivity = new Date();
            logger.info('[WhatsAppWeb] Message sent', { to: chatId, messageId: result?.id?._serialized });

            return {
                success: true,
                messageId: result?.id?._serialized
            };
        } catch (error: any) {
            logger.error('[WhatsAppWeb] Failed to send message', { to, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Envía un mensaje con botones (simulado con texto)
     * whatsapp-web.js no soporta botones nativos en todas las versiones
     */
    public async sendButtons(
        to: string,
        bodyText: string,
        buttons: Array<{ id: string; title: string }>
    ): Promise<SendMessageResult> {
        // Convertir botones a texto con números
        const buttonText = buttons
            .map((btn, index) => `${index + 1}. ${btn.title}`)
            .join('\n');

        const fullMessage = `${bodyText}\n\n${buttonText}\n\n_Responde con el número de tu opción_`;

        return this.sendText(to, fullMessage);
    }

    /**
     * Marca un mensaje como leído
     */
    public async markAsRead(messageId: string): Promise<boolean> {
        // whatsapp-web.js marca como leído automáticamente al recibir
        return true;
    }
}

// Singleton instance
let whatsAppWebClientInstance: WhatsAppWebClient | null = null;

/**
 * Check if WhatsApp is enabled via environment variable
 */
export function isWhatsAppEnabled(): boolean {
    const enabled = process.env.WHATSAPP_ENABLED?.toLowerCase();
    // Default to false in production if not explicitly set
    if (enabled === undefined || enabled === '') {
        return process.env.NODE_ENV !== 'production';
    }
    return enabled === 'true' || enabled === '1';
}

export function getWhatsAppClient(): WhatsAppWebClient | null {
    if (!isWhatsAppEnabled()) {
        logger.info('[WhatsAppWeb] WhatsApp is DISABLED (set WHATSAPP_ENABLED=true to enable)');
        return null;
    }
    if (!whatsAppWebClientInstance) {
        whatsAppWebClientInstance = new WhatsAppWebClient();
    }
    return whatsAppWebClientInstance;
}

export async function initWhatsAppClient(): Promise<void> {
    const client = getWhatsAppClient();
    if (client) {
        await client.start();
    }
}
