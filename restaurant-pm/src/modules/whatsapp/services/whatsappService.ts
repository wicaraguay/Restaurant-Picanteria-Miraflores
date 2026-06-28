/**
 * WhatsApp Service (whatsapp-web.js)
 * Servicio para comunicacion con la API de WhatsApp
 */

import { apiService } from '../../../api';

const WHATSAPP_ENDPOINTS = {
    ENABLED: '/whatsapp/enabled',
    STATUS: '/whatsapp/status',
    QR: '/whatsapp/qr',
    CONNECT: '/whatsapp/connect',
    DISCONNECT: '/whatsapp/disconnect',
    RESET_SESSION: '/whatsapp/reset-session',
    CONVERSATIONS: '/whatsapp/conversations',
    STATS: '/whatsapp/stats',
    SEND: '/whatsapp/send',
    RELOAD_MENU: '/whatsapp/reload-menu',
    CHATBOT_CONFIG: '/whatsapp/chatbot-config',
    TAKE_CONVERSATION: '/whatsapp/take-conversation',
    RELEASE_CONVERSATION: '/whatsapp/release-conversation'
};

export interface WhatsAppEnabledResponse {
    enabled: boolean;
    message: string;
}

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

export interface BankAccount {
    bankName: string;
    accountType: 'Ahorros' | 'Corriente';
    accountNumber: string;
    accountHolder: string;
    identification: string;
}

export interface PaymentInfo {
    acceptsCash: boolean;
    acceptsTransfer: boolean;
    transferMessage: string;
    banks: BankAccount[];
}

export interface ScheduleDay {
    dayOfWeek: number;
    dayName: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
}

export interface Schedule {
    enabled: boolean;
    timezone: string;
    days: ScheduleDay[];
    closedMessage: string;
    allowMessagesWhenClosed: boolean;
    messageReceivedWhenClosed: string;
}

export interface BusinessLocation {
    lat: number;
    lng: number;
    address: string;
}

export interface LocationConfig {
    enabled: boolean;
    businessLocation: BusinessLocation;
    maxDeliveryRadiusKm: number;
    costPerKm: number;
    minDeliveryCost: number;
    outOfRangeMessage: string;
    googleMapsApiKey: string;
}

export interface ChatbotConfig {
    businessName: string;
    messages: {
        welcome: string;
        menuHeader: string;
        menuFooter: string;
        askName: string;
        askAddress: string;
        orderConfirmed: string;
        orderCancelled: string;
        itemAdded: string;
        help: string;
        error: string;
        noMenu: string;
    };
    estimatedDeliveryTime: string;
    paymentInfo: PaymentInfo;
    settings: {
        autoReplyEnabled: boolean;
        askForAddress: boolean;
        askForName: boolean;
        sendConfirmationMessage: boolean;
    };
    schedule?: Schedule;
    location?: LocationConfig;
    keywords: {
        greetings: string[];
        menu: string[];
        order: string[];
        cancel: string[];
        confirm: string[];
    };
}

export class WhatsAppService {
    /**
     * Check if WhatsApp is enabled on the server
     */
    async isEnabled(): Promise<WhatsAppEnabledResponse> {
        return apiService.get<WhatsAppEnabledResponse>(WHATSAPP_ENDPOINTS.ENABLED);
    }

    async getStatus(): Promise<WhatsAppStatus> {
        return apiService.get<WhatsAppStatus>(WHATSAPP_ENDPOINTS.STATUS);
    }

    async getQR(): Promise<WhatsAppQR> {
        return apiService.get<WhatsAppQR>(WHATSAPP_ENDPOINTS.QR);
    }

    async connect(): Promise<{ message: string }> {
        return apiService.post<{ message: string }>(WHATSAPP_ENDPOINTS.CONNECT, {});
    }

    async disconnect(): Promise<{ message: string }> {
        return apiService.post<{ message: string }>(WHATSAPP_ENDPOINTS.DISCONNECT, {});
    }

    async resetSession(): Promise<{ message: string }> {
        return apiService.post<{ message: string }>(WHATSAPP_ENDPOINTS.RESET_SESSION, {});
    }

    async getConversations(): Promise<WhatsAppConversation[]> {
        return apiService.get<WhatsAppConversation[]>(WHATSAPP_ENDPOINTS.CONVERSATIONS);
    }

    async getStats(): Promise<WhatsAppStats> {
        return apiService.get<WhatsAppStats>(WHATSAPP_ENDPOINTS.STATS);
    }

    async sendMessage(phone: string, message: string): Promise<{ message: string; messageId?: string }> {
        return apiService.post<{ message: string; messageId?: string }>(WHATSAPP_ENDPOINTS.SEND, { phone, message });
    }

    async reloadMenu(): Promise<{ itemsLoaded: number }> {
        return apiService.post<{ itemsLoaded: number }>(WHATSAPP_ENDPOINTS.RELOAD_MENU, {});
    }

    async getChatbotConfig(): Promise<ChatbotConfig> {
        return apiService.get<ChatbotConfig>(WHATSAPP_ENDPOINTS.CHATBOT_CONFIG);
    }

    async updateChatbotConfig(config: Partial<ChatbotConfig>): Promise<ChatbotConfig> {
        return apiService.put<ChatbotConfig>(WHATSAPP_ENDPOINTS.CHATBOT_CONFIG, config);
    }

    /**
     * Toma control de la conversación (activa modo manual)
     * El chatbot dejará de responder automáticamente
     */
    async takeConversation(phone: string): Promise<{ message: string }> {
        return apiService.post<{ message: string }>(WHATSAPP_ENDPOINTS.TAKE_CONVERSATION, { phone });
    }

    /**
     * Devuelve control al chatbot (desactiva modo manual)
     */
    async releaseConversation(phone: string): Promise<{ message: string }> {
        return apiService.post<{ message: string }>(WHATSAPP_ENDPOINTS.RELEASE_CONVERSATION, { phone });
    }
}

export const whatsappService = new WhatsAppService();
