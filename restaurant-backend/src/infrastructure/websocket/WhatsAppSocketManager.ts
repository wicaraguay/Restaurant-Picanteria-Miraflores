/**
 * @file WhatsAppSocketManager.ts
 * @description Gestiona WebSocket para comunicación en tiempo real del QR de WhatsApp
 *
 * Elimina la necesidad de polling HTTP cada 10 segundos.
 * El QR se envía instantáneamente cuando está disponible.
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import QRCode from 'qrcode';
import { logger } from '../utils/Logger';
import { getWhatsAppClient, isWhatsAppEnabled } from '../services/whatsapp/WhatsAppWebClient';

export class WhatsAppSocketManager {
    private static instance: WhatsAppSocketManager;
    private io: SocketIOServer | null = null;
    private qrImageCache: string | null = null;

    private constructor() {}

    public static getInstance(): WhatsAppSocketManager {
        if (!WhatsAppSocketManager.instance) {
            WhatsAppSocketManager.instance = new WhatsAppSocketManager();
        }
        return WhatsAppSocketManager.instance;
    }

    /**
     * Inicializa el servidor WebSocket
     */
    public initialize(server: HttpServer): void {
        if (!isWhatsAppEnabled()) {
            logger.info('[WhatsAppSocket] WhatsApp disabled, skipping WebSocket initialization');
            return;
        }

        this.io = new SocketIOServer(server, {
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || '*',
                methods: ['GET', 'POST'],
                credentials: true
            },
            path: '/ws/whatsapp',
            transports: ['websocket', 'polling']
        });

        this.io.on('connection', (socket: Socket) => {
            logger.info(`[WhatsAppSocket] Client connected: ${socket.id}`);

            // Enviar estado actual inmediatamente al conectar
            this.sendCurrentStatus(socket);

            socket.on('disconnect', () => {
                logger.debug(`[WhatsAppSocket] Client disconnected: ${socket.id}`);
            });

            // Cliente solicita QR manualmente
            socket.on('request-qr', () => {
                logger.debug(`[WhatsAppSocket] QR requested by client: ${socket.id}`);
                this.sendCurrentStatus(socket);
            });

            // Cliente solicita estado
            socket.on('request-status', () => {
                this.sendCurrentStatus(socket);
            });
        });

        this.setupWhatsAppListeners();
        logger.info('[WhatsAppSocket] WebSocket server initialized on /ws/whatsapp');
    }

    /**
     * Configura los listeners de eventos de WhatsApp
     */
    private setupWhatsAppListeners(): void {
        const client = getWhatsAppClient();
        if (!client) {
            logger.warn('[WhatsAppSocket] WhatsApp client not available for listeners');
            return;
        }

        // QR generado - convertir a imagen y enviar
        client.on('qr', async (qr: string) => {
            try {
                // Cachear QR como imagen base64
                this.qrImageCache = await QRCode.toDataURL(qr, {
                    width: 300,
                    margin: 2
                });

                logger.info('[WhatsAppSocket] Broadcasting QR to all clients');
                this.broadcast('qr', {
                    qrCode: this.qrImageCache,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                logger.error('[WhatsAppSocket] Error converting QR to image', { error });
            }
        });

        // Autenticado
        client.on('authenticated', () => {
            this.qrImageCache = null; // Limpiar cache de QR
            logger.info('[WhatsAppSocket] Broadcasting authenticated event');
            this.broadcast('authenticated', {
                message: 'WhatsApp autenticado correctamente',
                timestamp: new Date().toISOString()
            });
        });

        // Listo para usar
        client.on('ready', (phoneNumber?: string) => {
            this.qrImageCache = null;
            logger.info('[WhatsAppSocket] Broadcasting ready event');
            this.broadcast('ready', {
                message: 'WhatsApp está listo',
                phoneNumber,
                timestamp: new Date().toISOString()
            });
        });

        // Desconectado
        client.on('disconnected', (reason: string) => {
            logger.info('[WhatsAppSocket] Broadcasting disconnected event');
            this.broadcast('disconnected', {
                reason,
                timestamp: new Date().toISOString()
            });
        });

        // Error de autenticación
        client.on('auth_failure', (message: string) => {
            this.qrImageCache = null;
            logger.info('[WhatsAppSocket] Broadcasting auth_failure event');
            this.broadcast('auth_failure', {
                message,
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Envía el estado actual a un socket específico
     */
    private async sendCurrentStatus(socket: Socket): Promise<void> {
        const client = getWhatsAppClient();

        if (!client) {
            socket.emit('status', {
                isEnabled: false,
                message: 'WhatsApp no está habilitado'
            });
            return;
        }

        const status = client.getStatus();

        // Enviar estado
        socket.emit('status', {
            isEnabled: true,
            isReady: status.isReady,
            isAuthenticated: status.isAuthenticated,
            phoneNumber: status.phoneNumber,
            lastActivity: status.lastActivity,
            hasQR: !!status.qrCode || !!this.qrImageCache
        });

        // Si hay QR disponible y no está autenticado, enviarlo
        if (!status.isAuthenticated && (status.qrCode || this.qrImageCache)) {
            if (this.qrImageCache) {
                socket.emit('qr', {
                    qrCode: this.qrImageCache,
                    timestamp: new Date().toISOString()
                });
            } else if (status.qrCode) {
                // Generar imagen si no está cacheada
                try {
                    this.qrImageCache = await QRCode.toDataURL(status.qrCode, {
                        width: 300,
                        margin: 2
                    });
                    socket.emit('qr', {
                        qrCode: this.qrImageCache,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    logger.error('[WhatsAppSocket] Error generating QR image', { error });
                }
            }
        }
    }

    /**
     * Envía un evento a todos los clientes conectados
     */
    public broadcast(event: string, data: any): void {
        if (this.io) {
            this.io.emit(event, data);
            logger.debug(`[WhatsAppSocket] Broadcast: ${event}`, { clientCount: this.io.engine.clientsCount });
        }
    }

    /**
     * Obtiene la instancia de Socket.IO
     */
    public getIO(): SocketIOServer | null {
        return this.io;
    }

    /**
     * Cierra el servidor WebSocket
     */
    public async close(): Promise<void> {
        if (this.io) {
            await this.io.close();
            this.io = null;
            logger.info('[WhatsAppSocket] WebSocket server closed');
        }
    }
}

export const whatsAppSocketManager = WhatsAppSocketManager.getInstance();
