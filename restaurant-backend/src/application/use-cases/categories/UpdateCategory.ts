/**
 * @file UpdateCategory.ts
 * @description Caso de uso para actualizar una categoría existente
 *
 * @layer Application - Lógica de negocio
 */

import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository';
import { Category, UpdateCategoryDTO } from '../../../domain/entities/Category';
import { ValidationError, NotFoundError } from '../../../domain/errors/CustomErrors';

export class UpdateCategory {
    constructor(private categoryRepository: ICategoryRepository) {}

    async execute(id: string, data: UpdateCategoryDTO): Promise<Category> {
        // Verificar que existe
        const existing = await this.categoryRepository.findById(id);
        if (!existing) {
            throw new NotFoundError('Category not found');
        }

        // Si se actualiza el nombre, verificar que no exista duplicado
        if (data.name && data.name.trim() !== existing.name) {
            const duplicate = await this.categoryRepository.findByName(data.name.trim());
            if (duplicate && duplicate.id !== id) {
                throw new ValidationError('Category with this name already exists');
            }
            data.name = data.name.trim();
        }

        // Validar productType si se proporciona
        if (data.productType && !['menu', 'retail'].includes(data.productType)) {
            throw new ValidationError('Product type must be "menu" or "retail"');
        }

        const updated = await this.categoryRepository.update(id, data);
        if (!updated) {
            throw new NotFoundError('Category not found');
        }

        return updated;
    }
}
