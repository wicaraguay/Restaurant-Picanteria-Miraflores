/**
 * Repositorio de Categorías - Implementación MongoDB
 *
 * Extiende BaseRepository para heredar operaciones CRUD comunes.
 * Implementa métodos específicos para categorías: reorder, countProducts, etc.
 */

import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import {
    Category,
    CreateCategoryDTO,
    UpdateCategoryDTO,
    ReorderCategoryDTO,
    ProductType,
} from '../../domain/entities/Category';
import { CategoryModel } from '../database/schemas/CategorySchema';
import { MenuItemModel } from '../database/schemas/MenuItemSchema';
import { BaseRepository } from './BaseRepository';
import { logger } from '../utils/Logger';
import { DatabaseError } from '../../domain/errors/CustomErrors';

export class MongoCategoryRepository
    extends BaseRepository<Category>
    implements ICategoryRepository
{
    constructor() {
        super(CategoryModel, 'Category');
    }

    protected mapToEntity(doc: any): Category {
        return {
            id: doc.id || doc._id.toString(),
            name: doc.name,
            description: doc.description || '',
            imageUrl: doc.imageUrl || '',
            productType: doc.productType,
            visibleOnWebsite: doc.visibleOnWebsite ?? true,
            sortOrder: doc.sortOrder ?? 0,
            available: doc.available ?? true,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        };
    }

    /**
     * Create a new category
     */
    async create(data: CreateCategoryDTO): Promise<Category> {
        try {
            // Auto-assign sortOrder if not provided
            if (data.sortOrder === undefined) {
                data.sortOrder = await this.getNextSortOrder();
            }

            logger.debug('Creating new Category', { data });
            const newDoc = new this.model(data);
            const saved = await newDoc.save();
            logger.info('Category created successfully', { id: saved._id, name: saved.name });

            return this.mapToEntity(saved);
        } catch (error: any) {
            // Handle duplicate key error
            if (error.code === 11000) {
                throw new DatabaseError(`Category with name "${data.name}" already exists`, error);
            }
            logger.error('Failed to create Category', error);
            throw new DatabaseError('Failed to create Category', error);
        }
    }

    /**
     * Find category by name (case-insensitive)
     */
    async findByName(name: string): Promise<Category | null> {
        try {
            logger.debug('Finding Category by name', { name });
            const found = await this.model.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
            });

            if (!found) {
                return null;
            }

            return this.mapToEntity(found);
        } catch (error) {
            logger.error('Failed to find Category by name', error);
            throw new DatabaseError('Failed to find Category', error as Error);
        }
    }

    /**
     * Find all categories ordered by sortOrder
     */
    async findAll(): Promise<Category[]> {
        try {
            logger.debug('Finding all Categories');
            const all = await this.model.find().sort({ sortOrder: 1 }).lean();
            logger.info(`Found ${all.length} Categories`);
            return all.map((doc) => this.mapToEntity(doc));
        } catch (error) {
            logger.error('Failed to find all Categories', error);
            throw new DatabaseError('Failed to find Categories', error as Error);
        }
    }

    /**
     * Find categories by product type
     */
    async findByProductType(productType: ProductType): Promise<Category[]> {
        try {
            logger.debug('Finding Categories by productType', { productType });
            const found = await this.model
                .find({ productType })
                .sort({ sortOrder: 1 })
                .lean();
            return found.map((doc) => this.mapToEntity(doc));
        } catch (error) {
            logger.error('Failed to find Categories by productType', error);
            throw new DatabaseError('Failed to find Categories', error as Error);
        }
    }

    /**
     * Find categories visible on website (for public menu)
     */
    async findVisibleOnWebsite(): Promise<Category[]> {
        try {
            logger.debug('Finding Categories visible on website');
            const found = await this.model
                .find({ visibleOnWebsite: true, available: true })
                .sort({ sortOrder: 1 })
                .lean();
            return found.map((doc) => this.mapToEntity(doc));
        } catch (error) {
            logger.error('Failed to find visible Categories', error);
            throw new DatabaseError('Failed to find Categories', error as Error);
        }
    }

    /**
     * Bulk reorder categories
     */
    async reorder(items: ReorderCategoryDTO[]): Promise<boolean> {
        try {
            logger.debug('Reordering Categories', { count: items.length });

            const bulkOps = items.map((item) => ({
                updateOne: {
                    filter: { _id: item.id },
                    update: { $set: { sortOrder: item.sortOrder } },
                },
            }));

            await this.model.bulkWrite(bulkOps);
            logger.info('Categories reordered successfully', { count: items.length });
            return true;
        } catch (error) {
            logger.error('Failed to reorder Categories', error);
            throw new DatabaseError('Failed to reorder Categories', error as Error);
        }
    }

    /**
     * Count products in a category
     */
    async countProducts(categoryId: string): Promise<number> {
        try {
            const count = await MenuItemModel.countDocuments({ categoryId });
            return count;
        } catch (error) {
            logger.error('Failed to count products in Category', error);
            throw new DatabaseError('Failed to count products', error as Error);
        }
    }

    /**
     * Get next available sortOrder value
     */
    async getNextSortOrder(): Promise<number> {
        try {
            const lastCategory = await this.model
                .findOne()
                .sort({ sortOrder: -1 })
                .select('sortOrder')
                .lean();

            return (lastCategory?.sortOrder ?? -1) + 1;
        } catch (error) {
            logger.error('Failed to get next sortOrder', error);
            return 0;
        }
    }
}
