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
import { Order, OrderItem, OrderStatus } from '../../domain/entities/Order';

export interface CreateOrderDTO {
    customerName: string;
    items: OrderItem[];
    type: 'En Local' | 'Delivery' | 'Para Llevar';
    status?: OrderStatus;
}

export class CreateOrder {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(orderData: CreateOrderDTO): Promise<Order> {
        // Add business logic: validate items, calculate total (if needed), etc.
        const order = await this.orderRepository.create(orderData as any);
        return order;
    }
}
