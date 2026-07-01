/**
 * WhatsApp Socket Manager - Para QR en tiempo real
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/Logger';
import { getWhatsAppClient, isWhatsAppEnabled } from '../services/whatsapp';

class WhatsAppSocketManager {
    private static instance: WhatsAppSocketManager;
    private io: SocketIOServer | null = null;

    private constructor() {}

    public static getInstance(): WhatsAppSocketManager {
        if (!WhatsAppSocketManager.instance) {
            WhatsAppSocketManager.instance = new WhatsAppSocketManager();
        }
        return WhatsAppSocketManager.instance;
    }

    public initialize(server: HttpServer): void {
        if (!isWhatsAppEnabled()) {
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
            logger.debug('[WS] Client connected', { id: socket.id });
            this.sendStatus(socket);

            socket.on('request-status', () => this.sendStatus(socket));
            socket.on('request-qr', () => this.sendStatus(socket));
            socket.on('disconnect', () => {
                logger.debug('[WS] Client disconnected', { id: socket.id });
            });
        });

        this.setupClientListeners();
        logger.info('[WS] WhatsApp Socket initialized');
    }

    private setupClientListeners(): void {
        const client = getWhatsAppClient();
        if (!client) return;

        // QR generado
        client.on('qr', (qr: string, qrBase64: string) => {
            this.broadcast('qr', { qrCode: qrBase64 });
        });

        // Conectado
        client.on('connected', (phone: string) => {
            this.broadcast('connected', { phoneNumber: phone });
            this.broadcast('status', { isConnected: true, phoneNumber: phone });
        });

        // Desconectado
        client.on('disconnected', () => {
            this.broadcast('disconnected', {});
            this.broadcast('status', { isConnected: false });
        });

        // Sesión cerrada
        client.on('logged_out', () => {
            this.broadcast('logged_out', {});
        });
    }

    private sendStatus(socket: Socket): void {
        const client = getWhatsAppClient();

        if (!client) {
            socket.emit('status', { isConnected: false });
            return;
        }

        const status = client.getStatus();
        socket.emit('status', {
            isConnected: status.isConnected,
            phoneNumber: status.phoneNumber,
            hasQR: !!status.qrCode
        });

        if (status.qrCodeBase64 && !status.isConnected) {
            socket.emit('qr', { qrCode: status.qrCodeBase64 });
        }
    }

    public broadcast(event: string, data: any): void {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    public async close(): Promise<void> {
        if (this.io) {
            await this.io.close();
            this.io = null;
        }
    }
}

export const whatsAppSocketManager = WhatsAppSocketManager.getInstance();
