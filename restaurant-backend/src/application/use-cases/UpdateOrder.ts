/**
 * @file UpdateOrder.ts
 * @description Caso de uso para actualizar una orden existente
 *
 * @purpose
 * Actualiza datos de una orden (ej: cambiar estado, modificar items). Lanza error si no existe.
 * Envía notificaciones proactivas por WhatsApp cuando cambia el estado.
 *
 * @connections
 * - Usa: IOrderRepository (domain/repositories)
 * - Usa: Order entity (domain/entities)
 * - Usa: NotFoundError (domain/errors)
 * - Usa: WhatsAppChatbot (para notificaciones)
 * - Usado por: orderRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 *
 * @layer Application - Lógica de negocio
 */

import { Order, OrderStatus } from '../../domain/entities/Order';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { NotFoundError } from '../../domain/errors/CustomErrors';
import { getWhatsAppChatbot } from '../../infrastructure/services/whatsapp/WhatsAppChatbot';
import { logger } from '../../infrastructure/utils/Logger';

export class UpdateOrder {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(id: string, updates: Partial<Order>): Promise<Order> {
        // Obtenemos la orden actual para verificar su estado
        const currentOrder = await this.orderRepository.findById(id);
        if (!currentOrder) {
            throw new NotFoundError(`Order with ID ${id} not found`);
        }

        // Guardar estado anterior para notificaciones
        const oldStatus = currentOrder.status;
        const oldEstimatedMinutes = currentOrder.estimatedMinutes;

        // Lógica de transición de estado incremental
        // Si se actualizan items y hay alguno sin preparar, y la orden estaba Lista/Completada,
        // forzamos el regreso a "Nuevo" para que aparezca en cocina.
        if (updates.items) {
            const hasUnpreparedItems = updates.items.some(item => !item.prepared);
            if (hasUnpreparedItems && (currentOrder.status === OrderStatus.Ready || currentOrder.status === OrderStatus.Completed)) {
                updates.status = OrderStatus.New;
                updates.readyAt = null; // Limpiamos la fecha de listo
            }
        }

        const order = await this.orderRepository.update(id, updates);
        if (!order) {
            throw new NotFoundError(`Order with ID ${id} not found`);
        }

        // Enviar notificaciones proactivas si el pedido es de WhatsApp
        await this.sendNotifications(currentOrder, order, oldStatus, oldEstimatedMinutes);

        return order;
    }

    /**
     * Envía notificaciones proactivas por WhatsApp cuando aplica
     */
    private async sendNotifications(
        oldOrder: Order,
        newOrder: Order,
        oldStatus: OrderStatus,
        oldEstimatedMinutes: number | null | undefined
    ): Promise<void> {
        try {
            // Solo notificar si el pedido tiene teléfono de WhatsApp
            const phone = this.extractWhatsAppPhone(oldOrder.customerName);
            if (!phone) {
                return;
            }

            const chatbot = getWhatsAppChatbot();
            if (!chatbot.isAvailable()) {
                return;
            }

            // Notificar cambio de estado
            if (newOrder.status !== oldStatus) {
                await chatbot.notifyOrderStatusChange(
                    newOrder.id,
                    phone,
                    oldStatus,
                    newOrder.status,
                    newOrder.items.map(i => ({ name: i.name, quantity: i.quantity }))
                );
            }

            // Notificar tiempo estimado (solo si cambió y es un nuevo tiempo)
            if (
                newOrder.estimatedMinutes &&
                newOrder.estimatedMinutes !== oldEstimatedMinutes &&
                newOrder.status === OrderStatus.New
            ) {
                await chatbot.notifyEstimatedTime(
                    phone,
                    newOrder.estimatedMinutes,
                    newOrder.items.map(i => ({ name: i.name, quantity: i.quantity }))
                );
            }
        } catch (error) {
            // No fallar la actualización si la notificación falla
            logger.error('[UpdateOrder] Error sending WhatsApp notification', { error });
        }
    }

    /**
     * Extrae el número de teléfono de WhatsApp del nombre del cliente
     * Formato esperado: "Nombre [WhatsApp: 593XXXXXXXXX]"
     */
    private extractWhatsAppPhone(customerName: string): string | null {
        const match = customerName.match(/\[WhatsApp:\s*(\d+)\]/);
        return match ? match[1] : null;
    }
}
