/**
 * @file WhatsAppChatbot.ts
 * @description Chatbot de WhatsApp para pedidos del restaurante
 *
 * @purpose
 * Maneja conversaciones entrantes de WhatsApp para:
 * - Recibir pedidos de clientes
 * - Mostrar menu
 * - Confirmar pedidos
 * - Consultar estado de pedidos
 *
 * @flow
 * 1. Cliente envia "Hola" o "Menu"
 * 2. Bot responde con menu y opciones
 * 3. Cliente selecciona productos
 * 4. Bot confirma pedido y crea orden
 */

import { WhatsAppWebClient, getWhatsAppClient } from './WhatsAppWebClient';
import { logger } from '../../utils/Logger';
import { IMenuRepository } from '../../../domain/repositories/IMenuRepository';
import { IOrderRepository } from '../../../domain/repositories/IOrderRepository';
import { MenuItem as DomainMenuItem } from '../../../domain/entities/MenuItem';
import { getChatbotConfigRepository, ChatbotConfig } from '../../repositories/ChatbotConfigRepository';
import { getConversationRepository, ConversationRepository, ConversationState as PersistedConversationState } from '../../repositories/ConversationRepository';
import { whatsAppSocketManager } from '../../websocket/WhatsAppSocketManager';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS PARA HORARIOS
// ═══════════════════════════════════════════════════════════════════════════

interface ScheduleDay {
    dayOfWeek: number;
    dayName: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
}

interface BusinessHoursResult {
    isOpen: boolean;
    currentDay: string;
    currentTime: string;
    nextOpenDay?: string;
    nextOpenTime?: string;
    closedMessage?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface ConversationState {
    step: 'IDLE' | 'SHOWING_MENU' | 'SELECTING_ITEMS' | 'CONFIRMING' | 'WAITING_NAME' | 'WAITING_ADDRESS' | 'WAITING_LOCATION' | 'WAITING_FINAL_CONFIRM' | 'WAITING_PAYMENT' | 'MANUAL';
    items: Array<{ name: string; quantity: number; price: number; taxRate: number }>;
    customerName?: string;
    customerAddress?: string;
    lastActivity: Date;
    menuIndexMap?: Map<number, ChatMenuItem>; // Mapa de indice a item del menu
    lastOrderId?: string; // ID del ultimo pedido para consultas de estado
    manualMode?: boolean; // True cuando el admin toma control de la conversacion
    manualModeStartedAt?: Date; // Cuando se activo el modo manual
    // Campos para ubicación y delivery
    customerLocation?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    deliveryDistance?: number; // Distancia en km
    deliveryCost?: number; // Costo calculado del delivery
}

export interface IncomingMessage {
    from: string;           // Phone number (e.g., "593987654321")
    messageId: string;
    type: 'text' | 'button' | 'interactive' | 'image' | 'document' | 'location';
    text?: string;
    buttonPayload?: string;
    listReplyId?: string;
    timestamp: number;
    // Campos para mensajes de ubicación
    latitude?: number;
    longitude?: number;
    locationName?: string;
    locationAddress?: string;
}

export interface ChatMenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    description?: string;
    imageUrl?: string;
    taxRate: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHATBOT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export class WhatsAppChatbot {
    private client: WhatsAppWebClient | null;
    private conversations: Map<string, ConversationState> = new Map();
    private menuItems: ChatMenuItem[] = [];
    private menuRepository?: IMenuRepository;
    private orderRepository?: IOrderRepository;
    private conversationRepo: ConversationRepository;
    private onOrderCreated?: (order: any) => Promise<string | void>; // Retorna el ID del pedido
    private config: ChatbotConfig | null = null;
    private cleanupInterval?: NodeJS.Timeout;
    private manualModeTimeoutMs: number = 30 * 60 * 1000; // 30 minutos timeout para modo manual
    private persistenceEnabled: boolean = true; // Flag para habilitar/deshabilitar persistencia

    constructor() {
        this.client = getWhatsAppClient();
        this.conversationRepo = getConversationRepository();
        this.loadConfig();
        this.loadPersistedConversations(); // Cargar conversaciones de BD al iniciar
        this.startCleanupScheduler();
    }

    /**
     * Carga conversaciones persistidas de la base de datos al iniciar
     */
    private async loadPersistedConversations(): Promise<void> {
        try {
            const persistedConversations = await this.conversationRepo.loadAll();

            for (const [phone, state] of persistedConversations.entries()) {
                // Convertir el estado persistido al formato interno
                const internalState: ConversationState = {
                    step: state.step,
                    items: state.items,
                    customerName: state.customerName,
                    customerAddress: state.customerAddress,
                    lastActivity: state.lastActivity,
                    lastOrderId: state.lastOrderId,
                    manualMode: state.manualMode,
                    manualModeStartedAt: state.manualModeStartedAt,
                    customerLocation: state.customerLocation,
                    deliveryDistance: state.deliveryDistance,
                    deliveryCost: state.deliveryCost,
                    // menuIndexMap se reconstruirá cuando el cliente pida el menú
                };
                this.conversations.set(phone, internalState);
            }

            logger.info('[WhatsAppChatbot] Loaded persisted conversations', {
                count: this.conversations.size
            });
        } catch (error) {
            logger.error('[WhatsAppChatbot] Error loading persisted conversations', { error });
        }
    }

    /**
     * Persiste el estado de una conversación en la BD
     */
    private async persistConversation(phone: string, state: ConversationState): Promise<void> {
        if (!this.persistenceEnabled) return;

        try {
            // Normalizar phone para almacenamiento (sin @c.us)
            const phoneClean = phone.replace('@c.us', '');

            const persistedState: PersistedConversationState = {
                phone: phoneClean,
                step: state.step,
                items: state.items,
                customerName: state.customerName,
                customerAddress: state.customerAddress,
                lastActivity: state.lastActivity,
                lastOrderId: state.lastOrderId,
                manualMode: state.manualMode,
                manualModeStartedAt: state.manualModeStartedAt,
                customerLocation: state.customerLocation,
                deliveryDistance: state.deliveryDistance,
                deliveryCost: state.deliveryCost,
            };

            await this.conversationRepo.upsert(persistedState);
        } catch (error) {
            logger.error('[WhatsAppChatbot] Error persisting conversation', { phone, error });
        }
    }

    /**
     * Check if chatbot is available (WhatsApp client exists)
     */
    public isAvailable(): boolean {
        return this.client !== null;
    }

    /**
     * Get client with null check - throws if not available
     */
    private getClientOrThrow(): WhatsAppWebClient {
        if (!this.client) {
            throw new Error('WhatsApp client not available - chatbot is disabled');
        }
        return this.client;
    }

    /**
     * Inicia el scheduler de limpieza automática
     * Se ejecuta cada 5 minutos para:
     * - Limpiar conversaciones inactivas (>30 min)
     * - Timeout automático de modo manual (>30 min)
     */
    private startCleanupScheduler(): void {
        // Limpiar cualquier interval previo
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        // Ejecutar cada 5 minutos
        this.cleanupInterval = setInterval(() => {
            this.cleanupInactiveConversations();
            this.checkManualModeTimeouts();
        }, 5 * 60 * 1000);

        logger.info('[WhatsAppChatbot] Cleanup scheduler started (every 5 minutes)');
    }

    /**
     * Detiene el scheduler de limpieza
     */
    public stopCleanupScheduler(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
            logger.info('[WhatsAppChatbot] Cleanup scheduler stopped');
        }
    }

    /**
     * Verifica y maneja timeouts de modo manual
     * Si un cliente está en modo manual por más de 30 min sin actividad,
     * lo devuelve al bot automáticamente
     */
    private async checkManualModeTimeouts(): Promise<void> {
        const now = new Date();

        for (const [phone, state] of this.conversations.entries()) {
            if (state.manualMode && state.manualModeStartedAt) {
                const elapsed = now.getTime() - state.manualModeStartedAt.getTime();

                if (elapsed > this.manualModeTimeoutMs) {
                    // Timeout: devolver al bot
                    state.manualMode = false;
                    state.manualModeStartedAt = undefined;
                    state.step = 'IDLE';

                    logger.info('[WhatsAppChatbot] Manual mode timeout, returning to bot', { phone });

                    // Notificar al cliente
                    try {
                        const phoneForSending = phone.replace('@c.us', '');
                        await this.getClientOrThrow().sendText(phoneForSending,
                            `⏰ *Tiempo de espera agotado*\n\n` +
                            `No hemos recibido respuesta del equipo.\n` +
                            `Te devolvemos al asistente automático.\n\n` +
                            `_Escribe *"4"* si aún necesitas hablar con una persona._`
                        );
                        await this.sendWelcome(phoneForSending);
                    } catch (error) {
                        logger.error('[WhatsAppChatbot] Error sending timeout message', { phone, error });
                    }
                }
            }
        }
    }

    /**
     * Carga la configuracion desde la base de datos
     */
    private async loadConfig(): Promise<void> {
        try {
            const configRepo = getChatbotConfigRepository();
            this.config = await configRepo.get();
            logger.info('[WhatsAppChatbot] Config loaded', { businessName: this.config.businessName });
        } catch (error) {
            logger.error('[WhatsAppChatbot] Error loading config', { error });
        }
    }

    /**
     * Recarga la configuracion (llamado cuando se actualiza desde el panel)
     */
    public async reloadConfig(): Promise<void> {
        await this.loadConfig();
        logger.info('[WhatsAppChatbot] Config reloaded');
    }

    /**
     * Obtiene la configuracion actual
     */
    public getConfig(): ChatbotConfig | null {
        return this.config;
    }

    /**
     * Verifica si estamos dentro del horario de atención
     * Considera la zona horaria configurada (por defecto America/Guayaquil)
     */
    public checkBusinessHours(): BusinessHoursResult {
        const schedule = this.config?.schedule;

        // Si no hay horarios configurados o está deshabilitado, siempre abierto
        if (!schedule?.enabled || !schedule?.days || schedule.days.length === 0) {
            return {
                isOpen: true,
                currentDay: '',
                currentTime: ''
            };
        }

        const timezone = schedule.timezone || 'America/Guayaquil';
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        // Obtener fecha/hora actual en la zona horaria configurada
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('es-EC', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            weekday: 'long'
        });

        const parts = formatter.formatToParts(now);
        const weekdayPart = parts.find(p => p.type === 'weekday')?.value || '';
        const hourPart = parts.find(p => p.type === 'hour')?.value || '00';
        const minutePart = parts.find(p => p.type === 'minute')?.value || '00';

        const currentTime = `${hourPart}:${minutePart}`;
        const currentDayIndex = this.getDayIndexFromSpanish(weekdayPart);
        const currentDayName = dayNames[currentDayIndex];

        // Buscar configuración del día actual
        const todaySchedule = schedule.days.find((d: ScheduleDay) => d.dayOfWeek === currentDayIndex);

        if (!todaySchedule || !todaySchedule.isOpen) {
            // Día cerrado - buscar próximo día abierto
            const nextOpen = this.findNextOpenDay(schedule.days, currentDayIndex);
            return {
                isOpen: false,
                currentDay: currentDayName,
                currentTime,
                nextOpenDay: nextOpen?.dayName,
                nextOpenTime: nextOpen?.openTime,
                closedMessage: this.formatClosedMessage(schedule, dayNames)
            };
        }

        // Verificar hora de apertura y cierre
        const openTime = todaySchedule.openTime || '08:00';
        const closeTime = todaySchedule.closeTime || '22:00';

        const isWithinHours = this.isTimeInRange(currentTime, openTime, closeTime);

        if (!isWithinHours) {
            // Fuera de horario hoy
            const beforeOpen = currentTime < openTime;
            return {
                isOpen: false,
                currentDay: currentDayName,
                currentTime,
                nextOpenDay: beforeOpen ? currentDayName : this.findNextOpenDay(schedule.days, currentDayIndex)?.dayName,
                nextOpenTime: beforeOpen ? openTime : this.findNextOpenDay(schedule.days, currentDayIndex)?.openTime,
                closedMessage: this.formatClosedMessage(schedule, dayNames)
            };
        }

        return {
            isOpen: true,
            currentDay: currentDayName,
            currentTime
        };
    }

    /**
     * Convierte nombre de día en español a índice (0-6)
     */
    private getDayIndexFromSpanish(dayName: string): number {
        const lowerDay = dayName.toLowerCase();
        const days: Record<string, number> = {
            'domingo': 0,
            'lunes': 1,
            'martes': 2,
            'miércoles': 3,
            'jueves': 4,
            'viernes': 5,
            'sábado': 6
        };
        return days[lowerDay] ?? 0;
    }

    /**
     * Verifica si una hora está dentro de un rango
     */
    private isTimeInRange(current: string, open: string, close: string): boolean {
        // Convertir a minutos para comparar fácilmente
        const toMinutes = (time: string): number => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const currentMins = toMinutes(current);
        const openMins = toMinutes(open);
        const closeMins = toMinutes(close);

        // Caso normal: apertura antes de cierre (ej: 08:00 - 22:00)
        if (openMins <= closeMins) {
            return currentMins >= openMins && currentMins <= closeMins;
        }

        // Caso especial: cierre después de medianoche (ej: 20:00 - 02:00)
        return currentMins >= openMins || currentMins <= closeMins;
    }

    /**
     * Encuentra el próximo día abierto
     */
    private findNextOpenDay(days: ScheduleDay[], currentDayIndex: number): ScheduleDay | undefined {
        // Buscar en los próximos 7 días
        for (let i = 1; i <= 7; i++) {
            const checkDay = (currentDayIndex + i) % 7;
            const daySchedule = days.find(d => d.dayOfWeek === checkDay);
            if (daySchedule?.isOpen) {
                return daySchedule;
            }
        }
        return undefined;
    }

    /**
     * Formatea el mensaje de cerrado con el horario
     */
    private formatClosedMessage(schedule: any, dayNames: string[]): string {
        let template = schedule.closedMessage ||
            '¡Hola! Gracias por escribirnos.\n\nEn este momento estamos *fuera de horario de atención*.\n\n🕐 Nuestro horario es:\n{schedule}\n\n¡Te esperamos!';

        // Generar texto del horario
        let scheduleText = '';
        if (schedule.days && schedule.days.length > 0) {
            const sortedDays = [...schedule.days].sort((a: ScheduleDay, b: ScheduleDay) => a.dayOfWeek - b.dayOfWeek);
            for (const day of sortedDays) {
                if (day.isOpen) {
                    scheduleText += `• *${day.dayName}*: ${day.openTime} - ${day.closeTime}\n`;
                } else {
                    scheduleText += `• *${day.dayName}*: Cerrado\n`;
                }
            }
        }

        return template.replace('{schedule}', scheduleText.trim());
    }

    /**
     * Configura el repositorio de menu para cargar productos dinamicamente
     */
    public setMenuRepository(repository: IMenuRepository): void {
        this.menuRepository = repository;
    }

    /**
     * Configura el repositorio de ordenes para consultar estado
     */
    public setOrderRepository(repository: IOrderRepository): void {
        this.orderRepository = repository;
    }

    /**
     * Configura el callback para cuando se crea un pedido
     */
    public setOrderCallback(callback: (order: any) => Promise<string | void>): void {
        this.onOrderCreated = callback;
    }

    /**
     * Carga el menu desde la base de datos (solo productos disponibles)
     */
    public async loadMenuFromDatabase(): Promise<number> {
        if (!this.menuRepository) {
            logger.warn('[WhatsAppChatbot] Menu repository not configured');
            return 0;
        }

        try {
            const allItems = await this.menuRepository.findAll();
            // Filtrar solo productos disponibles (available = true)
            const availableItems = allItems.filter(item => item.available === true);

            this.menuItems = availableItems.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                category: item.category,
                description: item.description,
                imageUrl: item.imageUrl,
                taxRate: item.taxRate ?? 0
            }));

            logger.info('[WhatsAppChatbot] Menu loaded from database', {
                total: allItems.length,
                available: this.menuItems.length
            });
            return this.menuItems.length;
        } catch (error) {
            logger.error('[WhatsAppChatbot] Failed to load menu from database', { error });
            return 0;
        }
    }

    /**
     * Carga el menu manualmente (para testing o fallback)
     */
    public setMenu(items: ChatMenuItem[]): void {
        this.menuItems = items;
    }

    /**
     * Obtiene todas las conversaciones activas (para el panel de admin)
     */
    public getActiveConversations(): Array<{
        id: string;
        customerPhone: string;
        status: 'active' | 'idle';
        currentStep: string;
        orderItems: Array<{ name: string; quantity: number; price: number }>;
        lastActivity: Date;
    }> {
        const result: Array<{
            id: string;
            customerPhone: string;
            status: 'active' | 'idle';
            currentStep: string;
            orderItems: Array<{ name: string; quantity: number; price: number }>;
            lastActivity: Date;
        }> = [];

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        for (const [phone, state] of this.conversations.entries()) {
            // Filtrar conversaciones no válidas
            if (phone.includes('broadcast') || phone.includes('status') || phone.includes('@g.us')) {
                continue;
            }
            // Filtrar números que no parecen válidos
            const phoneDigits = phone.replace(/\D/g, '');
            if (phoneDigits.length < 10 || phoneDigits.length > 15) {
                continue;
            }

            result.push({
                id: phone,
                customerPhone: phone,
                status: state.lastActivity > fiveMinutesAgo ? 'active' : 'idle',
                currentStep: state.step,
                orderItems: state.items,
                lastActivity: state.lastActivity
            });
        }

        return result.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    }

    /**
     * Obtiene una conversación específica por ID (teléfono)
     */
    public getConversation(phoneOrId: string): {
        id: string;
        customerPhone: string;
        status: 'active' | 'idle';
        currentStep: string;
        orderItems: Array<{ name: string; quantity: number; price: number }>;
        customerName?: string;
        customerAddress?: string;
        lastActivity: Date;
    } | null {
        const state = this.conversations.get(phoneOrId);
        if (!state) return null;

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        return {
            id: phoneOrId,
            customerPhone: phoneOrId,
            status: state.lastActivity > fiveMinutesAgo ? 'active' : 'idle',
            currentStep: state.step,
            orderItems: state.items,
            customerName: state.customerName,
            customerAddress: state.customerAddress,
            lastActivity: state.lastActivity
        };
    }

    /**
     * Obtiene el menu actual (siempre recarga de DB para reflejar cambios)
     */
    private async getMenu(): Promise<ChatMenuItem[]> {
        // Siempre recargar de DB para reflejar cambios en productos (activar/desactivar)
        if (this.menuRepository) {
            await this.loadMenuFromDatabase();
        }
        return this.menuItems;
    }

    /**
     * Procesa un mensaje entrante
     */
    public async processMessage(message: IncomingMessage): Promise<void> {
        let { from } = message;
        const { type, text, buttonPayload, listReplyId } = message;

        // ═══════════════════════════════════════════════════════════════════
        // FILTRAR MENSAJES NO VÁLIDOS
        // ═══════════════════════════════════════════════════════════════════
        // Ignorar mensajes de broadcast/status de WhatsApp
        if (from.includes('broadcast') || from.includes('status')) {
            logger.debug('[WhatsAppChatbot] Ignoring broadcast/status message', { from });
            return;
        }

        // Ignorar mensajes de grupos
        if (from.includes('@g.us')) {
            logger.debug('[WhatsAppChatbot] Ignoring group message', { from });
            return;
        }

        // Ignorar números que no parecen válidos (muy cortos o sin dígitos)
        const phoneDigits = from.replace(/\D/g, '');
        if (phoneDigits.length < 10 || phoneDigits.length > 15) {
            logger.debug('[WhatsAppChatbot] Ignoring invalid phone number', { from, digits: phoneDigits.length });
            return;
        }
        // ═══════════════════════════════════════════════════════════════════

        // Normalizar el número de teléfono para consistencia
        // IMPORTANTE: Sobrescribir 'from' para que todas las respuestas usen el formato correcto (@c.us)
        const originalFrom = from;
        const normalizedFrom = this.normalizePhone(from);
        from = normalizedFrom; // Usar el normalizado en todas las respuestas

        logger.info('[WhatsAppChatbot] Processing message', { originalFrom, from, type, text: text?.substring(0, 50) });

        // ═══════════════════════════════════════════════════════════════════
        // VERIFICACIÓN DE HORARIO DE ATENCIÓN
        // ═══════════════════════════════════════════════════════════════════
        const businessHours = this.checkBusinessHours();
        if (!businessHours.isOpen) {
            const schedule = this.config?.schedule;

            logger.info('[WhatsAppChatbot] Outside business hours', {
                from: normalizedFrom,
                currentDay: businessHours.currentDay,
                currentTime: businessHours.currentTime
            });

            // Enviar mensaje de horario cerrado
            await this.getClientOrThrow().sendText(from, businessHours.closedMessage ||
                '⏰ Estamos fuera de horario de atención. ¡Te esperamos pronto!'
            );

            // Si permite mensajes cuando está cerrado, guardar el mensaje y confirmar
            if (schedule?.allowMessagesWhenClosed && text) {
                const confirmMsg = schedule.messageReceivedWhenClosed ||
                    'Hemos recibido tu mensaje. Te responderemos cuando abramos. ¡Gracias!';
                await this.getClientOrThrow().sendText(from, `✅ ${confirmMsg}`);

                // Registrar el mensaje recibido fuera de horario
                logger.info('[WhatsAppChatbot] Message received outside hours', {
                    from: normalizedFrom,
                    text: text.substring(0, 100)
                });
            }

            return; // No procesar más
        }
        // ═══════════════════════════════════════════════════════════════════

        // Get or create conversation state (usar número normalizado)
        let state = this.conversations.get(normalizedFrom);
        if (!state) {
            state = {
                step: 'IDLE',
                items: [],
                lastActivity: new Date()
            };
            this.conversations.set(normalizedFrom, state);
        }

        // Update last activity
        state.lastActivity = new Date();

        // Si está en modo manual, verificar si quiere volver al bot
        if (state.manualMode) {
            const textLower = text?.toLowerCase().trim() || '';
            // Si escribe "menu", "hola" o "bot" - desactivar modo manual y volver al bot
            if (textLower === 'menu' || textLower === 'menú' || textLower === 'hola' || textLower === 'bot') {
                state.manualMode = false;
                state.manualModeStartedAt = undefined;
                state.step = 'IDLE';
                logger.info('[WhatsAppChatbot] Manual mode deactivated by customer', { normalizedFrom });
                await this.getClientOrThrow().sendText(from,
                    `🤖 *¡De vuelta al asistente automático!*\n\n` +
                    `¿En qué puedo ayudarte?`
                );
                await this.sendWelcome(from);
                this.conversations.set(normalizedFrom, state);
                await this.persistConversation(normalizedFrom, state);
                return;
            }
            // Si no es comando de salida, no responder (modo manual activo)
            logger.info('[WhatsAppChatbot] Conversation in manual mode, skipping auto-response', { normalizedFrom });
            return;
        }

        // Si estamos esperando pago y recibimos imagen, es el comprobante
        if (state.step === 'WAITING_PAYMENT' && type === 'image') {
            await this.confirmTransferPayment(from, state);
            this.conversations.set(normalizedFrom, state);
            await this.persistConversation(normalizedFrom, state);
            return;
        }

        // Si recibimos ubicación, procesarla
        if (type === 'location' && message.latitude !== undefined && message.longitude !== undefined) {
            await this.handleLocationMessage(
                from,
                message.latitude,
                message.longitude,
                message.locationAddress,
                state
            );
            this.conversations.set(normalizedFrom, state);
            await this.persistConversation(normalizedFrom, state);
            return;
        }

        // Process based on message type
        if (type === 'button' && buttonPayload) {
            await this.handleButtonResponse(from, buttonPayload, state);
        } else if (type === 'interactive' && listReplyId) {
            await this.handleListSelection(from, listReplyId, state);
        } else if (type === 'text' && text) {
            await this.handleTextMessage(from, text.toLowerCase().trim(), state);
        }

        // Save state (usar número normalizado) y persistir a BD
        this.conversations.set(normalizedFrom, state);
        await this.persistConversation(normalizedFrom, state);
    }

    /**
     * Maneja mensajes de texto
     */
    private async handleTextMessage(from: string, text: string, state: ConversationState): Promise<void> {
        // Keywords de inicio
        const greetings = ['hola', 'hi', 'hello', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches'];
        const menuKeywords = ['menu', 'menú', 'carta', 'ver menu', 'productos', 'que tienen'];
        const orderKeywords = ['pedir', 'ordenar', 'quiero', 'pedido'];
        const statusKeywords = ['estado', 'mi pedido', 'donde esta', 'rastrear'];
        const cancelKeywords = ['cancelar', 'no quiero', 'salir', 'terminar'];
        const historyKeywords = ['historial', 'mis pedidos', 'pedidos anteriores', 'compras'];

        // ========================================================
        // DETECTAR PEDIDOS DESDE LA PÁGINA WEB
        // Formato: "Hola *Restaurante*, quisiera ordenar: 🍽️ *Producto* - $XX.XX"
        // ========================================================
        const webOrderResult = await this.parseWebOrder(text);
        if (webOrderResult) {
            logger.info('[WhatsAppChatbot] Web order detected', { from, item: webOrderResult });

            // Agregar el item al pedido
            state.items = [webOrderResult];
            state.step = 'SELECTING_ITEMS';

            // Cargar el menú para futuras selecciones
            await this.sendMenu(from, state);

            // Confirmar que se recibió el pedido desde la web
            await this.getClientOrThrow().sendText(from,
                `✅ *¡Recibimos tu pedido desde nuestra página web!*\n\n` +
                `🛒 *Tu pedido actual:*\n` +
                `• 1x ${webOrderResult.name} - $${webOrderResult.price.toFixed(2)}\n\n` +
                `💰 *Total: $${webOrderResult.price.toFixed(2)}*\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `📝 *¿Qué deseas hacer?*\n` +
                `• Escribe un *número* del menú para agregar más productos\n` +
                `• Escribe *"Listo"* para confirmar tu pedido\n` +
                `• Escribe *"Cancelar"* para cancelar`
            );
            return;
        }

        // Si está en IDLE y escribe un número (1, 2, 3, 4, 5), es selección del menú de bienvenida
        if (state.step === 'IDLE') {
            // Opciones del menú de bienvenida: 1=Ver Menú, 2=Hacer Pedido, 3=Mi Pedido, 4=Historial, 5=Hablar con persona
            if (text === '1') {
                await this.sendMenu(from, state);
                state.step = 'SHOWING_MENU';
                return;
            } else if (text === '2') {
                await this.sendMenu(from, state);
                state.step = 'SELECTING_ITEMS';
                state.items = [];
                return;
            } else if (text === '3') {
                await this.sendOrderStatus(from);
                return;
            } else if (text === '4') {
                await this.sendOrderHistory(from);
                return;
            } else if (text === '5') {
                // Activar modo manual - hablar con persona real
                await this.activateHumanSupport(from, state);
                return;
            }
            // Si no es un número de opción válido y no es un saludo conocido, mostrar bienvenida
            if (!greetings.some(g => text.includes(g))) {
                await this.sendWelcome(from);
                return;
            }
        }

        // En cualquier momento pueden escribir "persona", "humano", "agente" para hablar con alguien
        const humanKeywords = ['persona', 'humano', 'agente', 'ayuda real', 'hablar con alguien', 'atencion'];
        if (humanKeywords.some(k => text.includes(k))) {
            await this.activateHumanSupport(from, state);
            return;
        }

        // Saludos siempre reinician la conversación
        if (greetings.some(g => text.includes(g))) {
            await this.sendWelcome(from);
            this.resetConversation(state);
            return;
        }

        if (menuKeywords.some(k => text.includes(k))) {
            await this.sendMenu(from, state);
            state.step = 'SHOWING_MENU';
            return;
        }

        if (orderKeywords.some(k => text.includes(k))) {
            await this.sendMenu(from, state);
            state.step = 'SELECTING_ITEMS';
            return;
        }

        if (statusKeywords.some(k => text.includes(k))) {
            await this.sendOrderStatus(from);
            return;
        }

        if (historyKeywords.some(k => text.includes(k))) {
            await this.sendOrderHistory(from);
            return;
        }

        if (cancelKeywords.some(k => text.includes(k))) {
            this.resetConversation(state);
            const cancelMsg = this.config?.messages?.orderCancelled || 'Pedido cancelado. Escribe "Hola" para comenzar de nuevo.';
            await this.getClientOrThrow().sendText(from, `❌ ${cancelMsg}`);
            return;
        }

        // Comandos de edición de carrito (eliminar, cambiar cantidad, ver carrito)
        // Solo en pasos donde tiene sentido editar el carrito
        if (state.step === 'SELECTING_ITEMS' || state.step === 'SHOWING_MENU' || state.step === 'IDLE') {
            const handled = await this.handleCartEditCommand(from, text, state);
            if (handled) {
                return;
            }
        }

        // Comando para ver detalle de producto con imagen ("ver 1", "detalle 2", "foto 3")
        if (state.step === 'SELECTING_ITEMS' || state.step === 'SHOWING_MENU') {
            const handled = await this.handleProductDetailCommand(from, text, state);
            if (handled) {
                return;
            }
        }

        // Handle based on current step
        switch (state.step) {
            case 'WAITING_NAME':
                state.customerName = text;

                // Si la ubicación está habilitada, solicitar ubicación GPS primero
                if (this.isLocationEnabled()) {
                    state.step = 'WAITING_LOCATION';
                    await this.getClientOrThrow().sendText(from,
                        `✅ Gracias ${text}!\n\n` +
                        `📍 *Para calcular el costo del delivery, necesitamos tu ubicación.*\n\n` +
                        `Por favor, envía tu ubicación usando el botón 📎 → 📍 Ubicación de WhatsApp.\n\n` +
                        `_O escribe "texto" si prefieres escribir tu dirección manualmente._`
                    );
                } else {
                    state.step = 'WAITING_ADDRESS';
                    const askAddressMsg = this.config?.messages?.askAddress || '¿Cuál es tu dirección para el delivery?';
                    await this.getClientOrThrow().sendText(from, `✅ Gracias ${text}!\n\n📍 ${askAddressMsg}`);
                }
                break;

            case 'WAITING_LOCATION':
                // El cliente escribe texto en lugar de enviar ubicación
                if (text === 'texto' || text === 'manual' || text === 'escribir') {
                    // Quiere escribir la dirección manualmente
                    state.step = 'WAITING_ADDRESS';
                    await this.getClientOrThrow().sendText(from,
                        `📝 *Ingreso manual de dirección*\n\n` +
                        `Por favor, escribe tu dirección completa para el delivery:`
                    );
                } else if (text === 'local' || text === 'recoger' || text === 'retiro') {
                    // Quiere recoger en el local (fuera de cobertura o preferencia)
                    state.customerAddress = 'RETIRO EN LOCAL';
                    state.deliveryCost = 0;
                    state.deliveryDistance = 0;
                    await this.confirmOrder(from, state);
                } else if (text === 'cancelar' || text === 'no' || text === 'salir') {
                    this.resetConversation(state);
                    const cancelMsg = this.config?.messages?.orderCancelled || 'Pedido cancelado. Escribe "Hola" para comenzar de nuevo.';
                    await this.getClientOrThrow().sendText(from, `❌ ${cancelMsg}`);
                } else {
                    // No entendió - recordarle que envíe ubicación
                    await this.getClientOrThrow().sendText(from,
                        `❓ Por favor envía tu ubicación usando:\n` +
                        `📎 → 📍 Ubicación\n\n` +
                        `O escribe:\n` +
                        `• *"texto"* - para escribir tu dirección\n` +
                        `• *"local"* - para recoger en el restaurante\n` +
                        `• *"cancelar"* - para cancelar el pedido`
                    );
                }
                break;

            case 'WAITING_ADDRESS':
                // Si ya tiene ubicación y escribe "ok", usar la dirección de la ubicación
                if ((text === 'ok' || text === 'si' || text === 'sí' || text === 'confirmar') && state.customerLocation) {
                    state.customerAddress = state.customerLocation.address ||
                        `GPS: ${state.customerLocation.latitude.toFixed(6)}, ${state.customerLocation.longitude.toFixed(6)}`;
                    await this.confirmOrder(from, state);
                } else {
                    // Guardar la dirección escrita
                    state.customerAddress = text;
                    await this.confirmOrder(from, state);
                }
                break;

            case 'WAITING_FINAL_CONFIRM':
                // Esperando confirmacion final (si/no)
                if (text === 'si' || text === 'sí' || text === 'confirmar' || text === 'ok') {
                    await this.createOrder(from, state);
                } else if (text === 'no' || text === 'cancelar') {
                    this.resetConversation(state);
                    const cancelMsg = this.config?.messages?.orderCancelled || 'Pedido cancelado. Escribe "Hola" para comenzar de nuevo.';
                    await this.getClientOrThrow().sendText(from, `❌ ${cancelMsg}`);
                } else {
                    await this.getClientOrThrow().sendText(from, '❓ Por favor responde *Si* para confirmar o *No* para cancelar.');
                }
                break;

            case 'WAITING_PAYMENT':
                // Esperando seleccion de metodo de pago (imagen se maneja en processMessage)
                await this.handlePaymentSelection(from, text, state);
                break;

            case 'SHOWING_MENU':
            case 'SELECTING_ITEMS':
                // Intentar parsear seleccion por numero (ej: "1", "2 del 3", "2 de 1")
                const numberSelection = this.parseNumberSelection(text, state.menuIndexMap);
                if (numberSelection) {
                    state.items.push(numberSelection);
                    state.step = 'SELECTING_ITEMS';
                    await this.getClientOrThrow().sendText(from,
                        `✅ *Agregado:* ${numberSelection.quantity}x ${numberSelection.name}\n` +
                        `💵 Subtotal: $${(numberSelection.price * numberSelection.quantity).toFixed(2)}\n\n` +
                        `🛒 *Tu pedido actual:*\n${this.formatOrderItems(state.items)}\n` +
                        `💰 *Total: $${this.calculateTotal(state.items).toFixed(2)}*\n\n` +
                        `📝 Escribe otro número para agregar más o *"Listo"* para confirmar.`
                    );
                    return;
                }

                // Intentar parsear por nombre (ej: "2 ceviches")
                const parsed = await this.parseItemSelection(text, state);
                if (parsed) {
                    state.items.push(parsed);
                    state.step = 'SELECTING_ITEMS';
                    await this.getClientOrThrow().sendText(from,
                        `✅ *Agregado:* ${parsed.quantity}x ${parsed.name}\n` +
                        `💵 Subtotal: $${(parsed.price * parsed.quantity).toFixed(2)}\n\n` +
                        `🛒 *Tu pedido actual:*\n${this.formatOrderItems(state.items)}\n` +
                        `💰 *Total: $${this.calculateTotal(state.items).toFixed(2)}*\n\n` +
                        `📝 Escribe otro número para agregar más o *"Listo"* para confirmar.`
                    );
                } else if (text === 'listo' || text === 'confirmar' || text === 'pedir') {
                    if (state.items.length === 0) {
                        await this.getClientOrThrow().sendText(from, '⚠️ No has agregado productos. Escribe un número del menú para agregar.');
                    } else {
                        state.step = 'WAITING_NAME';
                        const askNameMsg = this.config?.messages?.askName || '¿A nombre de quién va el pedido?';
                        await this.getClientOrThrow().sendText(from, `👤 ${askNameMsg}`);
                    }
                } else {
                    await this.getClientOrThrow().sendText(from,
                        '❓ No entendí. Puedes escribir:\n' +
                        '• Un *número* del menú (ej: "1")\n' +
                        '• Cantidad + número (ej: "2 del 1")\n' +
                        '• *"Menu"* para ver opciones\n' +
                        '• *"Listo"* para confirmar pedido'
                    );
                }
                break;

            default:
                await this.sendHelp(from);
        }
    }

    /**
     * Maneja respuestas de botones
     */
    private async handleButtonResponse(from: string, payload: string, state: ConversationState): Promise<void> {
        switch (payload) {
            case 'VIEW_MENU':
                await this.sendMenu(from, state);
                state.step = 'SHOWING_MENU';
                break;

            case 'NEW_ORDER':
                await this.sendMenu(from, state);
                state.step = 'SELECTING_ITEMS';
                state.items = [];
                break;

            case 'ORDER_STATUS':
                await this.sendOrderStatus(from);
                break;

            case 'CONFIRM_ORDER':
                state.step = 'WAITING_NAME';
                const askNameMsgBtn = this.config?.messages?.askName || '¿A nombre de quién va el pedido?';
                await this.getClientOrThrow().sendText(from, `👤 ${askNameMsgBtn}`);
                break;

            case 'CANCEL_ORDER':
                this.resetConversation(state);
                const cancelMsgBtn = this.config?.messages?.orderCancelled || 'Pedido cancelado. Escribe "Hola" para comenzar de nuevo.';
                await this.getClientOrThrow().sendText(from, `❌ ${cancelMsgBtn}`);
                break;

            case 'CONFIRM_FINAL':
                await this.createOrder(from, state);
                break;

            default:
                // Check if it's a menu item selection
                if (payload.startsWith('ADD_')) {
                    const itemId = payload.replace('ADD_', '');
                    await this.addItemToOrder(from, itemId, state);
                }
        }
    }

    /**
     * Maneja selecciones de lista
     */
    private async handleListSelection(from: string, listReplyId: string, state: ConversationState): Promise<void> {
        // Handle menu item selection from list
        const menuItems = await this.getMenu();
        const item = menuItems.find(i => i.id === listReplyId);
        if (item) {
            state.items.push({ name: item.name, quantity: 1, price: item.price, taxRate: item.taxRate });
            state.step = 'SELECTING_ITEMS';

            await this.getClientOrThrow().sendButtons(from,
                `✅ Agregado: ${item.name} ($${item.price.toFixed(2)})\n\n` +
                `🛒 Tu pedido:\n${this.formatOrderItems(state.items)}\n` +
                `💰 Total: $${this.calculateTotal(state.items).toFixed(2)}`,
                [
                    { id: 'VIEW_MENU', title: '➕ Agregar más' },
                    { id: 'CONFIRM_ORDER', title: '✅ Confirmar' },
                    { id: 'CANCEL_ORDER', title: '❌ Cancelar' }
                ]
            );
        }
    }

    /**
     * Envia mensaje de bienvenida
     */
    private async sendWelcome(from: string): Promise<void> {
        const businessName = this.config?.businessName || 'Nuestro Restaurante';
        const welcomeTemplate = this.config?.messages?.welcome || '¡Hola! Bienvenido a {businessName}\n\n¿Qué deseas hacer hoy?';
        const welcomeMsg = welcomeTemplate.replace('{businessName}', businessName);

        // Enviamos texto con opciones numeradas (más compatible)
        await this.getClientOrThrow().sendText(from,
            `👋 *${welcomeMsg}*\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `*1️⃣ Ver Menú* - Conoce nuestros productos\n` +
            `*2️⃣ Hacer Pedido* - Ordena ahora\n` +
            `*3️⃣ Mi Pedido* - Consulta el estado\n` +
            `*4️⃣ Historial* - Tus pedidos anteriores\n` +
            `*5️⃣ Hablar con Persona* - Atención personalizada\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `_Responde con el número de tu opción_`
        );
    }

    /**
     * Activa soporte humano (modo manual)
     * El chatbot deja de responder y notifica al cliente
     */
    private async activateHumanSupport(from: string, state: ConversationState): Promise<void> {
        const normalizedFrom = this.normalizePhone(from);

        // Activar modo manual
        state.manualMode = true;
        state.manualModeStartedAt = new Date();
        state.step = 'MANUAL';

        logger.info('[WhatsAppChatbot] Human support activated by customer', { from: normalizedFrom });

        // Notificar al panel de admin via WebSocket
        whatsAppSocketManager.notifyHumanSupportRequested(
            normalizedFrom.replace('@c.us', ''),
            state.customerName
        );

        // Enviar mensaje al cliente
        await this.getClientOrThrow().sendText(from,
            `👤 *¡Conectándote con una persona!*\n\n` +
            `Un miembro de nuestro equipo te atenderá en breve.\n\n` +
            `⏱️ Por favor espera, te responderemos lo antes posible.\n\n` +
            `_Si deseas volver al menú automático, escribe *"Menu"*_`
        );
    }

    /**
     * Envia el menu (carga dinamicamente desde la base de datos)
     * Muestra numeros para facilitar seleccion
     */
    private async sendMenu(from: string, state?: ConversationState): Promise<void> {
        const menuItems = await this.getMenu();
        const noMenuMsg = this.config?.messages?.noMenu || 'No hay productos disponibles en este momento.';

        if (menuItems.length === 0) {
            await this.getClientOrThrow().sendText(from,
                `📋 *MENÚ NO DISPONIBLE*\n\n${noMenuMsg}`
            );
            return;
        }

        // Crear mapa de indices para seleccion por numero
        const indexMap = new Map<number, ChatMenuItem>();
        let itemIndex = 1;

        // Group by category
        const categories = [...new Set(menuItems.map(i => i.category))];
        const menuHeader = this.config?.messages?.menuHeader || 'NUESTRO MENÚ';
        let menuText = `📋 *${menuHeader}*\n\n`;

        for (const category of categories) {
            menuText += `*${category}*\n`;
            const items = menuItems.filter(i => i.category === category);
            for (const item of items) {
                menuText += `*${itemIndex}.* ${item.name} - $${item.price.toFixed(2)}\n`;
                indexMap.set(itemIndex, item);
                itemIndex++;
            }
            menuText += '\n';
        }

        menuText += `━━━━━━━━━━━━━━━━━━━━\n`;
        menuText += `📝 *¿Cómo ordenar?*\n`;
        menuText += `• Escribe el *número* del producto (ej: "1")\n`;
        menuText += `• O escribe cantidad + número (ej: "2 del 1")\n`;
        menuText += `• *"ver X"* - Ver foto del producto #X\n`;
        menuText += `• Escribe *"Listo"* cuando termines`;

        // Guardar mapa en el estado de la conversacion
        if (state) {
            state.menuIndexMap = indexMap;
        }

        await this.getClientOrThrow().sendText(from, menuText);
    }

    /**
     * Envia ayuda
     */
    private async sendHelp(from: string): Promise<void> {
        await this.getClientOrThrow().sendText(from,
            '❓ *¿Necesitas ayuda?*\n\n' +
            'Puedes escribir:\n' +
            '• "Hola" - Iniciar conversación\n' +
            '• "Menu" - Ver productos\n' +
            '• "Pedir" - Hacer un pedido\n' +
            '• "Estado" - Ver tu pedido\n' +
            '• "Cancelar" - Cancelar pedido actual\n\n' +
            'O escríbenos directamente lo que necesitas.'
        );
    }

    /**
     * Envia estado del pedido consultando la base de datos
     */
    private async sendOrderStatus(from: string): Promise<void> {
        const state = this.conversations.get(from);

        // Si tenemos el ID del ultimo pedido, consultarlo
        if (state?.lastOrderId && this.orderRepository) {
            try {
                const order = await this.orderRepository.findById(state.lastOrderId);
                if (order) {
                    const statusEmoji = this.getStatusEmoji(order.status);
                    const statusText = this.getStatusText(order.status);

                    let message = `📦 *ESTADO DE TU PEDIDO*\n\n`;
                    message += `━━━━━━━━━━━━━━━━━━━━\n`;
                    message += `${statusEmoji} *${statusText}*\n`;
                    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

                    // Mostrar items del pedido
                    message += `🛒 *Tu pedido:*\n`;
                    for (const item of order.items) {
                        message += `   • ${item.quantity}x ${item.name}\n`;
                    }
                    message += `\n`;

                    // Tiempo estimado o listo
                    if (order.status === 'Nuevo') {
                        const estimatedTime = this.config?.estimatedDeliveryTime || '30-45 minutos';
                        message += `⏱️ Tu pedido está siendo preparado.\n`;
                        message += `Tiempo estimado: ${estimatedTime}\n`;
                    } else if (order.status === 'Listo') {
                        message += `✅ ¡Tu pedido está listo!\n`;
                        if (order.type === 'Delivery') {
                            message += `🛵 En camino a tu dirección.\n`;
                        } else {
                            message += `📍 Puedes pasar a recogerlo.\n`;
                        }
                    } else if (order.status === 'Completado') {
                        message += `✅ Este pedido ya fue entregado.\n`;
                        message += `¡Gracias por tu preferencia!\n`;
                    }

                    message += `\n_Escribe *Hola* para hacer un nuevo pedido._`;

                    await this.getClientOrThrow().sendText(from, message);
                    return;
                }
            } catch (error) {
                logger.error('[WhatsAppChatbot] Error getting order status', { error });
            }
        }

        // Si no hay pedido reciente, buscar por telefono
        if (this.orderRepository) {
            try {
                const allOrders = await this.orderRepository.findAll();
                // Buscar pedidos de este numero (el nombre contiene [WhatsApp: numero])
                const phoneClean = from.replace('@c.us', '');
                const userOrders = allOrders
                    .filter(o => o.customerName.includes(`[WhatsApp: ${phoneClean}]`))
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                if (userOrders.length > 0) {
                    const lastOrder = userOrders[0];
                    // Guardar para futuras consultas
                    if (state) {
                        state.lastOrderId = lastOrder.id;
                    }

                    const statusEmoji = this.getStatusEmoji(lastOrder.status);
                    const statusText = this.getStatusText(lastOrder.status);

                    let message = `📦 *TU ÚLTIMO PEDIDO*\n\n`;
                    message += `━━━━━━━━━━━━━━━━━━━━\n`;
                    message += `${statusEmoji} *${statusText}*\n`;
                    message += `━━━━━━━━━��━━━━━━━━━━\n\n`;

                    message += `🛒 *Productos:*\n`;
                    for (const item of lastOrder.items) {
                        message += `   • ${item.quantity}x ${item.name}\n`;
                    }

                    if (lastOrder.status === 'Listo') {
                        message += `\n✅ ¡Tu pedido está listo!`;
                    } else if (lastOrder.status === 'Nuevo') {
                        message += `\n⏱️ Estamos preparando tu pedido...`;
                    }

                    message += `\n\n_Escribe *Hola* para hacer un nuevo pedido._`;

                    await this.getClientOrThrow().sendText(from, message);
                    return;
                }
            } catch (error) {
                logger.error('[WhatsAppChatbot] Error searching orders', { error });
            }
        }

        // No se encontro ningun pedido
        await this.getClientOrThrow().sendText(from,
            '📦 *Estado de tu pedido*\n\n' +
            'No encontramos pedidos recientes de este número.\n\n' +
            '_Escribe *Hola* para hacer un nuevo pedido._'
        );
    }

    /**
     * Obtiene emoji segun estado
     */
    private getStatusEmoji(status: string): string {
        switch (status) {
            case 'Nuevo': return '🔄';
            case 'Listo': return '✅';
            case 'Completado': return '✔️';
            default: return '📦';
        }
    }

    /**
     * Obtiene texto descriptivo del estado
     */
    private getStatusText(status: string): string {
        switch (status) {
            case 'Nuevo': return 'EN PREPARACIÓN';
            case 'Listo': return '¡LISTO PARA ENTREGA!';
            case 'Completado': return 'ENTREGADO';
            default: return status.toUpperCase();
        }
    }

    /**
     * Envía el historial de pedidos del cliente
     */
    private async sendOrderHistory(from: string): Promise<void> {
        if (!this.orderRepository || !this.conversationRepo) {
            await this.getClientOrThrow().sendText(from,
                '📋 *Historial de pedidos*\n\n' +
                'El historial no está disponible en este momento.\n\n' +
                '_Escribe *Hola* para hacer un nuevo pedido._'
            );
            return;
        }

        try {
            const phoneClean = from.replace('@c.us', '');

            // Obtener IDs de pedidos del historial persistido
            const orderIds = await this.conversationRepo.getOrderHistory(phoneClean);

            // También buscar por nombre en caso de que haya pedidos antiguos
            const allOrders = await this.orderRepository.findAll();
            const userOrders = allOrders
                .filter(o =>
                    orderIds.includes(o.id) ||
                    o.customerName.includes(`[WhatsApp: ${phoneClean}]`)
                )
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 10); // Últimos 10 pedidos

            if (userOrders.length === 0) {
                await this.getClientOrThrow().sendText(from,
                    '📋 *Historial de pedidos*\n\n' +
                    'No tienes pedidos anteriores registrados.\n\n' +
                    '_Escribe *Hola* para hacer tu primer pedido._'
                );
                return;
            }

            let message = `📋 *TU HISTORIAL DE PEDIDOS*\n`;
            message += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

            for (let i = 0; i < userOrders.length; i++) {
                const order = userOrders[i];
                const date = new Date(order.createdAt);
                const dateStr = date.toLocaleDateString('es-EC', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
                const statusEmoji = this.getStatusEmoji(order.status);

                message += `*${i + 1}. Pedido del ${dateStr}*\n`;
                message += `   ${statusEmoji} ${this.getStatusText(order.status)}\n`;

                // Mostrar items resumidos
                const itemsSummary = order.items
                    .map(item => `${item.quantity}x ${item.name}`)
                    .join(', ');
                message += `   🛒 ${itemsSummary}\n`;

                // Total
                const total = order.items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
                message += `   💰 Total: $${total.toFixed(2)}\n\n`;
            }

            message += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
            message += `📊 Total de pedidos: ${userOrders.length}\n\n`;
            message += `_Escribe *Hola* para hacer un nuevo pedido._`;

            await this.getClientOrThrow().sendText(from, message);
        } catch (error) {
            logger.error('[WhatsAppChatbot] Error getting order history', { error, from });
            await this.getClientOrThrow().sendText(from,
                '📋 *Historial de pedidos*\n\n' +
                'Hubo un error al obtener tu historial.\n\n' +
                '_Escribe *Hola* para hacer un nuevo pedido._'
            );
        }
    }

    /**
     * Agrega item al pedido
     */
    private async addItemToOrder(from: string, itemId: string, state: ConversationState): Promise<void> {
        const menuItems = await this.getMenu();
        const item = menuItems.find(i => i.id === itemId);
        if (item) {
            const existingItem = state.items.find(i => i.name === item.name);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                state.items.push({ name: item.name, quantity: 1, price: item.price, taxRate: item.taxRate });
            }

            await this.getClientOrThrow().sendText(from,
                `✅ Agregado: ${item.name}\n\n` +
                `🛒 Tu pedido:\n${this.formatOrderItems(state.items)}\n` +
                `💰 Total: $${this.calculateTotal(state.items).toFixed(2)}\n\n` +
                `Escribe "Menu" para agregar más o "Listo" para confirmar.`
            );
        }
    }

    /**
     * Muestra confirmacion del pedido y pide confirmacion final
     */
    private async confirmOrder(from: string, state: ConversationState): Promise<void> {
        const subtotal = this.calculateTotal(state.items);
        const deliveryCost = state.deliveryCost || 0;
        const total = subtotal + deliveryCost;

        // Construir mensaje de resumen
        let summaryLines = [
            `📋 *RESUMEN DE TU PEDIDO*\n`,
            `👤 *Cliente:* ${state.customerName}`,
            `📍 *Dirección:* ${state.customerAddress}`,
        ];

        // Agregar info de distancia si existe
        if (state.deliveryDistance !== undefined && state.deliveryDistance > 0) {
            summaryLines.push(`🚗 *Distancia:* ${state.deliveryDistance.toFixed(1)} km`);
        }

        summaryLines.push('');
        summaryLines.push(`🛒 *Productos:*`);
        summaryLines.push(this.formatOrderItems(state.items));
        summaryLines.push('');
        summaryLines.push(`━━━━━━━━━━━━━━━━━━━━`);
        summaryLines.push(`💵 *Subtotal:* $${subtotal.toFixed(2)}`);

        // Agregar costo de delivery si aplica
        if (deliveryCost > 0) {
            summaryLines.push(`🚗 *Delivery:* $${deliveryCost.toFixed(2)}`);
        }

        summaryLines.push(`💰 *TOTAL: $${total.toFixed(2)}*`);
        summaryLines.push(`━━━━━━━━━━━━━━━━━━━━`);
        summaryLines.push('');
        summaryLines.push(`¿Confirmas tu pedido?`);
        summaryLines.push(`Escribe *Si* para confirmar o *No* para cancelar.`);

        await this.getClientOrThrow().sendText(from, summaryLines.join('\n'));

        state.step = 'WAITING_FINAL_CONFIRM';
    }

    /**
     * Crea el pedido en el sistema
     */
    private async createOrder(from: string, state: ConversationState): Promise<void> {
        try {
            const subtotal = this.calculateTotal(state.items);
            const deliveryCost = state.deliveryCost || 0;
            const total = subtotal + deliveryCost;

            // Determinar tipo de pedido
            let orderType = 'Para Llevar';
            if (state.customerAddress) {
                if (state.customerAddress === 'RETIRO EN LOCAL') {
                    orderType = 'Para Llevar';
                } else {
                    orderType = 'Delivery';
                }
            }

            // Agregar delivery como item si tiene costo
            const orderItems = state.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                taxRate: item.taxRate
            }));

            if (deliveryCost > 0) {
                orderItems.push({
                    name: `Delivery (${state.deliveryDistance?.toFixed(1) || '?'} km)`,
                    quantity: 1,
                    price: deliveryCost,
                    taxRate: 0
                });
            }

            const orderData = {
                customerName: state.customerName || 'Cliente WhatsApp',
                customerPhone: from,
                customerAddress: state.customerAddress === 'RETIRO EN LOCAL' ? undefined : state.customerAddress,
                items: orderItems,
                total: total,
                type: orderType,
                source: 'whatsapp',
                // Datos adicionales de ubicación
                customerLocation: state.customerLocation,
                deliveryDistance: state.deliveryDistance,
                deliveryCost: deliveryCost
            };

            // Call the order creation callback y guardar el ID
            let orderId: string | undefined;
            if (this.onOrderCreated) {
                const result = await this.onOrderCreated(orderData);
                if (typeof result === 'string') {
                    orderId = result;
                    state.lastOrderId = orderId;
                    // Agregar al historial de pedidos en BD
                    const phoneClean = from.replace('@c.us', '');
                    await this.conversationRepo.addToOrderHistory(phoneClean, orderId);
                }
            }

            const estimatedTime = this.config?.estimatedDeliveryTime || '30-45 minutos';
            const confirmTemplate = this.config?.messages?.orderConfirmed || '¡PEDIDO CONFIRMADO!\n\nTiempo estimado: {estimatedTime}';
            const confirmMsg = confirmTemplate.replace('{estimatedTime}', estimatedTime);

            // Mensaje de confirmación
            let confirmationMessage = `✅ *${confirmMsg}*\n\n` +
                `📝 Tu pedido ha sido registrado.\n\n`;

            // Agregar información de pago
            const paymentInfo = this.config?.paymentInfo;
            const hasTransfer = paymentInfo?.acceptsTransfer && paymentInfo?.banks && paymentInfo.banks.length > 0;
            const hasCash = paymentInfo?.acceptsCash;

            if (paymentInfo && (hasCash || hasTransfer)) {
                confirmationMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
                confirmationMessage += `💳 *SELECCIONA TU FORMA DE PAGO*\n`;
                confirmationMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;

                if (hasCash && hasTransfer) {
                    confirmationMessage += `1️⃣ *Efectivo* - Pagas al recibir\n`;
                    confirmationMessage += `2️⃣ *Transferencia bancaria*\n\n`;
                    confirmationMessage += `_Responde 1 o 2 para continuar_`;
                } else if (hasCash) {
                    confirmationMessage += `💵 Pago en *efectivo* al recibir tu pedido.\n\n`;
                    confirmationMessage += `_Escribe *OK* para confirmar_`;
                } else if (hasTransfer) {
                    confirmationMessage += `🏦 Pago por *transferencia bancaria*.\n\n`;
                    confirmationMessage += `_Escribe *OK* para ver los datos bancarios_`;
                }

                await this.getClientOrThrow().sendText(from, confirmationMessage);
                state.step = 'WAITING_PAYMENT';
                // Limpiar items pero mantener otros datos para consultas
                state.items = [];

            } else {
                // Si no hay metodos de pago configurados, finalizar directamente
                confirmationMessage += `¡Gracias por tu preferencia! 🍽️`;
                await this.getClientOrThrow().sendText(from, confirmationMessage);
                this.resetConversation(state);
            }

        } catch (error) {
            logger.error('[WhatsAppChatbot] Error creating order', { error });
            const errorMsg = this.config?.messages?.error || 'Hubo un error. Por favor intenta de nuevo.';
            await this.getClientOrThrow().sendText(from, `❌ ${errorMsg}`);
        }
    }

    /**
     * Procesa la seleccion del metodo de pago
     */
    private async handlePaymentSelection(from: string, text: string, state: ConversationState): Promise<void> {
        const paymentInfo = this.config?.paymentInfo;
        const hasTransfer = paymentInfo?.acceptsTransfer && paymentInfo?.banks && paymentInfo.banks.length > 0;
        const hasCash = paymentInfo?.acceptsCash;

        // Si tiene ambos metodos
        if (hasCash && hasTransfer) {
            if (text === '1' || text.includes('efectivo')) {
                await this.confirmCashPayment(from, state);
            } else if (text === '2' || text.includes('transferencia')) {
                await this.showBankDetails(from, state);
            } else {
                await this.getClientOrThrow().sendText(from,
                    '❓ Por favor responde *1* para efectivo o *2* para transferencia.'
                );
            }
        } else if (hasCash) {
            // Solo efectivo
            if (text.toLowerCase() === 'ok' || text.includes('efectivo') || text === '1') {
                await this.confirmCashPayment(from, state);
            } else {
                await this.getClientOrThrow().sendText(from, '❓ Escribe *OK* para confirmar pago en efectivo.');
            }
        } else if (hasTransfer) {
            // Solo transferencia
            if (text.toLowerCase() === 'ok' || text.includes('transferencia') || text === '1') {
                await this.showBankDetails(from, state);
            } else {
                await this.getClientOrThrow().sendText(from, '❓ Escribe *OK* para ver los datos de transferencia.');
            }
        }
    }

    /**
     * Confirma pago en efectivo y finaliza
     */
    private async confirmCashPayment(from: string, state: ConversationState): Promise<void> {
        const estimatedTime = this.config?.estimatedDeliveryTime || '30-45 minutos';

        await this.getClientOrThrow().sendText(from,
            `💵 *PAGO EN EFECTIVO CONFIRMADO*\n\n` +
            `Ten el monto exacto listo para cuando llegue tu pedido.\n\n` +
            `⏱️ Tiempo estimado: ${estimatedTime}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `¡Gracias por tu compra! 🍽️\n\n` +
            `_Escribe *3* en cualquier momento para consultar el estado de tu pedido._`
        );

        this.resetConversation(state);
    }

    /**
     * Muestra datos bancarios y espera comprobante
     */
    private async showBankDetails(from: string, state: ConversationState): Promise<void> {
        const paymentInfo = this.config?.paymentInfo;
        if (!paymentInfo?.banks || paymentInfo.banks.length === 0) return;

        // Calcular total del ultimo pedido si lo tenemos
        let totalMsg = '';
        if (state.lastOrderId && this.orderRepository) {
            try {
                const order = await this.orderRepository.findById(state.lastOrderId);
                if (order) {
                    const total = order.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
                    totalMsg = `💰 *Monto a transferir: $${total.toFixed(2)}*\n\n`;
                }
            } catch (e) {
                // Ignorar error
            }
        }

        let bankMessage = `🏦 *DATOS PARA TRANSFERENCIA*\n\n`;

        for (const bank of paymentInfo.banks) {
            bankMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
            bankMessage += `🏦 *${bank.bankName}*\n`;
            bankMessage += `📋 Tipo: ${bank.accountType}\n`;
            bankMessage += `🔢 Cuenta: ${bank.accountNumber}\n`;
            bankMessage += `👤 Titular: ${bank.accountHolder}\n`;
            bankMessage += `🪪 CI/RUC: ${bank.identification}\n`;
        }

        bankMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        bankMessage += totalMsg;
        bankMessage += `📸 *Envía la foto del comprobante* a este chat para confirmar tu pago.\n\n`;
        bankMessage += `_Tu pedido será procesado al recibir el comprobante._`;

        await this.getClientOrThrow().sendText(from, bankMessage);
        // Mantenemos WAITING_PAYMENT para esperar la imagen
    }

    /**
     * Confirma recepcion del comprobante de transferencia
     */
    private async confirmTransferPayment(from: string, state: ConversationState): Promise<void> {
        const estimatedTime = this.config?.estimatedDeliveryTime || '30-45 minutos';

        await this.getClientOrThrow().sendText(from,
            `✅ *COMPROBANTE RECIBIDO*\n\n` +
            `Hemos recibido tu comprobante de transferencia.\n` +
            `Verificaremos el pago y procesaremos tu pedido.\n\n` +
            `⏱️ Tiempo estimado: ${estimatedTime}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `¡Gracias por tu compra! 🍽️\n\n` +
            `_Escribe *3* en cualquier momento para consultar el estado de tu pedido._`
        );

        this.resetConversation(state);
    }

    /**
     * Resetea la conversacion manteniendo el lastOrderId
     */
    private resetConversation(state: ConversationState): void {
        const lastOrderId = state.lastOrderId;
        state.step = 'IDLE';
        state.items = [];
        state.customerName = undefined;
        state.customerAddress = undefined;
        state.customerLocation = undefined;
        state.deliveryDistance = undefined;
        state.deliveryCost = undefined;
        state.lastOrderId = lastOrderId; // Mantener para consultas de estado
    }

    /**
     * Parsea seleccion por numero del menu
     * Soporta: "1", "2 del 1", "2 de 3", "3x1"
     */
    private parseNumberSelection(
        text: string,
        menuIndexMap?: Map<number, ChatMenuItem>
    ): { name: string; quantity: number; price: number; taxRate: number } | null {
        if (!menuIndexMap || menuIndexMap.size === 0) return null;

        // Pattern: solo numero "1", "2", "15"
        const singleNumber = text.match(/^(\d+)$/);
        if (singleNumber) {
            const itemIndex = parseInt(singleNumber[1], 10);
            const item = menuIndexMap.get(itemIndex);
            if (item) {
                return { name: item.name, quantity: 1, price: item.price, taxRate: item.taxRate };
            }
        }

        // Pattern: "2 del 1", "3 de 5", "2 de el 1"
        const quantityOfItem = text.match(/^(\d+)\s*(?:del?|x)\s*(?:el\s*)?(\d+)$/i);
        if (quantityOfItem) {
            const quantity = parseInt(quantityOfItem[1], 10);
            const itemIndex = parseInt(quantityOfItem[2], 10);
            const item = menuIndexMap.get(itemIndex);
            if (item && quantity > 0 && quantity <= 20) {
                return { name: item.name, quantity, price: item.price, taxRate: item.taxRate };
            }
        }

        // Pattern: "1x2" (1 unidad del item 2)
        const xPattern = text.match(/^(\d+)x(\d+)$/i);
        if (xPattern) {
            const quantity = parseInt(xPattern[1], 10);
            const itemIndex = parseInt(xPattern[2], 10);
            const item = menuIndexMap.get(itemIndex);
            if (item && quantity > 0 && quantity <= 20) {
                return { name: item.name, quantity, price: item.price, taxRate: item.taxRate };
            }
        }

        return null;
    }

    /**
     * Parsea pedidos que vienen desde la página web
     * Formato: "Hola *Restaurante*, quisiera ordenar: 🍽️ *Producto* - $XX.XX 📝 Descripcion"
     */
    private async parseWebOrder(text: string): Promise<{ name: string; quantity: number; price: number; taxRate: number } | null> {
        // Detectar si es un pedido desde la web
        if (!text.includes('quisiera ordenar') && !text.includes('quiero ordenar')) {
            return null;
        }

        logger.info('[WhatsAppChatbot] Parsing web order', { text: text.substring(0, 100) });

        // Intentar extraer el nombre del producto y precio
        // Formato esperado: "🍽️ *Nombre Producto* - $XX.XX"
        // También puede ser sin emoji: "*Nombre Producto* - $XX.XX"
        const productMatch = text.match(/🍽️?\s*\*([^*]+)\*\s*-\s*\$?([\d,.]+)/);

        if (productMatch) {
            const productName = productMatch[1].trim();
            const priceStr = productMatch[2].replace(',', '.');
            const price = parseFloat(priceStr);

            if (productName && !isNaN(price)) {
                logger.info('[WhatsAppChatbot] Web order parsed successfully', { productName, price });

                // Buscar el producto en el menú para obtener el precio actualizado
                const menuItems = await this.getMenu();
                const menuItem = menuItems.find(item =>
                    item.name.toLowerCase() === productName.toLowerCase() ||
                    item.name.toLowerCase().includes(productName.toLowerCase()) ||
                    productName.toLowerCase().includes(item.name.toLowerCase())
                );

                if (menuItem) {
                    // Usar precio del menú (más actualizado)
                    return { name: menuItem.name, quantity: 1, price: menuItem.price, taxRate: menuItem.taxRate };
                }

                // Si no está en el menú, usar el precio del mensaje con taxRate 0
                return { name: productName, quantity: 1, price, taxRate: 0 };
            }
        }

        // Fallback: intentar extraer solo el nombre sin precio
        const simpleMatch = text.match(/🍽️\s*\*([^*]+)\*/);
        if (simpleMatch) {
            const productName = simpleMatch[1].trim();
            const menuItems = await this.getMenu();
            const menuItem = menuItems.find(item =>
                item.name.toLowerCase().includes(productName.toLowerCase()) ||
                productName.toLowerCase().includes(item.name.toLowerCase())
            );

            if (menuItem) {
                return { name: menuItem.name, quantity: 1, price: menuItem.price, taxRate: menuItem.taxRate };
            }
        }

        logger.warn('[WhatsAppChatbot] Could not parse web order', { text: text.substring(0, 100) });
        return null;
    }

    /**
     * Parsea seleccion de item del texto (busca en el menu de la base de datos)
     */
    private async parseItemSelection(
        text: string,
        state?: ConversationState
    ): Promise<{ name: string; quantity: number; price: number; taxRate: number } | null> {
        // Pattern: "2 ceviches" or "ceviche de camaron"
        const quantityMatch = text.match(/^(\d+)\s+(.+)$/);

        let quantity = 1;
        let itemName = text;

        if (quantityMatch) {
            quantity = parseInt(quantityMatch[1], 10);
            itemName = quantityMatch[2];
        }

        // Primero intentar con el mapa de indices si existe
        if (state?.menuIndexMap) {
            for (const [, item] of state.menuIndexMap) {
                if (item.name.toLowerCase().includes(itemName) ||
                    itemName.includes(item.name.toLowerCase())) {
                    return { name: item.name, quantity, price: item.price, taxRate: item.taxRate };
                }
            }
        }

        // Fallback: buscar en todos los items del menu
        const menuItems = await this.getMenu();
        const item = menuItems.find(i =>
            i.name.toLowerCase().includes(itemName) ||
            itemName.includes(i.name.toLowerCase())
        );

        if (item) {
            return { name: item.name, quantity, price: item.price, taxRate: item.taxRate };
        }

        return null;
    }

    /**
     * Formatea items del pedido (con números para edición)
     * @param withNumbers Si true, incluye números para identificar items
     */
    private formatOrderItems(
        items: Array<{ name: string; quantity: number; price: number; taxRate?: number }>,
        withNumbers: boolean = false
    ): string {
        return items
            .map((item, index) => {
                const prefix = withNumbers ? `*${index + 1}.* ` : '• ';
                return `${prefix}${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`;
            })
            .join('\n');
    }

    /**
     * Calcula total del pedido
     */
    private calculateTotal(items: Array<{ name: string; quantity: number; price: number; taxRate?: number }>): number {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FUNCIONES DE CARRITO (EDICIÓN Y ELIMINACIÓN)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Muestra el carrito con opciones para editar
     */
    private async showCartWithOptions(from: string, state: ConversationState): Promise<void> {
        if (state.items.length === 0) {
            await this.getClientOrThrow().sendText(from,
                `🛒 *Tu carrito está vacío*\n\n` +
                `Escribe un número del menú para agregar productos.`
            );
            return;
        }

        let message = `🛒 *TU CARRITO*\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n`;
        message += this.formatOrderItems(state.items, true);
        message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        message += `💰 *Total: $${this.calculateTotal(state.items).toFixed(2)}*\n\n`;
        message += `📝 *Opciones:*\n`;
        message += `• *"eliminar X"* - Quita el producto #X\n`;
        message += `• *"cambiar X a Y"* - Cambia cantidad del #X a Y unidades\n`;
        message += `• *"vaciar"* - Vacía todo el carrito\n`;
        message += `• *"listo"* - Confirmar pedido\n`;
        message += `• Escribe un *número del menú* para agregar más`;

        await this.getClientOrThrow().sendText(from, message);
    }

    /**
     * Elimina un item del carrito por su índice
     * @returns true si se eliminó, false si el índice no es válido
     */
    private removeCartItem(state: ConversationState, itemIndex: number): boolean {
        if (itemIndex < 1 || itemIndex > state.items.length) {
            return false;
        }
        state.items.splice(itemIndex - 1, 1);
        return true;
    }

    /**
     * Cambia la cantidad de un item en el carrito
     * @returns true si se cambió, false si el índice o cantidad no es válida
     */
    private changeCartItemQuantity(state: ConversationState, itemIndex: number, newQuantity: number): boolean {
        if (itemIndex < 1 || itemIndex > state.items.length) {
            return false;
        }
        if (newQuantity < 1 || newQuantity > 99) {
            return false;
        }
        state.items[itemIndex - 1].quantity = newQuantity;
        return true;
    }

    /**
     * Parsea comandos de edición del carrito
     * @returns Objeto con acción y parámetros, o null si no es un comando de edición
     */
    private parseCartEditCommand(text: string): {
        action: 'remove' | 'change' | 'clear' | 'cart';
        itemIndex?: number;
        quantity?: number;
    } | null {
        const textLower = text.toLowerCase().trim();

        // "eliminar X" o "quitar X" o "borrar X"
        const removeMatch = textLower.match(/^(?:eliminar|quitar|borrar)\s+(\d+)$/);
        if (removeMatch) {
            return { action: 'remove', itemIndex: parseInt(removeMatch[1], 10) };
        }

        // "cambiar X a Y" o "modificar X a Y" o "X=Y"
        const changeMatch = textLower.match(/^(?:cambiar|modificar)\s+(\d+)\s+(?:a|=)\s*(\d+)$/) ||
                           textLower.match(/^(\d+)\s*=\s*(\d+)$/);
        if (changeMatch) {
            return {
                action: 'change',
                itemIndex: parseInt(changeMatch[1], 10),
                quantity: parseInt(changeMatch[2], 10)
            };
        }

        // "vaciar" o "limpiar carrito"
        if (textLower === 'vaciar' || textLower === 'limpiar' || textLower === 'vaciar carrito') {
            return { action: 'clear' };
        }

        // "carrito" o "ver carrito" o "mi carrito"
        if (textLower === 'carrito' || textLower === 'ver carrito' || textLower === 'mi carrito') {
            return { action: 'cart' };
        }

        return null;
    }

    /**
     * Maneja comandos de edición del carrito
     * @returns true si se procesó un comando de carrito, false si no
     */
    private async handleCartEditCommand(
        from: string,
        text: string,
        state: ConversationState
    ): Promise<boolean> {
        const command = this.parseCartEditCommand(text);
        if (!command) {
            return false;
        }

        switch (command.action) {
            case 'cart':
                await this.showCartWithOptions(from, state);
                return true;

            case 'remove':
                if (!command.itemIndex) return false;
                if (state.items.length === 0) {
                    await this.getClientOrThrow().sendText(from, '🛒 Tu carrito está vacío.');
                    return true;
                }
                if (this.removeCartItem(state, command.itemIndex)) {
                    if (state.items.length === 0) {
                        await this.getClientOrThrow().sendText(from,
                            `✅ Producto eliminado.\n\n🛒 Tu carrito ahora está vacío.\n\n` +
                            `_Escribe un número del menú para agregar productos._`
                        );
                    } else {
                        await this.getClientOrThrow().sendText(from,
                            `✅ Producto eliminado.\n\n` +
                            `🛒 *Tu carrito:*\n${this.formatOrderItems(state.items, true)}\n\n` +
                            `💰 *Total: $${this.calculateTotal(state.items).toFixed(2)}*`
                        );
                    }
                } else {
                    await this.getClientOrThrow().sendText(from,
                        `❌ Número inválido. Tu carrito tiene ${state.items.length} producto(s).\n` +
                        `Escribe *"carrito"* para ver los números.`
                    );
                }
                return true;

            case 'change':
                if (!command.itemIndex || !command.quantity) return false;
                if (state.items.length === 0) {
                    await this.getClientOrThrow().sendText(from, '🛒 Tu carrito está vacío.');
                    return true;
                }
                if (this.changeCartItemQuantity(state, command.itemIndex, command.quantity)) {
                    const item = state.items[command.itemIndex - 1];
                    await this.getClientOrThrow().sendText(from,
                        `✅ Cantidad actualizada: ${command.quantity}x ${item.name}\n\n` +
                        `🛒 *Tu carrito:*\n${this.formatOrderItems(state.items, true)}\n\n` +
                        `💰 *Total: $${this.calculateTotal(state.items).toFixed(2)}*`
                    );
                } else {
                    await this.getClientOrThrow().sendText(from,
                        `❌ No se pudo cambiar. Verifica:\n` +
                        `• Número de producto válido (1-${state.items.length})\n` +
                        `• Cantidad entre 1 y 99\n\n` +
                        `Escribe *"carrito"* para ver los productos.`
                    );
                }
                return true;

            case 'clear':
                if (state.items.length === 0) {
                    await this.getClientOrThrow().sendText(from, '🛒 Tu carrito ya está vacío.');
                } else {
                    state.items = [];
                    await this.getClientOrThrow().sendText(from,
                        `🗑️ *Carrito vaciado*\n\n` +
                        `_Escribe un número del menú para agregar productos._`
                    );
                }
                return true;

            default:
                return false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FUNCIONES DE DETALLE DE PRODUCTO (IMÁGENES)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Parsea comandos para ver detalle de producto
     * "ver 1", "detalle 1", "foto 1", "imagen 1"
     */
    private parseProductDetailCommand(text: string): number | null {
        const textLower = text.toLowerCase().trim();
        const match = textLower.match(/^(?:ver|detalle|foto|imagen)\s+(\d+)$/);
        if (match) {
            return parseInt(match[1], 10);
        }
        return null;
    }

    /**
     * Envía detalle de un producto con imagen
     * @returns true si se procesó el comando, false si no
     */
    private async handleProductDetailCommand(
        from: string,
        text: string,
        state: ConversationState
    ): Promise<boolean> {
        const productIndex = this.parseProductDetailCommand(text);
        if (productIndex === null) {
            return false;
        }

        // Verificar que tenemos el mapa de menú
        if (!state.menuIndexMap || state.menuIndexMap.size === 0) {
            await this.getClientOrThrow().sendText(from,
                `❌ Primero escribe *"menu"* para ver los productos.`
            );
            return true;
        }

        // Buscar el producto
        const item = state.menuIndexMap.get(productIndex);
        if (!item) {
            await this.getClientOrThrow().sendText(from,
                `❌ No encontré el producto #${productIndex}.\n` +
                `Escribe un número del 1 al ${state.menuIndexMap.size}.`
            );
            return true;
        }

        // Construir mensaje de detalle
        let detailMessage = `📦 *${item.name}*\n\n`;
        detailMessage += `💵 *Precio:* $${item.price.toFixed(2)}\n`;
        detailMessage += `📂 *Categoría:* ${item.category}\n`;
        if (item.description) {
            detailMessage += `\n📝 ${item.description}\n`;
        }
        detailMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        detailMessage += `_Escribe *"${productIndex}"* para agregar al carrito_`;

        // Si tiene imagen, enviarla con el caption
        if (item.imageUrl) {
            try {
                await this.getClientOrThrow().sendImage(from, item.imageUrl, detailMessage);
                logger.info('[WhatsAppChatbot] Product image sent', { productIndex, name: item.name });
            } catch (error) {
                // Si falla la imagen, enviar solo texto
                logger.error('[WhatsAppChatbot] Failed to send product image', { item: item.name, error });
                await this.getClientOrThrow().sendText(from, detailMessage);
            }
        } else {
            // Sin imagen, solo texto
            await this.getClientOrThrow().sendText(from,
                detailMessage + `\n\n_Este producto no tiene foto disponible_`
            );
        }

        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FUNCIONES DE UBICACIÓN Y DELIVERY
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
     * @param lat1 Latitud del punto 1
     * @param lng1 Longitud del punto 1
     * @param lat2 Latitud del punto 2
     * @param lng2 Longitud del punto 2
     * @returns Distancia en kilómetros
     */
    private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return Math.round(distance * 100) / 100; // Redondear a 2 decimales
    }

    /**
     * Convierte grados a radianes
     */
    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Valida si la ubicación del cliente está dentro del área de cobertura
     * y calcula el costo del delivery
     * @returns Objeto con validación y costo, o null si ubicación no está configurada
     */
    private validateDeliveryCoverage(customerLat: number, customerLng: number): {
        isValid: boolean;
        distance: number;
        deliveryCost: number;
        message?: string;
    } | null {
        const locationConfig = this.config?.location;

        // Si no hay configuración de ubicación o no está habilitada, retornar null
        if (!locationConfig || !locationConfig.enabled) {
            return null;
        }

        const businessLat = locationConfig.businessLocation.lat;
        const businessLng = locationConfig.businessLocation.lng;

        // Calcular distancia
        const distance = this.calculateDistance(
            customerLat,
            customerLng,
            businessLat,
            businessLng
        );

        logger.info('[WhatsAppChatbot] Distance calculated', {
            customerLat,
            customerLng,
            businessLat,
            businessLng,
            distance,
            maxRadius: locationConfig.maxDeliveryRadiusKm
        });

        // Verificar si está dentro del radio
        if (distance > locationConfig.maxDeliveryRadiusKm) {
            // Fuera de cobertura
            const message = (locationConfig.outOfRangeMessage ||
                'Lo sentimos, tu ubicación está fuera de nuestra área de cobertura ({distance}km). Nuestro radio máximo es de {maxRadius}km.')
                .replace('{distance}', distance.toFixed(1))
                .replace('{maxRadius}', locationConfig.maxDeliveryRadiusKm.toString());

            return {
                isValid: false,
                distance,
                deliveryCost: 0,
                message
            };
        }

        // Calcular costo de delivery
        let deliveryCost = distance * locationConfig.costPerKm;

        // Aplicar costo mínimo si es necesario
        if (deliveryCost < locationConfig.minDeliveryCost) {
            deliveryCost = locationConfig.minDeliveryCost;
        }

        // Redondear a 2 decimales
        deliveryCost = Math.round(deliveryCost * 100) / 100;

        return {
            isValid: true,
            distance,
            deliveryCost
        };
    }

    /**
     * Verifica si la funcionalidad de ubicación está habilitada
     */
    private isLocationEnabled(): boolean {
        return this.config?.location?.enabled === true;
    }

    /**
     * Maneja el mensaje de ubicación recibido del cliente
     */
    private async handleLocationMessage(
        from: string,
        latitude: number,
        longitude: number,
        locationAddress: string | undefined,
        state: ConversationState
    ): Promise<void> {
        logger.info('[WhatsAppChatbot] Processing location message', {
            from,
            latitude,
            longitude,
            currentStep: state.step
        });

        // Solo procesar si estamos esperando la ubicación
        if (state.step !== 'WAITING_LOCATION') {
            // Si envía ubicación en otro momento, ignorar pero agradecer
            await this.getClientOrThrow().sendText(from,
                '📍 Ubicación recibida.\n\n' +
                'Para usarla en tu pedido, primero agrega productos al carrito y continúa con el proceso de compra.'
            );
            return;
        }

        // Validar cobertura
        const coverageResult = this.validateDeliveryCoverage(latitude, longitude);

        if (!coverageResult) {
            // La ubicación no está configurada - no debería llegar aquí
            logger.error('[WhatsAppChatbot] Location validation failed - config not found');
            state.step = 'WAITING_ADDRESS';
            await this.getClientOrThrow().sendText(from,
                '⚠️ Hubo un problema validando tu ubicación.\n\n' +
                '📝 Por favor, escribe tu dirección manualmente:'
            );
            return;
        }

        if (!coverageResult.isValid) {
            // Fuera del área de cobertura
            await this.getClientOrThrow().sendText(from,
                `❌ *Fuera de área de cobertura*\n\n` +
                `📍 ${coverageResult.message}\n\n` +
                `¿Deseas continuar con recogida en local? Escribe *"local"* o *"cancelar"* para terminar.`
            );
            // Mantener en WAITING_LOCATION para que pueda reintentar o cambiar a local
            return;
        }

        // Dentro de cobertura - guardar datos
        state.customerLocation = {
            latitude,
            longitude,
            address: locationAddress
        };
        state.deliveryDistance = coverageResult.distance;
        state.deliveryCost = coverageResult.deliveryCost;

        // Mostrar confirmación con costo de delivery
        await this.getClientOrThrow().sendText(from,
            `✅ *Ubicación recibida*\n\n` +
            `📍 Distancia: ${coverageResult.distance.toFixed(1)} km\n` +
            `🚗 Costo de delivery: $${coverageResult.deliveryCost.toFixed(2)}\n\n` +
            (locationAddress ? `📮 Dirección: ${locationAddress}\n\n` : '') +
            `Si la dirección no es correcta, escríbela a continuación.\n` +
            `Si está correcta, escribe *"ok"* para continuar.`
        );

        // Cambiar a WAITING_ADDRESS para que pueda corregir o confirmar
        state.step = 'WAITING_ADDRESS';
    }

    /**
     * Limpia conversaciones inactivas (mas de 30 min) de memoria
     * También limpia conversaciones inactivas de la BD (>60 min, solo IDLE sin historial)
     */
    public async cleanupInactiveConversations(): Promise<void> {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        // Limpiar de memoria local
        for (const [phone, state] of this.conversations.entries()) {
            if (state.lastActivity < thirtyMinutesAgo) {
                this.conversations.delete(phone);
                logger.info('[WhatsAppChatbot] Cleaned up inactive conversation from memory', { phone });
            }
        }

        // Limpiar de BD (conversaciones IDLE sin historial de pedidos, >60 min de inactividad)
        try {
            const deletedCount = await this.conversationRepo.cleanupInactive(60);
            if (deletedCount > 0) {
                logger.info('[WhatsAppChatbot] Cleaned up inactive conversations from DB', { deletedCount });
            }
        } catch (error) {
            logger.error('[WhatsAppChatbot] Error cleaning up DB conversations', { error });
        }
    }

    /**
     * Normaliza el número de teléfono al formato usado internamente (con @c.us)
     * Maneja tanto @c.us como @lid (formato alternativo de WhatsApp)
     */
    private normalizePhone(phone: string): string {
        // Primero, extraer solo el número (quitar @lid, @c.us, @s.whatsapp.net, etc.)
        let cleaned = phone.replace(/@(lid|c\.us|s\.whatsapp\.net|g\.us)$/i, '');
        cleaned = cleaned.replace(/[\s\-\(\)\+]/g, '');

        // Ecuador: convertir 09xxxxxxxx a 593xxxxxxxx
        if (cleaned.startsWith('09') && cleaned.length === 10) {
            cleaned = '593' + cleaned.substring(1);
        } else if (cleaned.startsWith('9') && cleaned.length === 9) {
            cleaned = '593' + cleaned;
        }

        // Siempre usar formato @c.us para consistencia
        return cleaned + '@c.us';
    }

    /**
     * Activa modo manual para una conversación (el admin toma control)
     * El chatbot dejará de responder automáticamente
     */
    public async setManualMode(phone: string, enabled: boolean): Promise<boolean> {
        const normalizedPhone = this.normalizePhone(phone);
        logger.info('[WhatsAppChatbot] setManualMode called', { phone, normalizedPhone, enabled });

        let state = this.conversations.get(normalizedPhone);

        if (!state && enabled) {
            // Crear estado si no existe
            state = {
                step: 'MANUAL',
                items: [],
                lastActivity: new Date(),
                manualMode: true,
                manualModeStartedAt: new Date()
            };
            this.conversations.set(normalizedPhone, state);
            await this.persistConversation(normalizedPhone, state);
            logger.info('[WhatsAppChatbot] Manual mode enabled (new conversation)', { normalizedPhone });
            return true;
        }

        if (state) {
            state.manualMode = enabled;
            if (enabled) {
                state.manualModeStartedAt = new Date();
                state.step = 'MANUAL';
                logger.info('[WhatsAppChatbot] Manual mode enabled', { normalizedPhone });
            } else {
                state.manualModeStartedAt = undefined;
                state.step = 'IDLE';
                logger.info('[WhatsAppChatbot] Manual mode disabled, returning to IDLE', { normalizedPhone });
            }
            await this.persistConversation(normalizedPhone, state);
            return true;
        }

        // Si no existe la conversación pero queremos activar manual mode, crearla
        if (enabled) {
            state = {
                step: 'MANUAL',
                items: [],
                lastActivity: new Date(),
                manualMode: true,
                manualModeStartedAt: new Date()
            };
            this.conversations.set(normalizedPhone, state);
            await this.persistConversation(normalizedPhone, state);
            logger.info('[WhatsAppChatbot] Manual mode enabled (created new)', { normalizedPhone });
            return true;
        }

        logger.warn('[WhatsAppChatbot] Could not set manual mode - conversation not found', { normalizedPhone });
        return false;
    }

    /**
     * Verifica si una conversación está en modo manual
     */
    public isManualMode(phone: string): boolean {
        const normalizedPhone = this.normalizePhone(phone);
        const state = this.conversations.get(normalizedPhone);
        return state?.manualMode === true;
    }

    /**
     * Obtiene todas las conversaciones en modo manual
     */
    public getManualModeConversations(): Array<{ phone: string; startedAt: Date }> {
        const result: Array<{ phone: string; startedAt: Date }> = [];

        for (const [phone, state] of this.conversations.entries()) {
            if (state.manualMode && state.manualModeStartedAt) {
                result.push({
                    phone,
                    startedAt: state.manualModeStartedAt
                });
            }
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NOTIFICACIONES PROACTIVAS DE ESTADO
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Envía notificación proactiva cuando cambia el estado de un pedido
     * Llamar desde UpdateOrder o desde el controller de órdenes
     */
    public async notifyOrderStatusChange(
        orderId: string,
        customerPhone: string,
        oldStatus: string,
        newStatus: string,
        orderItems?: Array<{ name: string; quantity: number }>
    ): Promise<boolean> {
        if (!this.client) {
            logger.warn('[WhatsAppChatbot] Cannot send notification - client not available');
            return false;
        }

        try {
            // Limpiar el número de teléfono
            let phone = customerPhone.replace('@c.us', '');
            // Limpiar cualquier formato WhatsApp adicional
            phone = phone.replace('[WhatsApp: ', '').replace(']', '');

            // Si el teléfono empieza con 0 (Ecuador local), convertir
            if (phone.startsWith('09') && phone.length === 10) {
                phone = '593' + phone.substring(1);
            }

            let message = '';

            switch (newStatus) {
                case 'Listo':
                    message = `🎉 *¡Tu pedido está LISTO!*\n\n`;
                    message += `━━━━━━━━━━━━━━━━━━━━\n`;
                    if (orderItems && orderItems.length > 0) {
                        message += `🛒 *Tu pedido:*\n`;
                        for (const item of orderItems) {
                            message += `   • ${item.quantity}x ${item.name}\n`;
                        }
                        message += `━━━━━━━━━━━━━━━━━━━━\n`;
                    }
                    message += `\n✅ Puedes pasar a recogerlo o está en camino.\n`;
                    message += `\n_¡Gracias por tu preferencia!_`;
                    break;

                case 'Completado':
                    message = `✔️ *Pedido entregado*\n\n`;
                    message += `¡Gracias por tu compra!\n\n`;
                    message += `⭐ Si te gustó nuestro servicio, compártelo con tus amigos.\n\n`;
                    message += `_Escribe *Hola* para hacer un nuevo pedido._`;
                    break;

                case 'Nuevo':
                    // Notificar si se agregaron items adicionales o se reactivó
                    if (oldStatus === 'Listo' || oldStatus === 'Completado') {
                        message = `🔄 *Actualización de tu pedido*\n\n`;
                        message += `Se han agregado más productos a tu pedido.\n`;
                        message += `Estamos preparándolo nuevamente.\n\n`;
                        message += `_Te avisaremos cuando esté listo._`;
                    }
                    break;

                default:
                    // No enviar notificación para otros estados
                    return true;
            }

            if (message) {
                await this.client.sendText(phone, message);
                logger.info('[WhatsAppChatbot] Order status notification sent', {
                    orderId,
                    phone,
                    oldStatus,
                    newStatus
                });
                return true;
            }

            return true;
        } catch (error) {
            logger.error('[WhatsAppChatbot] Error sending order status notification', {
                orderId,
                customerPhone,
                newStatus,
                error
            });
            return false;
        }
    }

    /**
     * Envía notificación con tiempo estimado de entrega
     * Llamar cuando el admin establece un tiempo estimado
     */
    public async notifyEstimatedTime(
        customerPhone: string,
        estimatedMinutes: number,
        orderItems?: Array<{ name: string; quantity: number }>
    ): Promise<boolean> {
        if (!this.client) {
            logger.warn('[WhatsAppChatbot] Cannot send notification - client not available');
            return false;
        }

        try {
            let phone = customerPhone.replace('@c.us', '');
            phone = phone.replace('[WhatsApp: ', '').replace(']', '');

            if (phone.startsWith('09') && phone.length === 10) {
                phone = '593' + phone.substring(1);
            }

            let message = `⏱️ *Actualización de tu pedido*\n\n`;
            message += `━━━━━━━━━━━━━━━━━━━━\n`;
            if (orderItems && orderItems.length > 0) {
                message += `🛒 *Tu pedido:*\n`;
                for (const item of orderItems) {
                    message += `   • ${item.quantity}x ${item.name}\n`;
                }
                message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            }
            message += `🕐 *Tiempo estimado: ${estimatedMinutes} minutos*\n\n`;
            message += `_Te avisaremos cuando esté listo._`;

            await this.client.sendText(phone, message);
            logger.info('[WhatsAppChatbot] Estimated time notification sent', {
                phone,
                estimatedMinutes
            });
            return true;
        } catch (error) {
            logger.error('[WhatsAppChatbot] Error sending estimated time notification', {
                customerPhone,
                estimatedMinutes,
                error
            });
            return false;
        }
    }
}

// Singleton instance
let chatbotInstance: WhatsAppChatbot | null = null;

export function getWhatsAppChatbot(): WhatsAppChatbot {
    if (!chatbotInstance) {
        chatbotInstance = new WhatsAppChatbot();
    }
    return chatbotInstance;
}
