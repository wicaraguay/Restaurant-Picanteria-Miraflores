/**
 * WhatsApp Chatbot - Simple y Directo
 * Solo envía el menú del día cuando alguien escribe
 */

import { logger } from '../../utils/Logger';
import { getWhatsAppClient } from './WhatsAppWebClient';
import { getChatbotConfigRepository } from '../../repositories/ChatbotConfigRepository';

interface MenuItem {
    name: string;
    price: number;
    category?: string;
    available: boolean;
}

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
        closedMessage?: string;
    };
}

export class WhatsAppChatbot {
    private menuRepository: any = null;
    private config: ChatbotConfig | null = null;
    private configLoaded: boolean = false;

    // Cache del menú
    private menuCache: string | null = null;
    private menuCacheExpiry: number = 0;

    constructor() {
        logger.info('[Chatbot] Created');
    }

    public setMenuRepository(repo: any): void {
        this.menuRepository = repo;
        logger.info('[Chatbot] Menu repository set');
    }

    /**
     * Carga la configuración del chatbot
     */
    private async ensureConfig(): Promise<void> {
        if (this.configLoaded && this.config) return;

        try {
            const repo = getChatbotConfigRepository();
            const fullConfig = await repo.get();

            this.config = {
                businessName: fullConfig.businessName || 'Restaurante',
                schedule: fullConfig.schedule
            };

            this.configLoaded = true;
            logger.info('[Chatbot] Config loaded', { businessName: this.config.businessName });
        } catch (error) {
            logger.error('[Chatbot] Failed to load config', { error });
            // Config por defecto
            this.config = { businessName: 'Restaurante' };
            this.configLoaded = true;
        }
    }

    /**
     * Procesa un mensaje entrante
     */
    public async processMessage(message: { from: string; text?: string }): Promise<void> {
        const { from, text } = message;

        // Ignorar broadcast, status y grupos
        if (from.includes('broadcast') || from.includes('status') || from.includes('@g.us')) {
            return;
        }

        logger.info('[Chatbot] Message received', { from, text: text?.substring(0, 30) });

        // Asegurar que tenemos config
        await this.ensureConfig();

        // Normalizar teléfono
        const phone = this.normalizePhone(from);

        // Verificar horario
        if (this.config?.schedule?.enabled) {
            const hours = this.checkBusinessHours();
            if (!hours.isOpen) {
                await this.send(phone, hours.message);
                return;
            }
        }

        // Enviar menú
        const menu = await this.getMenu();
        await this.send(phone, menu);
    }

    /**
     * Envía mensaje usando el cliente de WhatsApp
     */
    private async send(to: string, text: string): Promise<boolean> {
        const client = getWhatsAppClient();

        if (!client) {
            logger.error('[Chatbot] No WhatsApp client available');
            return false;
        }

        if (!client.isEnabled()) {
            logger.error('[Chatbot] WhatsApp client not ready');
            return false;
        }

        try {
            const result = await client.sendText(to, text);

            if (result.success) {
                logger.info('[Chatbot] Message sent', { to });
            } else {
                logger.error('[Chatbot] Failed to send', { to, error: result.error });
            }

            return result.success;
        } catch (error) {
            logger.error('[Chatbot] Send error', { to, error });
            return false;
        }
    }

    /**
     * Normaliza número de teléfono
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
     * Verifica horario de atención
     */
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

    /**
     * Genera mensaje de cerrado
     */
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

    /**
     * Obtiene el menú (con cache de 3 minutos)
     */
    private async getMenu(): Promise<string> {
        const now = Date.now();

        // Usar cache si es válido
        if (this.menuCache && now < this.menuCacheExpiry) {
            return this.menuCache;
        }

        // Obtener de la base de datos
        try {
            if (!this.menuRepository) {
                logger.warn('[Chatbot] No menu repository');
                return 'Menu no disponible. Contactanos por telefono.';
            }

            const items: MenuItem[] = await this.menuRepository.findAvailable();

            if (!items || items.length === 0) {
                return 'No hay productos disponibles en este momento.';
            }

            // Construir menú
            const name = this.config?.businessName || 'Restaurante';
            let menu = `*${name}*\n\n`;
            menu += `*MENU DEL DIA*\n`;
            menu += `━━━━━━━━━━━━━━━━\n\n`;

            // Agrupar por categoría
            const cats: Record<string, MenuItem[]> = {};
            for (const item of items) {
                const cat = item.category || 'General';
                if (!cats[cat]) cats[cat] = [];
                cats[cat].push(item);
            }

            for (const [cat, catItems] of Object.entries(cats)) {
                menu += `*${cat}*\n`;
                for (const item of catItems) {
                    menu += `• ${item.name} - $${item.price.toFixed(2)}\n`;
                }
                menu += `\n`;
            }

            menu += `━━━━━━━━━━━━━━━━\n`;
            menu += `Para pedidos responde este mensaje!`;

            // Guardar en cache (3 minutos)
            this.menuCache = menu;
            this.menuCacheExpiry = now + 180000;

            logger.info('[Chatbot] Menu loaded', { items: items.length });
            return menu;

        } catch (error) {
            logger.error('[Chatbot] Error loading menu', { error });
            return 'Error cargando el menu. Intenta mas tarde.';
        }
    }

    // Métodos de compatibilidad (no usados)
    public getActiveConversations(): any[] { return []; }
    public getConversation(id: string): any { return null; }
    public async setManualMode(phone: string, enabled: boolean): Promise<boolean> { return false; }
    public getManualModeConversations(): any[] { return []; }
    public async loadMenuFromDatabase(): Promise<number> { return 0; }
}
