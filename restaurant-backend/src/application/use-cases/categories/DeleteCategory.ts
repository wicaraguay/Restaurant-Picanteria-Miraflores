/**
 * @file DeleteCategory.ts
 * @description Caso de uso para eliminar una categoría
 *
 * @layer Application - Lógica de negocio
 */

import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository';
import { ValidationError, NotFoundError } from '../../../domain/errors/CustomErrors';

export class DeleteCategory {
    constructor(private categoryRepository: ICategoryRepository) {}

    async execute(id: string): Promise<boolean> {
        // Verificar que existe
        const existing = await this.categoryRepository.findById(id);
        if (!existing) {
            throw new NotFoundError('Category not found');
        }

        // Verificar que no tenga productos asociados
        const productCount = await this.categoryRepository.countProducts(id);
        if (productCount > 0) {
            throw new ValidationError(
                `Cannot delete category with ${productCount} associated products. ` +
                'Please reassign or delete the products first.'
            );
        }

        return this.categoryRepository.delete(id);
    }
}
