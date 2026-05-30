/**
 * Tipos para el modulo de WhatsApp (whatsapp-web.js)
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

export interface WhatsAppConversation {
    id: string;
    customerPhone: string;
    customerName?: string;
    status: 'active' | 'idle';
    currentStep: string;
    orderItems: Array<{ name: string; quantity: number; price: number }>;
    lastActivity: string;
}

export interface WhatsAppStats {
    isConnected: boolean;
    phoneNumber: string | null;
    totalConversations: number;
    activeConversations: number;
    lastActivity: string | null;
}

export type WhatsAppTab = 'config' | 'conversations' | 'stats' | 'chatbot';
