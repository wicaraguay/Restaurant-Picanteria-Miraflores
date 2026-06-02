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

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface ConversationState {
    step: 'IDLE' | 'SHOWING_MENU' | 'SELECTING_ITEMS' | 'CONFIRMING' | 'WAITING_NAME' | 'WAITING_ADDRESS' | 'WAITING_FINAL_CONFIRM' | 'WAITING_PAYMENT' | 'MANUAL';
    items: Array<{ name: string; quantity: number; price: number }>;
    customerName?: string;
    customerAddress?: string;
    lastActivity: Date;
    menuIndexMap?: Map<number, ChatMenuItem>; // Mapa de indice a item del menu
    lastOrderId?: string; // ID del ultimo pedido para consultas de estado
    manualMode?: boolean; // True cuando el admin toma control de la conversacion
    manualModeStartedAt?: Date; // Cuando se activo el modo manual
}

export interface IncomingMessage {
    from: string;           // Phone number (e.g., "593987654321")
    messageId: string;
    type: 'text' | 'button' | 'interactive' | 'image' | 'document';
    text?: string;
    buttonPayload?: string;
    listReplyId?: string;
    timestamp: number;
}

export interface ChatMenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    description?: string;
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
    private onOrderCreated?: (order: any) => Promise<string | void>; // Retorna el ID del pedido
    private config: ChatbotConfig | null = null;
    private cleanupInterval?: NodeJS.Timeout;
    private manualModeTimeoutMs: number = 30 * 60 * 1000; // 30 minutos timeout para modo manual

    constructor() {
        this.client = getWhatsAppClient();
        this.loadConfig();
        this.startCleanupScheduler();
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
                description: item.description
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
        const { from, type, text, buttonPayload, listReplyId } = message;

        // Normalizar el número de teléfono para consistencia
        const normalizedFrom = this.normalizePhone(from);

        logger.info('[WhatsAppChatbot] Processing message', { from, normalizedFrom, type, text: text?.substring(0, 50) });

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

        // Save state (usar número normalizado)
        this.conversations.set(normalizedFrom, state);
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

        // Si está en IDLE y escribe un número (1, 2, 3, 4), es selección del menú de bienvenida
        if (state.step === 'IDLE') {
            // Opciones del menú de bienvenida: 1=Ver Menú, 2=Hacer Pedido, 3=Mi Pedido, 4=Hablar con persona
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
            state.step = 'IDLE';
            state.items = [];
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

        if (cancelKeywords.some(k => text.includes(k))) {
            state.step = 'IDLE';
            state.items = [];
            const cancelMsg = this.config?.messages?.orderCancelled || 'Pedido cancelado. Escribe "Hola" para comenzar de nuevo.';
            await this.getClientOrThrow().sendText(from, `❌ ${cancelMsg}`);
            return;
        }

        // Handle based on current step
        switch (state.step) {
            case 'WAITING_NAME':
                state.customerName = text;
                state.step = 'WAITING_ADDRESS';
                const askAddressMsg = this.config?.messages?.askAddress || '¿Cuál es tu dirección para el delivery?';
                await this.getClientOrThrow().sendText(from, `✅ Gracias ${text}!\n\n📍 ${askAddressMsg}`);
                break;

            case 'WAITING_ADDRESS':
                state.customerAddress = text;
                await this.confirmOrder(from, state);
                break;

            case 'WAITING_FINAL_CONFIRM':
                // Esperando confirmacion final (si/no)
                if (text === 'si' || text === 'sí' || text === 'confirmar' || text === 'ok') {
                    await this.createOrder(from, state);
                } else if (text === 'no' || text === 'cancelar') {
                    state.step = 'IDLE';
                    state.items = [];
                    state.customerName = undefined;
                    state.customerAddress = undefined;
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
                state.step = 'IDLE';
                state.items = [];
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
            state.items.push({ name: item.name, quantity: 1, price: item.price });
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
            `*4️⃣ Hablar con Persona* - Atención personalizada\n` +
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
                state.items.push({ name: item.name, quantity: 1, price: item.price });
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
        const total = this.calculateTotal(state.items);

        await this.getClientOrThrow().sendText(from,
            `📋 *RESUMEN DE TU PEDIDO*\n\n` +
            `👤 *Cliente:* ${state.customerName}\n` +
            `📍 *Dirección:* ${state.customerAddress}\n\n` +
            `🛒 *Productos:*\n${this.formatOrderItems(state.items)}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 *TOTAL: $${total.toFixed(2)}*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `¿Confirmas tu pedido?\n` +
            `Escribe *Si* para confirmar o *No* para cancelar.`
        );

        state.step = 'WAITING_FINAL_CONFIRM';
    }

    /**
     * Crea el pedido en el sistema
     */
    private async createOrder(from: string, state: ConversationState): Promise<void> {
        try {
            const orderData = {
                customerName: state.customerName || 'Cliente WhatsApp',
                customerPhone: from,
                customerAddress: state.customerAddress,
                items: state.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                })),
                total: this.calculateTotal(state.items),
                type: state.customerAddress ? 'Delivery' : 'Para Llevar',
                source: 'whatsapp'
            };

            // Call the order creation callback y guardar el ID
            let orderId: string | undefined;
            if (this.onOrderCreated) {
                const result = await this.onOrderCreated(orderData);
                if (typeof result === 'string') {
                    orderId = result;
                    state.lastOrderId = orderId;
                }
            }

            const estimatedTime = this.config?.estimatedDeliveryTime || '30-45 minutos';
            const confirmTemplate = this.config?.messages?.orderConfirmed || '¡PEDIDO CONFIRMADO!\n\nTiempo estimado: {estimatedTime}';
            const confirmMsg = confirmTemplate.replace('{estimatedTime}', estimatedTime);
            const total = this.calculateTotal(state.items);

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
        state.lastOrderId = lastOrderId; // Mantener para consultas de estado
    }

    /**
     * Parsea seleccion por numero del menu
     * Soporta: "1", "2 del 1", "2 de 3", "3x1"
     */
    private parseNumberSelection(
        text: string,
        menuIndexMap?: Map<number, ChatMenuItem>
    ): { name: string; quantity: number; price: number } | null {
        if (!menuIndexMap || menuIndexMap.size === 0) return null;

        // Pattern: solo numero "1", "2", "15"
        const singleNumber = text.match(/^(\d+)$/);
        if (singleNumber) {
            const itemIndex = parseInt(singleNumber[1], 10);
            const item = menuIndexMap.get(itemIndex);
            if (item) {
                return { name: item.name, quantity: 1, price: item.price };
            }
        }

        // Pattern: "2 del 1", "3 de 5", "2 de el 1"
        const quantityOfItem = text.match(/^(\d+)\s*(?:del?|x)\s*(?:el\s*)?(\d+)$/i);
        if (quantityOfItem) {
            const quantity = parseInt(quantityOfItem[1], 10);
            const itemIndex = parseInt(quantityOfItem[2], 10);
            const item = menuIndexMap.get(itemIndex);
            if (item && quantity > 0 && quantity <= 20) {
                return { name: item.name, quantity, price: item.price };
            }
        }

        // Pattern: "1x2" (1 unidad del item 2)
        const xPattern = text.match(/^(\d+)x(\d+)$/i);
        if (xPattern) {
            const quantity = parseInt(xPattern[1], 10);
            const itemIndex = parseInt(xPattern[2], 10);
            const item = menuIndexMap.get(itemIndex);
            if (item && quantity > 0 && quantity <= 20) {
                return { name: item.name, quantity, price: item.price };
            }
        }

        return null;
    }

    /**
     * Parsea pedidos que vienen desde la página web
     * Formato: "Hola *Restaurante*, quisiera ordenar: 🍽️ *Producto* - $XX.XX 📝 Descripcion"
     */
    private async parseWebOrder(text: string): Promise<{ name: string; quantity: number; price: number } | null> {
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
                    return { name: menuItem.name, quantity: 1, price: menuItem.price };
                }

                // Si no está en el menú, usar el precio del mensaje
                return { name: productName, quantity: 1, price };
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
                return { name: menuItem.name, quantity: 1, price: menuItem.price };
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
    ): Promise<{ name: string; quantity: number; price: number } | null> {
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
                    return { name: item.name, quantity, price: item.price };
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
            return { name: item.name, quantity, price: item.price };
        }

        return null;
    }

    /**
     * Formatea items del pedido
     */
    private formatOrderItems(items: Array<{ name: string; quantity: number; price: number }>): string {
        return items
            .map(item => `• ${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`)
            .join('\n');
    }

    /**
     * Calcula total del pedido
     */
    private calculateTotal(items: Array<{ name: string; quantity: number; price: number }>): number {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    /**
     * Limpia conversaciones inactivas (mas de 30 min)
     */
    public cleanupInactiveConversations(): void {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        for (const [phone, state] of this.conversations.entries()) {
            if (state.lastActivity < thirtyMinutesAgo) {
                this.conversations.delete(phone);
                logger.info('[WhatsAppChatbot] Cleaned up inactive conversation', { phone });
            }
        }
    }

    /**
     * Normaliza el número de teléfono al formato usado internamente (con @c.us)
     */
    private normalizePhone(phone: string): string {
        let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

        // Ecuador: convertir 09xxxxxxxx a 593xxxxxxxx
        if (cleaned.startsWith('09') && cleaned.length === 10) {
            cleaned = '593' + cleaned.substring(1);
        } else if (cleaned.startsWith('9') && cleaned.length === 9) {
            cleaned = '593' + cleaned;
        }

        // Agregar @c.us para WhatsApp
        if (!cleaned.includes('@')) {
            cleaned = cleaned + '@c.us';
        }

        return cleaned;
    }

    /**
     * Activa modo manual para una conversación (el admin toma control)
     * El chatbot dejará de responder automáticamente
     */
    public setManualMode(phone: string, enabled: boolean): boolean {
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
}

// Singleton instance
let chatbotInstance: WhatsAppChatbot | null = null;

export function getWhatsAppChatbot(): WhatsAppChatbot {
    if (!chatbotInstance) {
        chatbotInstance = new WhatsAppChatbot();
    }
    return chatbotInstance;
}
