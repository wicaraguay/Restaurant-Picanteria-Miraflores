/**
 * @file ICategoryRepository.ts
 * @description Interfaz del repositorio de categorías (Domain Layer)
 *
 * @purpose
 * Define el contrato para operaciones CRUD de categorías de productos.
 *
 * @connections
 * - Implementado por: MongoCategoryRepository (infrastructure/repositories)
 * - Usa: Category entity (domain/entities)
 * - Usado por: Category use cases (application/use-cases)
 * - Inyectado por: DIContainer (infrastructure/di)
 *
 * @layer Domain - Define contratos sin implementación
 */

import {
    Category,
    CreateCategoryDTO,
    UpdateCategoryDTO,
    ReorderCategoryDTO,
    ProductType,
} from '../entities/Category';

export interface ICategoryRepository {
    create(data: CreateCategoryDTO): Promise<Category>;
    findById(id: string): Promise<Category | null>;
    findByName(name: string): Promise<Category | null>;
    findAll(): Promise<Category[]>;
    findByProductType(productType: ProductType): Promise<Category[]>;
    findVisibleOnWebsite(): Promise<Category[]>;
    update(id: string, data: UpdateCategoryDTO): Promise<Category | null>;
    delete(id: string): Promise<boolean>;
    reorder(items: ReorderCategoryDTO[]): Promise<boolean>;
    countProducts(categoryId: string): Promise<number>;
    getNextSortOrder(): Promise<number>;
}
