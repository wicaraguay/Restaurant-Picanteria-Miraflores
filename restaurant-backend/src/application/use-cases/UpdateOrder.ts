/**
 * @file UpdateOrder.ts
 * @description Caso de uso para actualizar una orden existente
 * 
 * @purpose
 * Actualiza datos de una orden (ej: cambiar estado, modificar items). Lanza error si no existe.
 * 
 * @connections
 * - Usa: IOrderRepository (domain/repositories)
 * - Usa: Order entity (domain/entities)
 * - Usa: NotFoundError (domain/errors)
 * - Usado por: orderRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Application - Lógica de negocio
 */

import { Order, OrderStatus } from '../../domain/entities/Order';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { NotFoundError } from '../../domain/errors/CustomErrors';

export class UpdateOrder {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(id: string, updates: Partial<Order>): Promise<Order> {
        // Obtenemos la orden actual para verificar su estado
        const currentOrder = await this.orderRepository.findById(id);
        if (!currentOrder) {
            throw new NotFoundError(`Order with ID ${id} not found`);
        }

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
        return order;
    }
}
