/**
 * WhatsApp Service - Versión Simplificada
 */

import { apiService } from '../../../api';

const ENDPOINTS = {
    ENABLED: '/whatsapp/enabled',
    STATUS: '/whatsapp/status',
    QR: '/whatsapp/qr',
    CONNECT: '/whatsapp/connect',
    DISCONNECT: '/whatsapp/disconnect',
    RESET_SESSION: '/whatsapp/reset-session',
    SEND: '/whatsapp/send',
    CHATBOT_CONFIG: '/whatsapp/chatbot-config'
};

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

export interface ScheduleDay {
    dayOfWeek: number;
    dayName: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
}

export interface ChatbotConfig {
    businessName?: string;
    businessPhone?: string;
    businessAddress?: string;
    schedule?: {
        enabled: boolean;
        timezone: string;
        days: ScheduleDay[];
        closedMessage?: string;
    };
}

class WhatsAppService {
    async isEnabled(): Promise<{ enabled: boolean; message: string }> {
        return apiService.get(ENDPOINTS.ENABLED);
    }

    async getStatus(): Promise<WhatsAppStatus> {
        return apiService.get(ENDPOINTS.STATUS);
    }

    async getQR(): Promise<WhatsAppQR> {
        return apiService.get(ENDPOINTS.QR);
    }

    async connect(): Promise<{ message: string }> {
        return apiService.post(ENDPOINTS.CONNECT, {});
    }

    async disconnect(): Promise<{ message: string }> {
        return apiService.post(ENDPOINTS.DISCONNECT, {});
    }

    async resetSession(): Promise<{ message: string }> {
        return apiService.post(ENDPOINTS.RESET_SESSION, {});
    }

    async sendMessage(phone: string, message: string): Promise<{ message: string }> {
        return apiService.post(ENDPOINTS.SEND, { phone, message });
    }

    async getChatbotConfig(): Promise<ChatbotConfig> {
        return apiService.get(ENDPOINTS.CHATBOT_CONFIG);
    }

    async updateChatbotConfig(config: Partial<ChatbotConfig>): Promise<ChatbotConfig> {
        return apiService.put(ENDPOINTS.CHATBOT_CONFIG, config);
    }
}

export const whatsappService = new WhatsAppService();
