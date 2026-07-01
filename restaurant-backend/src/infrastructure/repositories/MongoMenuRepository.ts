/**
 * Repositorio de Menú - Implementación MongoDB
 * 
 * Extiende BaseRepository para heredar operaciones CRUD comunes.
 * Solo implementa la lógica específica de mapeo de MenuItem.
 */

import { IMenuRepository } from '../../domain/repositories/IMenuRepository';
import { MenuItem } from '../../domain/entities/MenuItem';
import { MenuItemModel } from '../database/schemas/MenuItemSchema';
import { BaseRepository } from './BaseRepository';

export class MongoMenuRepository extends BaseRepository<MenuItem> implements IMenuRepository {
    constructor() {
        super(MenuItemModel, 'MenuItem');
    }

    protected mapToEntity(doc: any): MenuItem {
        const entity: MenuItem = {
            id: doc.id || doc._id.toString(),
            name: doc.name,
            description: doc.description,
            price: doc.price,
            imageUrl: doc.imageUrl,
            category: doc.category,
            categoryId: doc.categoryId?.toString?.() || doc.categoryId,
            available: doc.available,
            taxRate: doc.taxRate ?? 15
        };

        // Si la categoría está populada, mapearla
        if (doc.categoryId && typeof doc.categoryId === 'object' && doc.categoryId.name) {
            entity.categoryData = {
                id: doc.categoryId._id.toString(),
                name: doc.categoryId.name,
                description: doc.categoryId.description || '',
                imageUrl: doc.categoryId.imageUrl || '',
                productType: doc.categoryId.productType,
                visibleOnWebsite: doc.categoryId.visibleOnWebsite ?? true,
                sortOrder: doc.categoryId.sortOrder ?? 0,
                available: doc.categoryId.available ?? true,
            };
        }

        return entity;
    }

    /**
     * Find all available menu items (for WhatsApp chatbot)
     */
    async findAvailable(): Promise<MenuItem[]> {
        const docs = await this.model.find({ available: true }).lean();
        return docs.map(doc => this.mapToEntity(doc));
    }

    /**
     * Find all menu items with populated category
     */
    async findAllWithCategory(): Promise<MenuItem[]> {
        const docs = await this.model.find().populate('categoryId').lean();
        return docs.map(doc => this.mapToEntity(doc));
    }

    /**
     * Find menu items by category ID
     */
    async findByCategoryId(categoryId: string): Promise<MenuItem[]> {
        const docs = await this.model.find({ categoryId }).lean();
        return docs.map(doc => this.mapToEntity(doc));
    }
}
