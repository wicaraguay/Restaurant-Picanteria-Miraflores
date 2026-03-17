/**
 * @file DeleteOrder.ts
 * @description Caso de uso para eliminar una orden
 * 
 * @purpose
 * Elimina una orden del sistema. Lanza error si la orden no existe.
 * 
 * @connections
 * - Usa: IOrderRepository (domain/repositories)
 * - Usa: NotFoundError (domain/errors)
 * - Usado por: orderRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Application - Lógica de negocio
 */

import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { NotFoundError, ForbiddenError } from '../../domain/errors/CustomErrors';
import { OrderStatus } from '../../domain/entities/Order';

export class DeleteOrder {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(id: string, roleId?: string): Promise<void> {
        const order = await this.orderRepository.findById(id);
        
        if (!order) {
            throw new NotFoundError(`Order with ID ${id} not found`);
        }

        // Restricción: Solo Administrador (ID '1') puede borrar pedidos completados
        if (order.status === OrderStatus.Completed && roleId !== '1') {
            throw new ForbiddenError('Solo el administrador puede eliminar pedidos del historial');
        }

        const result = await this.orderRepository.delete(id);
        if (!result) {
            throw new NotFoundError(`Order with ID ${id} not found`);
        }
    }
}
