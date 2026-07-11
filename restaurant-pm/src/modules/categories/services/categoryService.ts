/**
 * @file categoryService.ts
 * @description Servicio singleton para gestión de categorías.
 * Proporciona métodos CRUD y reordenamiento de categorías.
 */

import { apiService } from '../../../api';
import { API_ENDPOINTS } from '../../../config/api.config';
import { Category, CreateCategoryDTO, UpdateCategoryDTO, ReorderCategoryDTO } from '../types/category.types';

export class CategoryService {
    private static instance: CategoryService;

    private constructor() { }

    public static getInstance(): CategoryService {
        if (!CategoryService.instance) {
            CategoryService.instance = new CategoryService();
        }
        return CategoryService.instance;
    }

    public async getAll(params?: { productType?: string; visibleOnWebsite?: boolean; includeProductCount?: boolean }): Promise<Category[]> {
        const queryParams = new URLSearchParams();
        if (params?.productType) queryParams.append('productType', params.productType);
        if (params?.visibleOnWebsite !== undefined) queryParams.append('visibleOnWebsite', String(params.visibleOnWebsite));
        if (params?.includeProductCount) queryParams.append('includeProductCount', 'true');

        const url = queryParams.toString()
            ? `${API_ENDPOINTS.CATEGORIES.BASE}?${queryParams.toString()}`
            : API_ENDPOINTS.CATEGORIES.BASE;

        return apiService.get(url);
    }

    public async getById(id: string): Promise<Category> {
        return apiService.get(API_ENDPOINTS.CATEGORIES.BY_ID(id));
    }

    public async create(data: CreateCategoryDTO): Promise<Category> {
        return apiService.post(API_ENDPOINTS.CATEGORIES.BASE, data);
    }

    public async update(id: string, data: UpdateCategoryDTO): Promise<Category> {
        return apiService.put(API_ENDPOINTS.CATEGORIES.BY_ID(id), data);
    }

    public async delete(id: string): Promise<any> {
        return apiService.delete(API_ENDPOINTS.CATEGORIES.BY_ID(id));
    }

    public async reorder(items: ReorderCategoryDTO[]): Promise<void> {
        return apiService.patch(API_ENDPOINTS.CATEGORIES.REORDER, { items });
    }
}

export const categoryService = CategoryService.getInstance();
