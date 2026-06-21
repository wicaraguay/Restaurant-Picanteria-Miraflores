/**
 * @file ReorderCategories.ts
 * @description Caso de uso para reordenar categorías
 *
 * @layer Application - Lógica de negocio
 */

import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository';
import { ReorderCategoryDTO } from '../../../domain/entities/Category';
import { ValidationError } from '../../../domain/errors/CustomErrors';

export class ReorderCategories {
    constructor(private categoryRepository: ICategoryRepository) {}

    async execute(items: ReorderCategoryDTO[]): Promise<boolean> {
        // Validar que se proporcionen items
        if (!items || items.length === 0) {
            throw new ValidationError('No items to reorder');
        }

        // Validar estructura de cada item
        for (const item of items) {
            if (!item.id) {
                throw new ValidationError('Each item must have an id');
            }
            if (typeof item.sortOrder !== 'number' || item.sortOrder < 0) {
                throw new ValidationError('Each item must have a valid sortOrder');
            }
        }

        return this.categoryRepository.reorder(items);
    }
}
