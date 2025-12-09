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
        return {
            id: doc.id || doc._id.toString(),
            name: doc.name,
            description: doc.description,
            price: doc.price,
            imageUrl: doc.imageUrl,
            category: doc.category,
            available: doc.available
        };
    }
}
