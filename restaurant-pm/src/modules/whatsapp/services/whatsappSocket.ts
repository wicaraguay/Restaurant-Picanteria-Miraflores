/**
 * @file whatsappSocket.ts
 * @description Servicio WebSocket para comunicación en tiempo real con WhatsApp
 *
 * Reemplaza el polling HTTP por WebSocket para recibir el QR instantáneamente.
 */

import { io, Socket } from 'socket.io-client';

interface WhatsAppSocketStatus {
    isEnabled: boolean;
    isReady: boolean;
    isAuthenticated: boolean;
    phoneNumber: string | null;
    lastActivity: string | null;
    hasQR: boolean;
}

interface WhatsAppQRData {
    qrCode: string;
    timestamp: string;
}

type EventCallback = (data: any) => void;

class WhatsAppSocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<EventCallback>> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private isConnecting = false;

    /**
     * Conecta al WebSocket del backend
     */
    public connect(): void {
        if (this.socket?.connected || this.isConnecting) {
            console.log('[WhatsAppSocket] Already connected or connecting');
            return;
        }

        this.isConnecting = true;

        // URL del WebSocket (mismo origen que la API)
        // VITE_API_URL puede ser: https://domain.com/api o http://localhost:3000/api
        let wsUrl = window.location.origin;

        const apiUrl = import.meta.env.VITE_API_URL;
        if (apiUrl) {
            try {
                // Extraer solo el origen (protocol + host)
                const url = new URL(apiUrl);
                wsUrl = url.origin;
            } catch {
                // Si no es URL válida, intentar limpiar manualmente
                wsUrl = apiUrl.replace(/\/api\/?$/, '');
            }
        }

        console.log('[WhatsAppSocket] Connecting to:', wsUrl);

        try {
            this.socket = io(wsUrl, {
                path: '/ws/whatsapp',
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 10000,
                autoConnect: true
            });

            this.setupEventHandlers();
        } catch (error) {
            console.error('[WhatsAppSocket] Connection error:', error);
            this.isConnecting = false;
        }
    }

    /**
     * Configura los handlers de eventos del socket
     */
    private setupEventHandlers(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('[WhatsAppSocket] Connected successfully');
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.emit('connected', { connected: true });
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[WhatsAppSocket] Disconnected:', reason);
            this.emit('disconnected', { reason });
        });

        this.socket.on('connect_error', (error) => {
            console.error('[WhatsAppSocket] Connection error:', error.message);
            this.isConnecting = false;
            this.reconnectAttempts++;

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.warn('[WhatsAppSocket] Max reconnect attempts reached, falling back to HTTP polling');
                this.emit('fallback', { reason: 'max_reconnect_attempts' });
            }
        });

        // Re-emit eventos de WhatsApp a los listeners
        const whatsappEvents = ['qr', 'status', 'authenticated', 'ready', 'auth_failure'];
        whatsappEvents.forEach(event => {
            this.socket?.on(event, (data: any) => {
                console.log(`[WhatsAppSocket] Event received: ${event}`, data);
                this.emit(event, data);
            });
        });
    }

    /**
     * Desconecta el WebSocket
     */
    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnecting = false;
            console.log('[WhatsAppSocket] Manually disconnected');
        }
    }

    /**
     * Suscribe un callback a un evento
     * @returns Función para desuscribirse
     */
    public on(event: string, callback: EventCallback): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        // Retorna función para desuscribirse
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }

    /**
     * Emite un evento a los listeners locales
     */
    private emit(event: string, data: any): void {
        this.listeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[WhatsAppSocket] Error in listener for ${event}:`, error);
            }
        });
    }

    /**
     * Solicita el QR actual al servidor
     */
    public requestQR(): void {
        if (this.socket?.connected) {
            this.socket.emit('request-qr');
        }
    }

    /**
     * Solicita el estado actual
     */
    public requestStatus(): void {
        if (this.socket?.connected) {
            this.socket.emit('request-status');
        }
    }

    /**
     * Verifica si está conectado al WebSocket
     */
    public isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    /**
     * Obtiene el ID del socket
     */
    public getSocketId(): string | null {
        return this.socket?.id ?? null;
    }
}

// Exportar singleton
export const whatsappSocket = new WhatsAppSocketService();

// Exportar tipos
export type { WhatsAppSocketStatus, WhatsAppQRData };
