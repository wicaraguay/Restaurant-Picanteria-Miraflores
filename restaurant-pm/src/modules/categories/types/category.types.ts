/**
 * Tipos de categorías para el frontend
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
    productCount?: number;
    createdAt?: string;
    updatedAt?: string;
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

export interface CategoryFilters {
    productType?: ProductType;
    visibleOnWebsite?: boolean;
    includeProductCount?: boolean;
}
