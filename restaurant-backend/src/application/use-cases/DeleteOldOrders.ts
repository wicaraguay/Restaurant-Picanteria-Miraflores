/**
 * @file DeleteOldOrders.ts
 * @description Caso de uso para eliminar órdenes antiguas
 *
 * @purpose
 * Limpia órdenes completadas/canceladas que tengan más de X meses de antigüedad.
 * Útil para mantener la base de datos optimizada y cumplir políticas de retención.
 *
 * @connections
 * - Usa: IOrderRepository
 * - Usado por: MaintenanceController
 *
 * @layer Application - Lógica de negocio
 */

import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { OrderStatus } from '../../domain/entities/Order';
import { ValidationError } from '../../domain/errors/CustomErrors';
import { logger } from '../../infrastructure/utils/Logger';

export interface DeleteOldOrdersParams {
    monthsOld: number;
}

export interface DeleteOldOrdersResult {
    deletedCount: number;
    message: string;
}

export class DeleteOldOrders {
    constructor(
        private orderRepository: IOrderRepository
    ) {}

    async execute(params: DeleteOldOrdersParams): Promise<DeleteOldOrdersResult> {
        const { monthsOld } = params;

        // Validar parámetros
        if (!monthsOld || monthsOld < 1 || monthsOld > 60) {
            throw new ValidationError('Months must be between 1 and 60');
        }

        // Calcular fecha límite
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);

        logger.info('[DeleteOldOrders] Starting deletion of old orders', {
            monthsOld,
            cutoffDate: cutoffDate.toISOString()
        });

        try {
            // Buscar órdenes antiguas completadas o canceladas
            const orders = await this.orderRepository.findAll();

            const ordersToDelete = orders.filter(order => {
                const orderDate = new Date(order.createdAt);
                const isOld = orderDate < cutoffDate;
                const isCompleted = order.status === OrderStatus.Completed;
                return isOld && isCompleted;
            });

            // Eliminar órdenes
            let deletedCount = 0;
            for (const order of ordersToDelete) {
                await this.orderRepository.delete(order.id);
                deletedCount++;
            }

            logger.info('[DeleteOldOrders] Orders deleted successfully', {
                deletedCount,
                monthsOld
            });

            return {
                deletedCount,
                message: `${deletedCount} órdenes antiguas eliminadas correctamente`
            };
        } catch (error) {
            logger.error('[DeleteOldOrders] Error deleting old orders', error);
            throw error;
        }
    }
}
