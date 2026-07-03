/**
 * Servicio de alertas "cliente escribiendo por WhatsApp".
 * Las alertas se persisten en el backend y quedan PENDIENTES hasta que
 * el personal las marque como atendidas.
 */

import { apiService } from '../../../api';

export interface WhatsAppAlert {
    id: string;
    phone: string;
    name: string | null;
    /** Último mensaje del cliente en esta conversación pendiente */
    text: string;
    /** Cuántos mensajes acumula la conversación desde que quedó pendiente */
    messageCount: number;
    lastMessageAt: string;
    attended: boolean;
    createdAt: string;
}

class WhatsAppAlertService {
    /** Alertas pendientes (no atendidas), más recientes primero */
    public async getPending(): Promise<WhatsAppAlert[]> {
        const data = await apiService.get<WhatsAppAlert[]>('/whatsapp/alerts');
        return Array.isArray(data) ? data : [];
    }

    /** Marca una alerta como atendida */
    public async markAttended(id: string): Promise<void> {
        await apiService.put(`/whatsapp/alerts/${id}/attend`, {});
    }

    /** Marca todas las alertas pendientes como atendidas */
    public async markAllAttended(): Promise<void> {
        await apiService.put('/whatsapp/alerts/attend-all', {});
    }
}

export const whatsappAlertService = new WhatsAppAlertService();
