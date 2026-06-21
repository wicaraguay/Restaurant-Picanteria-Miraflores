/**
 * @file Category.ts
 * @description Entidad de dominio que representa una categoría de productos
 *
 * @purpose
 * Define la estructura de datos de una categoría incluyendo tipo de producto,
 * visibilidad en web, imagen y orden de visualización.
 *
 * @connections
 * - Usado por: ICategoryRepository (domain/repositories)
 * - Usado por: MongoCategoryRepository (infrastructure/repositories)
 * - Usado por: CategorySchema (infrastructure/database/schemas)
 * - Usado por: MenuItem entity (categoryId field)
 * - Usado por: CreateCategory, UpdateCategory, etc. (application/use-cases)
 *
 * @layer Domain - Entidad pura sin dependencias externas
 */

export type ProductType = 'menu' | 'retail';

export interface Category {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    productType: ProductType;
    visibleOnWebsite: boolean;
    sortOrder: number;
    available: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateCategoryDTO {
    name: string;
    description?: string;
    imageUrl?: string;
    productType: ProductType;
    visibleOnWebsite?: boolean;
    sortOrder?: number;
    available?: boolean;
}

export interface UpdateCategoryDTO {
    name?: string;
    description?: string;
    imageUrl?: string;
    productType?: ProductType;
    visibleOnWebsite?: boolean;
    sortOrder?: number;
    available?: boolean;
}

export interface ReorderCategoryDTO {
    id: string;
    sortOrder: number;
}
