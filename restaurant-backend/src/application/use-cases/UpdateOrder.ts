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

import { Order } from '../../domain/entities/Order';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { NotFoundError } from '../../domain/errors/CustomErrors';

export class UpdateOrder {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(id: string, updates: Partial<Order>): Promise<Order> {
        const order = await this.orderRepository.update(id, updates);
        if (!order) {
            throw new NotFoundError(`Order with ID ${id} not found`);
        }
        return order;
    }
}
