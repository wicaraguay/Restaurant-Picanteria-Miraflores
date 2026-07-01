/**
 * WhatsApp Chatbot - Versión Simplificada y Optimizada
 */

import { WhatsAppWebClient } from './WhatsAppWebClient';
import { logger } from '../../utils/Logger';
import { getChatbotConfigRepository } from '../../repositories/ChatbotConfigRepository';

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

    // Cache del menú para no consultar DB cada mensaje
    private menuCache: string | null = null;
    private menuCacheTime: number = 0;
    private readonly MENU_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

    constructor(client?: WhatsAppWebClient) {
        if (client) {
            this.client = client;
        }
        // Cargar config automáticamente
        this.loadConfig();
    }

    public setClient(client: WhatsAppWebClient): void {
        this.client = client;
    }

    public setMenuRepository(repo: any): void {
        this.menuRepository = repo;
        logger.info('[WhatsAppChatbot] Menu repository set');
    }

    /**
     * Carga configuración desde el repositorio
     */
    private async loadConfig(): Promise<void> {
        try {
            const configRepo = getChatbotConfigRepository();
            const fullConfig = await configRepo.get();
            this.config = {
                businessName: fullConfig.businessName,
                businessPhone: fullConfig.paymentInfo?.banks?.[0]?.accountNumber || '',
                schedule: fullConfig.schedule
            };
            logger.info('[WhatsAppChatbot] Config loaded', { businessName: this.config.businessName });
        } catch (error) {
            logger.error('[WhatsAppChatbot] Failed to load config', { error });
        }
    }

    public async reloadConfig(): Promise<void> {
        await this.loadConfig();
        this.clearMenuCache();
    }

    public setConfig(config: ChatbotConfig): void {
        this.config = config;
    }

    private clearMenuCache(): void {
        this.menuCache = null;
        this.menuCacheTime = 0;
    }

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
     * Obtiene el menú del día (con cache)
     */
    private async getDailyMenu(): Promise<string> {
        // Verificar cache
        const now = Date.now();
        if (this.menuCache && (now - this.menuCacheTime) < this.MENU_CACHE_TTL) {
            logger.debug('[WhatsAppChatbot] Using cached menu');
            return this.menuCache;
        }

        try {
            if (!this.menuRepository) {
                logger.warn('[WhatsAppChatbot] Menu repository not set');
                return 'Menu no disponible en este momento.';
            }

            const items = await this.menuRepository.findAvailable();

            if (!items || items.length === 0) {
                logger.warn('[WhatsAppChatbot] No available items found');
                return 'No hay productos disponibles en este momento.';
            }

            const businessName = this.config?.businessName || 'Nuestro Restaurante';

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
            menu += `\nPara pedidos, responde a este mensaje o llama!`;

            // Guardar en cache
            this.menuCache = menu;
            this.menuCacheTime = now;
            logger.info('[WhatsAppChatbot] Menu cached', { itemCount: items.length });

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

        logger.info('[WhatsAppChatbot] Processing message', { from, text: text?.substring(0, 50) });

        // Cargar config si no existe
        if (!this.config) {
            await this.loadConfig();
        }

        // Verificar horario
        const businessHours = this.checkBusinessHours();

        if (!businessHours.isOpen) {
            logger.info('[WhatsAppChatbot] Outside business hours, sending closed message');
            await this.sendMessage(from, businessHours.message);
            return;
        }

        // Enviar menú del día
        const menu = await this.getDailyMenu();
        await this.sendMessage(from, menu);
    }

    private async sendMessage(to: string, text: string): Promise<void> {
        if (!this.client) {
            logger.error('[WhatsAppChatbot] Client not set - cannot send message');
            return;
        }

        if (!this.client.isEnabled()) {
            logger.error('[WhatsAppChatbot] Client not ready - cannot send message');
            return;
        }

        try {
            const result = await this.client.sendText(to, text);
            if (result.success) {
                logger.info('[WhatsAppChatbot] Message sent successfully', { to });
            } else {
                logger.error('[WhatsAppChatbot] Failed to send message', { to, error: result.error });
            }
        } catch (error) {
            logger.error('[WhatsAppChatbot] Error sending message', { to, error });
        }
    }

    // Métodos de compatibilidad
    public getActiveConversations(): any[] { return []; }
    public getConversation(id: string): any { return null; }
    public async setManualMode(phone: string, enabled: boolean): Promise<boolean> { return false; }
    public getManualModeConversations(): any[] { return []; }
    public async loadMenuFromDatabase(): Promise<number> { return 0; }
}
