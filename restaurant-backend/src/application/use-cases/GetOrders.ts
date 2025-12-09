/**
 * @file GetOrders.ts
 * @description Caso de uso para obtener lista de órdenes
 * 
 * @purpose
 * Retorna todas las órdenes/pedidos registrados en el sistema.
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

export class GetOrders {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(): Promise<Order[]> {
        return this.orderRepository.findAll();
    }
}
