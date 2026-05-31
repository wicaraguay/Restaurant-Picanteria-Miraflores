/**
 * @file DeleteDisabledProducts.ts
 * @description Caso de uso para eliminar productos deshabilitados permanentemente
 *
 * @purpose
 * Elimina productos que están deshabilitados (isEnabled: false).
 * Operación irreversible que limpia el catálogo de productos obsoletos.
 *
 * @connections
 * - Usa: IProductRepository
 * - Usado por: MaintenanceController
 *
 * @layer Application - Lógica de negocio
 */

import { IMenuRepository } from '../../domain/repositories/IMenuRepository';
import { logger } from '../../infrastructure/utils/Logger';

export interface DeleteDisabledProductsResult {
    deletedCount: number;
    message: string;
}

export class DeleteDisabledProducts {
    constructor(
        private menuRepository: IMenuRepository
    ) {}

    async execute(): Promise<DeleteDisabledProductsResult> {
        logger.info('[DeleteDisabledProducts] Starting deletion of disabled products');

        try {
            const menuItems = await this.menuRepository.findAll();

            // Filtrar items deshabilitados
            const disabledItems = menuItems.filter(item => !item.available);

            // Eliminar items deshabilitados
            let deletedCount = 0;
            for (const item of disabledItems) {
                await this.menuRepository.delete(item.id);
                deletedCount++;
            }

            logger.info('[DeleteDisabledProducts] Products deleted successfully', {
                deletedCount
            });

            return {
                deletedCount,
                message: `${deletedCount} productos deshabilitados eliminados permanentemente`
            };
        } catch (error) {
            logger.error('[DeleteDisabledProducts] Error deleting disabled products', error);
            throw error;
        }
    }
}
