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
import { NotFoundError } from '../../domain/errors/CustomErrors';

export class DeleteOrder {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(id: string): Promise<void> {
        const result = await this.orderRepository.delete(id);
        if (!result) {
            throw new NotFoundError(`Order with ID ${id} not found`);
        }
    }
}
