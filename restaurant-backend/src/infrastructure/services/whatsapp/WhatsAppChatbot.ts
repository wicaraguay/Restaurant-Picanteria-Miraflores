/**
 * WhatsApp Chatbot - Versión Simplificada
 *
 * Funcionalidad:
 * - Responde con el menú del día cuando alguien escribe
 * - Informa que está cerrado si está fuera de horario
 * - Muestra horarios de atención
 */

import { WhatsAppWebClient } from './WhatsAppWebClient';
import { logger } from '../../utils/Logger';

export interface IncomingMessage {
    from: string;
    text?: string;
    type?: string;
}

export interface DaySchedule {
    dayOfWeek: number;
    dayName: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
}

export interface ChatbotConfig {
    welcomeMessage?: string;
    businessName?: string;
    businessPhone?: string;
    businessAddress?: string;
    schedule?: {
        enabled: boolean;
        timezone: string;
        days: DaySchedule[];
        closedMessage?: string;
    };
}

export class WhatsAppChatbot {
    private client: WhatsAppWebClient | null = null;
    private config: ChatbotConfig | null = null;
    private menuRepository: any = null;

    constructor(client?: WhatsAppWebClient) {
        if (client) {
            this.client = client;
        }
    }

    public setClient(client: WhatsAppWebClient): void {
        this.client = client;
    }

    public setMenuRepository(repo: any): void {
        this.menuRepository = repo;
    }

    public async reloadConfig(): Promise<void> {
        // Se carga desde el repositorio de configuración
    }

    public setConfig(config: ChatbotConfig): void {
        this.config = config;
    }

    /**
     * Normaliza el número de teléfono
     */
    private normalizePhone(phone: string): string {
        let cleaned = phone.replace(/@(lid|c\.us|s\.whatsapp\.net|g\.us)$/i, '');
        cleaned = cleaned.replace(/[\s\-\(\)\+]/g, '');

        if (cleaned.startsWith('09') && cleaned.length === 10) {
            cleaned = '593' + cleaned.substring(1);
        } else if (cleaned.startsWith('9') && cleaned.length === 9) {
            cleaned = '593' + cleaned;
        }

        return cleaned + '@c.us';
    }

    /**
     * Verifica si está dentro del horario de atención
     */
    private checkBusinessHours(): { isOpen: boolean; message: string } {
        const schedule = this.config?.schedule;
        if (!schedule?.enabled || !schedule.days) {
            return { isOpen: true, message: '' };
        }

        const now = new Date();
        const dayOfWeek = now.getDay();
        const currentTime = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            timeZone: schedule.timezone || 'America/Guayaquil'
        });

        const todaySchedule = schedule.days.find(d => d.dayOfWeek === dayOfWeek);

        if (!todaySchedule || !todaySchedule.isOpen) {
            return {
                isOpen: false,
                message: this.buildClosedMessage(schedule.days)
            };
        }

        if (currentTime < todaySchedule.openTime || currentTime > todaySchedule.closeTime) {
            return {
                isOpen: false,
                message: this.buildClosedMessage(schedule.days)
            };
        }

        return { isOpen: true, message: '' };
    }

    /**
     * Construye mensaje de horario cerrado
     */
    private buildClosedMessage(days: DaySchedule[]): string {
        const businessName = this.config?.businessName || 'el negocio';
        let message = `Hola! Gracias por escribirnos.\n\n`;
        message += `En este momento ${businessName} esta cerrado.\n\n`;
        message += `*HORARIOS DE ATENCION:*\n`;

        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

        for (const day of days) {
            if (day.isOpen) {
                message += `${dayNames[day.dayOfWeek]}: ${day.openTime} - ${day.closeTime}\n`;
            }
        }

        message += `\nTe esperamos pronto!`;
        return message;
    }

    /**
     * Obtiene el menú del día actual
     */
    private async getDailyMenu(): Promise<string> {
        try {
            if (!this.menuRepository) {
                return 'Menu no disponible en este momento.';
            }

            const items = await this.menuRepository.findAvailable();

            if (!items || items.length === 0) {
                return 'No hay productos disponibles en este momento.';
            }

            const businessName = this.config?.businessName || 'Nuestro Restaurante';
            const businessPhone = this.config?.businessPhone || '';
            const businessAddress = this.config?.businessAddress || '';

            let menu = `*${businessName}*\n\n`;
            menu += `*MENU DEL DIA*\n`;
            menu += `━━━━━━━━━━━━━━━━━━━━\n\n`;

            // Agrupar por categoría
            const categories: { [key: string]: any[] } = {};
            for (const item of items) {
                const cat = item.category || 'Otros';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(item);
            }

            for (const [category, categoryItems] of Object.entries(categories)) {
                menu += `*${category}*\n`;
                for (const item of categoryItems) {
                    menu += `  • ${item.name} - $${item.price.toFixed(2)}\n`;
                }
                menu += `\n`;
            }

            menu += `━━━━━━━━━━━━━━━━━━━━\n`;

            if (businessPhone) {
                menu += `*Pedidos:* ${businessPhone}\n`;
            }
            if (businessAddress) {
                menu += `*Direccion:* ${businessAddress}\n`;
            }

            menu += `\nTe esperamos!`;

            return menu;
        } catch (error) {
            logger.error('[WhatsAppChatbot] Error getting menu', { error });
            return 'Error al cargar el menu. Intenta mas tarde.';
        }
    }

    /**
     * Procesa un mensaje entrante
     */
    public async processMessage(message: IncomingMessage): Promise<void> {
        let { from } = message;
        const { text } = message;

        // Ignorar mensajes de broadcast/status/grupos
        if (from.includes('broadcast') || from.includes('status') || from.includes('@g.us')) {
            return;
        }

        // Normalizar teléfono
        from = this.normalizePhone(from);

        logger.info('[WhatsAppChatbot] Message received', { from, text: text?.substring(0, 50) });

        // Verificar horario
        const businessHours = this.checkBusinessHours();

        if (!businessHours.isOpen) {
            await this.sendMessage(from, businessHours.message);
            return;
        }

        // Enviar menú del día
        const menu = await this.getDailyMenu();
        await this.sendMessage(from, menu);
    }

    /**
     * Envía un mensaje
     */
    private async sendMessage(to: string, text: string): Promise<void> {
        if (!this.client) {
            logger.warn('[WhatsAppChatbot] Client not available');
            return;
        }

        try {
            await this.client.sendText(to, text);
        } catch (error) {
            logger.error('[WhatsAppChatbot] Error sending message', { to, error });
        }
    }

    /**
     * Métodos de compatibilidad (retornan datos vacíos)
     */
    public getActiveConversations(): any[] {
        return [];
    }

    public getConversation(id: string): any {
        return null;
    }

    public async setManualMode(phone: string, enabled: boolean): Promise<boolean> {
        return false;
    }

    public getManualModeConversations(): any[] {
        return [];
    }

    public async loadMenuFromDatabase(): Promise<number> {
        return 0;
    }
}
