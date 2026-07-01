/**
 * @file UpdateOrder.ts
 * @description Caso de uso para actualizar una orden existente
 */

import { Order, OrderStatus } from '../../domain/entities/Order';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { NotFoundError } from '../../domain/errors/CustomErrors';

export class UpdateOrder {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(id: string, updates: Partial<Order>): Promise<Order> {
        const currentOrder = await this.orderRepository.findById(id);
        if (!currentOrder) {
            throw new NotFoundError(`Order with ID ${id} not found`);
        }

        // Lógica de transición de estado incremental
        if (updates.items) {
            const hasUnpreparedItems = updates.items.some(item => !item.prepared);
            if (hasUnpreparedItems && (currentOrder.status === OrderStatus.Ready || currentOrder.status === OrderStatus.Completed)) {
                updates.status = OrderStatus.New;
                updates.readyAt = null;
            }
        }

        const order = await this.orderRepository.update(id, updates);
        if (!order) {
            throw new NotFoundError(`Order with ID ${id} not found`);
        }

        return order;
    }
}
