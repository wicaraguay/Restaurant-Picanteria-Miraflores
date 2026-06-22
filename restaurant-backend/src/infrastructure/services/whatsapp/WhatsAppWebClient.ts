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

import { Client, LocalAuth, Message, MessageMedia } from 'whatsapp-web.js';
import { logger } from '../../utils/Logger';
import { EventEmitter } from 'events';
import path from 'path';

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
    private isInitializing: boolean = false;
    private currentQR: string | null = null;
    private phoneNumber: string | null = null;
    private lastActivity: Date | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private sessionPath: string;

    constructor() {
        super();
        // Ruta de sesión configurable por variable de entorno (para volumen en Docker)
        this.sessionPath = process.env.WHATSAPP_SESSION_PATH ||
            path.join(process.cwd(), 'whatsapp-session');
        logger.info('[WhatsAppWeb] Session path configured', { sessionPath: this.sessionPath });
        this.initializeClient();
    }

    /**
     * Inicializa el cliente de WhatsApp Web
     */
    private initializeClient(): void {
        try {
            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: this.sessionPath
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
                        '--disable-software-rasterizer',
                        // Memory optimization flags
                        '--disable-extensions',
                        '--disable-background-networking',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-breakpad',
                        '--disable-component-extensions-with-background-pages',
                        '--disable-default-apps',
                        '--disable-hang-monitor',
                        '--disable-prompt-on-repost',
                        '--disable-sync',
                        '--metrics-recording-only',
                        '--no-default-browser-check',
                        '--no-pings',
                        '--password-store=basic',
                        '--use-mock-keychain',
                        '--disable-blink-features=AutomationControlled',
                        '--js-flags=--max-old-space-size=256' // Limit V8 heap to 256MB
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
     * Pre-inicializa Chromium en background para reducir tiempo de espera del QR
     * Llamar al inicio del servidor para "calentar" el sistema
     */
    public async warmup(): Promise<void> {
        if (this.isInitializing || this.isReady || this.isAuthenticated) {
            logger.info('[WhatsAppWeb] Already initialized or initializing, skipping warmup');
            return;
        }

        logger.info('[WhatsAppWeb] Starting warmup - pre-initializing Chromium in background...');

        // Iniciar en background sin bloquear
        this.start().catch(error => {
            logger.warn('[WhatsAppWeb] Warmup completed with warning:', error.message);
        });
    }

    /**
     * Inicia el cliente (genera QR o restaura sesión)
     */
    public async start(): Promise<void> {
        // Evitar inicializaciones múltiples
        if (this.isInitializing) {
            logger.warn('[WhatsAppWeb] Already initializing, skipping duplicate start');
            return;
        }

        if (this.isReady && this.isAuthenticated) {
            logger.info('[WhatsAppWeb] Already connected, skipping start');
            return;
        }

        this.isInitializing = true;

        if (!this.client) {
            this.initializeClient();
        }

        if (!this.client) {
            this.isInitializing = false;
            logger.error('[WhatsAppWeb] Client is null after initialization');
            throw new Error('Failed to initialize WhatsApp client');
        }

        try {
            logger.info('[WhatsAppWeb] Starting client... (this may take 30-60 seconds)');
            logger.info('[WhatsAppWeb] Launching Puppeteer/Chrome...');

            // Initialize with timeout and retry logic
            const initPromise = this.client.initialize();

            // Log progress every 15 seconds (menos spam)
            const progressInterval = setInterval(() => {
                logger.info('[WhatsAppWeb] Still initializing... waiting for Chrome');
            }, 15000);

            // Timeout aumentado a 120 segundos para servidores lentos
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('WhatsApp initialization timeout after 120 seconds')), 120000)
            );

            await Promise.race([initPromise, timeoutPromise]);

            clearInterval(progressInterval);
            this.isInitializing = false;
            logger.info('[WhatsAppWeb] Client initialized successfully');
        } catch (error: any) {
            this.isInitializing = false;
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
     * Verifica si está en proceso de inicialización
     */
    public isClientInitializing(): boolean {
        return this.isInitializing;
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
     * Envía un mensaje con botones (simulado con texto mejorado)
     * whatsapp-web.js no soporta botones nativos - WhatsApp los bloquea activamente
     * @see https://github.com/pedroslopez/whatsapp-web.js/issues/2632
     */
    public async sendButtons(
        to: string,
        bodyText: string,
        buttons: Array<{ id: string; title: string; emoji?: string }>
    ): Promise<SendMessageResult> {
        // Emojis numéricos para mejor visualización
        const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        const buttonText = buttons
            .map((btn, index) => {
                const emoji = btn.emoji || numberEmojis[index] || `${index + 1}.`;
                return `${emoji} ${btn.title}`;
            })
            .join('\n');

        const fullMessage = `${bodyText}\n\n${buttonText}\n\n_Responde con el número de tu opción_`;

        return this.sendText(to, fullMessage);
    }

    /**
     * Envía una lista de opciones (simulada con texto)
     * Ideal para menús o listas largas de opciones
     */
    public async sendList(
        to: string,
        headerText: string,
        bodyText: string,
        sections: Array<{
            title: string;
            items: Array<{ id: string; title: string; description?: string }>
        }>,
        footerText?: string
    ): Promise<SendMessageResult> {
        let message = '';

        if (headerText) {
            message += `*${headerText}*\n\n`;
        }

        if (bodyText) {
            message += `${bodyText}\n\n`;
        }

        let itemNumber = 1;
        for (const section of sections) {
            message += `━━━ *${section.title}* ━━━\n`;
            for (const item of section.items) {
                message += `*${itemNumber}.* ${item.title}`;
                if (item.description) {
                    message += `\n   _${item.description}_`;
                }
                message += '\n';
                itemNumber++;
            }
            message += '\n';
        }

        if (footerText) {
            message += `${footerText}\n`;
        }

        message += `\n_Responde con el número de tu opción_`;

        return this.sendText(to, message);
    }

    /**
     * Envía una imagen desde URL con caption opcional
     * @param to Número de teléfono
     * @param imageUrl URL de la imagen
     * @param caption Texto opcional debajo de la imagen
     */
    public async sendImage(
        to: string,
        imageUrl: string,
        caption?: string
    ): Promise<SendMessageResult> {
        if (!this.isEnabled()) {
            logger.warn('[WhatsAppWeb] Cannot send image - client not ready');
            return { success: false, error: 'WhatsApp no está conectado' };
        }

        try {
            const chatId = this.formatPhoneNumber(to);

            // Descargar imagen desde URL
            const media = await MessageMedia.fromUrl(imageUrl, {
                unsafeMime: true // Permitir tipos MIME no estándar
            });

            const result = await this.client?.sendMessage(chatId, media, {
                caption: caption || ''
            });

            this.lastActivity = new Date();
            logger.info('[WhatsAppWeb] Image sent', { to: chatId, messageId: result?.id?._serialized });

            return {
                success: true,
                messageId: result?.id?._serialized
            };
        } catch (error: any) {
            logger.error('[WhatsAppWeb] Failed to send image', { to, imageUrl, error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Envía una imagen con texto encima (como mensaje combinado)
     * Primero envía el texto, luego la imagen
     */
    public async sendImageWithText(
        to: string,
        text: string,
        imageUrl: string
    ): Promise<SendMessageResult> {
        // Enviar texto primero
        const textResult = await this.sendText(to, text);
        if (!textResult.success) {
            return textResult;
        }

        // Luego enviar imagen
        return this.sendImage(to, imageUrl);
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
