/**
 * @file CreateCategory.ts
 * @description Caso de uso para crear una nueva categoría
 *
 * @purpose
 * Crea una nueva categoría con validación de nombre único.
 *
 * @connections
 * - Usa: ICategoryRepository (domain/repositories)
 * - Usa: Category entity (domain/entities)
 * - Usado por: categoryRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 *
 * @layer Application - Lógica de negocio
 */

import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository';
import { Category, CreateCategoryDTO } from '../../../domain/entities/Category';
import { ValidationError } from '../../../domain/errors/CustomErrors';

export class CreateCategory {
    constructor(private categoryRepository: ICategoryRepository) {}

    async execute(data: CreateCategoryDTO): Promise<Category> {
        // Validar nombre requerido
        if (!data.name || data.name.trim().length === 0) {
            throw new ValidationError('Category name is required');
        }

        // Validar que no exista categoría con el mismo nombre
        const existing = await this.categoryRepository.findByName(data.name.trim());
        if (existing) {
            throw new ValidationError('Category with this name already exists');
        }

        // Validar productType
        if (!data.productType || !['menu', 'retail'].includes(data.productType)) {
            throw new ValidationError('Product type must be "menu" or "retail"');
        }

        return this.categoryRepository.create({
            ...data,
            name: data.name.trim(),
        });
    }
}
