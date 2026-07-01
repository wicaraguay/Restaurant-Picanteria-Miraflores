/**
 * Tipos para WhatsApp - Simplificado
 */

export interface WhatsAppStatus {
    isConnected: boolean;
    isAuthenticated: boolean;
    phoneNumber: string | null;
    hasQR: boolean;
    lastActivity: string | null;
}

export interface WhatsAppQR {
    qrCode: string | null;
    message: string;
    phoneNumber?: string;
}

export type WhatsAppTab = 'config' | 'stats' | 'chatbot';
