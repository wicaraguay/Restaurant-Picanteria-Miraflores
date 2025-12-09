/**
 * @file CreateOrder.ts
 * @description Caso de uso para crear una nueva orden/pedido
 * 
 * @purpose
 * Crea una nueva orden en el sistema. Puede incluir lógica de validación de items y cálculos.
 * 
 * @connections
 * - Usa: IOrderRepository (domain/repositories)
 * - Usa: Order entity (domain/entities)
 * - Usado por: orderRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Application - Lógica de negocio
 */

import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { Order } from '../../domain/entities/Order';

export class CreateOrder {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(orderData: Order): Promise<Order> {
        // Add business logic: validate items, calculate total (if needed), etc.
        // For now, just save.
        return this.orderRepository.create(orderData);
    }
}
