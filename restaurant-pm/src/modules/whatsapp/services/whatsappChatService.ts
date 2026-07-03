/**
 * Chat integrado de WhatsApp — conversar con clientes desde el sistema.
 * Los mensajes salen por el SERVIDOR (sesión Baileys), sin depender del
 * celular físico del negocio.
 */

import { apiService } from '../../../api';

export interface ChatMessage {
    id: string;
    phone: string;
    direction: 'in' | 'out';
    text: string;
    senderName: string | null;
    createdAt: string;
}

class WhatsAppChatService {
    /** Historial de la conversación (viejo → nuevo) */
    public async getMessages(phone: string): Promise<ChatMessage[]> {
        const data = await apiService.get<ChatMessage[]>(`/whatsapp/chats/${phone}/messages`);
        return Array.isArray(data) ? data : [];
    }

    /** Envía un mensaje al cliente (marca la alerta como atendida en el backend) */
    public async sendMessage(phone: string, text: string): Promise<ChatMessage> {
        return apiService.post<ChatMessage>(`/whatsapp/chats/${phone}/send`, { text });
    }
}

export const whatsappChatService = new WhatsAppChatService();
