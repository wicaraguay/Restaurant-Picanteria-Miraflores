/**
 * WhatsApp Chatbot - Simple
 * Envía el menú del día cuando alguien escribe
 */

import { logger } from '../../utils/Logger';
import { getWhatsAppClient } from './WhatsAppClient';
import { getChatbotConfigRepository } from '../../repositories/ChatbotConfigRepository';

interface ScheduleDay {
    dayOfWeek: number;
    dayName: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
}

interface ChatbotConfig {
    businessName: string;
    schedule?: {
        enabled: boolean;
        timezone: string;
        days: ScheduleDay[];
    };
}

export class WhatsAppChatbot {
    private menuRepository: any = null;
    private config: ChatbotConfig | null = null;
    private menuCache: string | null = null;
    private menuCacheExpiry: number = 0;

    // Registro de usuarios que ya recibieron mensaje de cerrado (expira en 12 horas)
    private closedMessageSent: Map<string, number> = new Map();
    private readonly CLOSED_MESSAGE_COOLDOWN = 12 * 60 * 60 * 1000; // 12 horas

    // Registro de usuarios que ya recibieron el menu (expira en 3 horas)
    private menuSent: Map<string, number> = new Map();
    private readonly MENU_COOLDOWN = 3 * 60 * 60 * 1000; // 3 horas

    constructor() {
        this.loadConfig();
        logger.info('[Chatbot] Initialized');
    }

    public setMenuRepository(repo: any): void {
        this.menuRepository = repo;
        logger.info('[Chatbot] Menu repository set');
    }

    private async loadConfig(): Promise<void> {
        try {
            const repo = getChatbotConfigRepository();
            const fullConfig = await repo.get();
            this.config = {
                businessName: fullConfig.businessName || 'Restaurante',
                schedule: fullConfig.schedule
            };
            logger.info('[Chatbot] Config loaded', { name: this.config.businessName });
        } catch (error) {
            logger.error('[Chatbot] Error loading config', { error });
            this.config = { businessName: 'Restaurante' };
        }
    }

    /**
     * Procesa mensaje entrante
     */
    public async processMessage(message: { from: string; text?: string }): Promise<void> {
        const { from, text } = message;

        logger.info('[Chatbot] Processing', { from, text: text?.substring(0, 30) });

        // Cargar config si no existe
        if (!this.config) {
            await this.loadConfig();
        }

        // Verificar horario
        if (this.config?.schedule?.enabled) {
            const hours = this.checkBusinessHours();
            if (!hours.isOpen) {
                // Solo enviar mensaje de cerrado si no se le envió recientemente
                const lastSent = this.closedMessageSent.get(from);
                const now = Date.now();

                if (!lastSent || (now - lastSent) > this.CLOSED_MESSAGE_COOLDOWN) {
                    await this.send(from, hours.message);
                    this.closedMessageSent.set(from, now);
                    this.cleanExpiredClosedMessages();
                }
                return;
            }
        }

        // Enviar menú solo una vez por usuario
        const lastMenuSent = this.menuSent.get(from);
        const now = Date.now();

        if (!lastMenuSent || (now - lastMenuSent) > this.MENU_COOLDOWN) {
            const menu = await this.getMenu();
            await this.send(from, menu);
            this.menuSent.set(from, now);
            this.cleanExpiredMenuMessages();
        }
        // Si ya recibió el menú, no hacer nada - el cliente atiende manualmente
    }

    private async send(to: string, text: string): Promise<boolean> {
        const client = getWhatsAppClient();

        if (!client || !client.isConnected()) {
            logger.error('[Chatbot] Client not connected');
            return false;
        }

        const result = await client.sendText(to, text);
        return result.success;
    }

    private checkBusinessHours(): { isOpen: boolean; message: string } {
        const schedule = this.config?.schedule;
        if (!schedule?.enabled || !schedule.days) {
            return { isOpen: true, message: '' };
        }

        const now = new Date();
        const dayOfWeek = now.getDay();

        let currentTime: string;
        try {
            currentTime = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                timeZone: schedule.timezone || 'America/Guayaquil'
            });
        } catch {
            currentTime = now.toTimeString().substring(0, 5);
        }

        const today = schedule.days.find(d => d.dayOfWeek === dayOfWeek);

        if (!today || !today.isOpen) {
            return { isOpen: false, message: this.closedMessage() };
        }

        if (currentTime < today.openTime || currentTime > today.closeTime) {
            return { isOpen: false, message: this.closedMessage() };
        }

        return { isOpen: true, message: '' };
    }

    private closedMessage(): string {
        const name = this.config?.businessName || 'el negocio';
        const days = this.config?.schedule?.days || [];

        let msg = `Hola! Gracias por escribirnos.\n\n`;
        msg += `${name} esta cerrado en este momento.\n\n`;
        msg += `*HORARIOS:*\n`;

        const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        for (const day of days) {
            if (day.isOpen) {
                msg += `${dayNames[day.dayOfWeek]}: ${day.openTime} - ${day.closeTime}\n`;
            }
        }

        msg += `\nTe esperamos!`;
        return msg;
    }

    private async getMenu(): Promise<string> {
        const now = Date.now();

        // Cache de 3 minutos
        if (this.menuCache && now < this.menuCacheExpiry) {
            return this.menuCache;
        }

        try {
            if (!this.menuRepository) {
                return 'Menu no disponible. Contactanos por telefono.';
            }

            const items = await this.menuRepository.findAvailable();

            if (!items || items.length === 0) {
                return 'No hay productos disponibles en este momento.';
            }

            const name = this.config?.businessName || 'Restaurante';
            let menu = `*${name}*\n\n`;
            menu += `*MENU DEL DIA*\n`;
            menu += `----------------\n\n`;

            // Agrupar por categoria
            const cats: Record<string, any[]> = {};
            for (const item of items) {
                const cat = item.category || 'General';
                if (!cats[cat]) cats[cat] = [];
                cats[cat].push(item);
            }

            for (const [cat, catItems] of Object.entries(cats)) {
                menu += `*${cat}*\n`;
                for (const item of catItems) {
                    const price = item.price?.toFixed(2) || '0.00';
                    menu += `- ${item.name} - $${price}\n`;
                }
                menu += `\n`;
            }

            menu += `----------------\n`;
            menu += `Para pedidos responde este mensaje!`;

            this.menuCache = menu;
            this.menuCacheExpiry = now + 180000;

            logger.info('[Chatbot] Menu cached', { items: items.length });
            return menu;

        } catch (error) {
            logger.error('[Chatbot] Error loading menu', { error });
            return 'Error cargando el menu. Intenta mas tarde.';
        }
    }

    /**
     * Limpia registros expirados de mensajes de cerrado
     */
    private cleanExpiredClosedMessages(): void {
        const now = Date.now();
        for (const [phone, timestamp] of this.closedMessageSent) {
            if (now - timestamp > this.CLOSED_MESSAGE_COOLDOWN) {
                this.closedMessageSent.delete(phone);
            }
        }
    }

    /**
     * Limpia registros expirados de menus enviados
     */
    private cleanExpiredMenuMessages(): void {
        const now = Date.now();
        for (const [phone, timestamp] of this.menuSent) {
            if (now - timestamp > this.MENU_COOLDOWN) {
                this.menuSent.delete(phone);
            }
        }
    }

    // Compatibilidad
    public getActiveConversations(): any[] { return []; }
    public getConversation(id: string): any { return null; }
    public async setManualMode(phone: string, enabled: boolean): Promise<boolean> { return false; }
    public getManualModeConversations(): any[] { return []; }
    public async loadMenuFromDatabase(): Promise<number> { return 0; }
}

// Singleton
let chatbotInstance: WhatsAppChatbot | null = null;

export function getWhatsAppChatbot(): WhatsAppChatbot {
    if (!chatbotInstance) {
        chatbotInstance = new WhatsAppChatbot();
    }
    return chatbotInstance;
}
