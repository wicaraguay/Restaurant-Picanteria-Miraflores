/**
 * WhatsApp Chatbot - Simple
 * Envía el menú del día cuando alguien escribe.
 * Emite 'customer_message' (EventEmitter) cuando un cliente escribe,
 * para alertar al personal en el sistema admin.
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/Logger';
import { getWhatsAppClient } from './WhatsAppClient';
import { getChatbotConfigRepository } from '../../repositories/ChatbotConfigRepository';
import { getChatbotDailySendRepository } from '../../repositories/ChatbotDailySendRepository';

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

export class WhatsAppChatbot extends EventEmitter {
    private menuRepository: any = null;
    private categoryRepository: any = null;
    private config: ChatbotConfig | null = null;
    private menuCache: string | null = null;
    private menuCacheExpiry: number = 0;

    // REGLA DE ENVÍO: menú y mensaje de horario se envían MÁXIMO UNA VEZ POR DÍA
    // CALENDARIO (hora Ecuador) a cada usuario. Al día siguiente, todos vuelven a
    // ser elegibles. El control es PERSISTENTE (ChatbotDailySendRepository) para
    // que un deploy/reinicio no duplique envíos el mismo día.

    // Alerta al personal: cooldown propio (más corto que el del menú) para que
    // un cliente que vuelve a escribir re-alerte, sin spamear por cada mensaje
    private alertSent: Map<string, number> = new Map();
    private readonly ALERT_COOLDOWN = 10 * 60 * 1000; // 10 minutos

    constructor() {
        super();
        this.loadConfig();
        logger.info('[Chatbot] Initialized');
    }

    public setMenuRepository(repo: any): void {
        this.menuRepository = repo;
        logger.info('[Chatbot] Menu repository set');
    }

    public setCategoryRepository(repo: any): void {
        this.categoryRepository = repo;
        logger.info('[Chatbot] Category repository set');
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
    public async processMessage(message: { from: string; text?: string; name?: string }): Promise<void> {
        const { from, text, name } = message;

        logger.info('[Chatbot] Processing', { from, text: text?.substring(0, 30) });

        // Alertar al personal en el sistema admin: hay un cliente escribiendo por WhatsApp.
        // Cooldown de 10 min por cliente — el personal recibe una alerta por "ráfaga" de
        // mensajes, no una por cada mensaje.
        this.notifyStaff(from, text, name);

        // Cargar config si no existe
        if (!this.config) {
            await this.loadConfig();
        }

        const today = this.getTodayEcuador();
        const dailySends = getChatbotDailySendRepository();

        // Verificar horario
        if (this.config?.schedule?.enabled) {
            const hours = this.checkBusinessHours();
            if (!hours.isOpen) {
                // Mensaje de horario: máximo UNA VEZ POR DÍA por usuario
                const isFirstToday = await dailySends.tryMarkSentToday(from, 'closed', today);
                if (isFirstToday) {
                    const sent = await this.send(from, hours.message);
                    if (sent) {
                        // Registrar en el historial del chat que el bot respondió
                        this.emit('bot_message', {
                            phone: from.split('@')[0],
                            text: '🤖 Mensaje automático de horario enviado (local cerrado)'
                        });
                    } else {
                        // El envío falló → liberar la marca para reintentar cuando vuelva a escribir
                        await dailySends.unmark(from, 'closed', today);
                    }
                }
                return;
            }
        }

        // Menú del día: máximo UNA VEZ POR DÍA por usuario (nuevo o recurrente).
        // Al cambiar el día calendario (Ecuador), vuelve a enviarse si escribe.
        const isFirstToday = await dailySends.tryMarkSentToday(from, 'menu', today);
        if (isFirstToday) {
            const menu = await this.getMenu();
            const sent = await this.send(from, menu);
            if (sent) {
                // Registrar en el historial del chat que el bot envió el menú
                this.emit('bot_message', {
                    phone: from.split('@')[0],
                    text: '🤖 Menú del día enviado automáticamente'
                });
            } else {
                // El envío falló → liberar la marca para reintentar cuando vuelva a escribir
                await dailySends.unmark(from, 'menu', today);
            }
        }
        // Si ya recibió el menú hoy, no hacer nada - el cliente atiende manualmente
    }

    /**
     * Emite 'customer_message' en CADA mensaje del cliente para que la tarjeta
     * de alerta en el admin siempre muestre el último mensaje y el contador real.
     * El flag `notify` (cooldown 10 min) controla si además debe sonar/vibrar
     * (toast + push) — así una ráfaga de mensajes actualiza la tarjeta sin spamear.
     */
    private notifyStaff(from: string, text?: string, name?: string): void {
        const now = Date.now();
        const lastAlert = this.alertSent.get(from);
        const shouldNotify = !lastAlert || (now - lastAlert) >= this.ALERT_COOLDOWN;

        if (shouldNotify) {
            this.alertSent.set(from, now);
            this.cleanExpiredAlerts();
        }

        const phone = from.split('@')[0];
        this.emit('customer_message', {
            phone,
            // JID COMPLETO — imprescindible para responder: WhatsApp puede entregar
            // identidades ocultas (xxx@lid) cuyo número NO es un teléfono real.
            // Responder a phone@s.whatsapp.net en esos casos va a un número inexistente.
            jid: from,
            name: name || null,
            text: (text || '').substring(0, 1000), // texto completo para el historial del chat
            timestamp: new Date().toISOString(),
            notify: shouldNotify
        });
        logger.info('[Chatbot] Staff alert emitted', { phone, name, notify: shouldNotify });
    }

    private cleanExpiredAlerts(): void {
        const now = Date.now();
        for (const [key, sentAt] of this.alertSent.entries()) {
            if ((now - sentAt) > this.ALERT_COOLDOWN) {
                this.alertSent.delete(key);
            }
        }
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

            let items = await this.menuRepository.findAvailable();

            // Las categorías INACTIVAS no se publican a clientes: sus productos
            // salen del menú de WhatsApp (la web pública ya filtra igual).
            // El POS interno NO se afecta — los empleados pueden seguir vendiéndolos.
            let sortOrderByName: Record<string, number> = {};
            if (this.categoryRepository) {
                try {
                    const categories = await this.categoryRepository.findAll();
                    const inactiveIds = new Set(
                        categories.filter((c: any) => c.available === false).map((c: any) => c.id)
                    );
                    const inactiveNames = new Set(
                        categories.filter((c: any) => c.available === false).map((c: any) => (c.name || '').toLowerCase().trim())
                    );
                    items = items.filter((item: any) => {
                        if (item.categoryId && inactiveIds.has(item.categoryId)) return false;
                        // Fallback legacy: productos sin categoryId se comparan por nombre
                        return !inactiveNames.has((item.category || '').toLowerCase().trim());
                    });
                    // El menú respeta el mismo orden de categorías que la web
                    categories.forEach((c: any) => {
                        sortOrderByName[(c.name || '').toLowerCase().trim()] = c.sortOrder ?? 999;
                    });
                } catch (e) {
                    logger.warn('[Chatbot] Could not filter by category availability', { error: e });
                }
            }

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

            const orderedCats = Object.entries(cats).sort(([a], [b]) =>
                (sortOrderByName[a.toLowerCase().trim()] ?? 999) - (sortOrderByName[b.toLowerCase().trim()] ?? 999)
            );

            for (const [cat, catItems] of orderedCats) {
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
     * Fecha de HOY en zona horaria de Ecuador (YYYY-MM-DD).
     * El "día" del negocio es el día calendario ecuatoriano, no el UTC del servidor
     * (a las 19:00-24:00 de Ecuador el servidor UTC ya está en el día siguiente).
     */
    private getTodayEcuador(): string {
        const parts = new Intl.DateTimeFormat('es-EC', {
            timeZone: 'America/Guayaquil',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(new Date());

        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        const d = parts.find(p => p.type === 'day')?.value;
        return `${y}-${m}-${d}`;
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
