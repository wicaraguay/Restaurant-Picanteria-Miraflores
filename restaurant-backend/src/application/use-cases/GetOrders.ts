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
import { PaginatedResult } from '../../infrastructure/repositories/BaseRepository';

export class GetOrders {
    constructor(private orderRepository: IOrderRepository) { }

    /**
     * Get all orders (deprecated - use executePaginated for better performance)
     * @deprecated Use executePaginated instead
     */
    async execute(): Promise<Order[]> {
        return this.orderRepository.findAll();
    }

    /**
     * Get orders with pagination
     * @param page - Page number (default: 1)
     * @param limit - Items per page (default: 50, max: 100)
     * @param filter - Optional filter object
     * @param sort - Optional sort object (default: { createdAt: -1 })
     */
    async executePaginated(
        page: number = 1,
        limit: number = 50,
        filter: any = {},
        sort: any = { createdAt: -1 }
    ): Promise<PaginatedResult<Order>> {
        return this.orderRepository.findPaginated(page, limit, filter, sort);
    }
}
