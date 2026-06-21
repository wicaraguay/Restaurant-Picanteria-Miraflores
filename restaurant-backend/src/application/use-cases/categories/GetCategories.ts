/**
 * @file GetCategories.ts
 * @description Caso de uso para obtener categorías
 *
 * @layer Application - Lógica de negocio
 */

import { ICategoryRepository } from '../../../domain/repositories/ICategoryRepository';
import { Category, ProductType } from '../../../domain/entities/Category';

export interface GetCategoriesOptions {
    productType?: ProductType;
    visibleOnWebsite?: boolean;
    includeProductCount?: boolean;
}

export interface CategoryWithCount extends Category {
    productCount?: number;
}

export class GetCategories {
    constructor(private categoryRepository: ICategoryRepository) {}

    async execute(options: GetCategoriesOptions = {}): Promise<CategoryWithCount[]> {
        let categories: Category[];

        if (options.visibleOnWebsite) {
            categories = await this.categoryRepository.findVisibleOnWebsite();
        } else if (options.productType) {
            categories = await this.categoryRepository.findByProductType(options.productType);
        } else {
            categories = await this.categoryRepository.findAll();
        }

        // Agregar conteo de productos si se solicita
        if (options.includeProductCount) {
            const categoriesWithCount: CategoryWithCount[] = await Promise.all(
                categories.map(async (category) => ({
                    ...category,
                    productCount: await this.categoryRepository.countProducts(category.id),
                }))
            );
            return categoriesWithCount;
        }

        return categories;
    }
}
