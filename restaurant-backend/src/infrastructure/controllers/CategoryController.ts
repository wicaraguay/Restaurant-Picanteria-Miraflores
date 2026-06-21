/**
 * @file CategoryController.ts
 * @description Controlador HTTP para gestión de categorías
 *
 * @layer Infrastructure - Interfaces HTTP
 */

import { Request, Response, NextFunction } from 'express';
import {
    CreateCategory,
    UpdateCategory,
    DeleteCategory,
    GetCategories,
    ReorderCategories,
} from '../../application/use-cases/categories';
import { ICategoryRepository } from '../../domain/repositories/ICategoryRepository';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';
import { NotFoundError } from '../../domain/errors/CustomErrors';
import { ProductType } from '../../domain/entities/Category';

export class CategoryController {
    constructor(
        private createCategory: CreateCategory,
        private updateCategory: UpdateCategory,
        private deleteCategory: DeleteCategory,
        private getCategories: GetCategories,
        private reorderCategories: ReorderCategories,
        private categoryRepository: ICategoryRepository
    ) {}

    /**
     * GET /api/categories
     * Query params: productType, visibleOnWebsite, includeProductCount
     */
    public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { productType, visibleOnWebsite, includeProductCount } = req.query;

            logger.debug('Fetching categories', { productType, visibleOnWebsite });

            const categories = await this.getCategories.execute({
                productType: productType as ProductType | undefined,
                visibleOnWebsite: visibleOnWebsite === 'true',
                includeProductCount: includeProductCount === 'true',
            });

            logger.info('Categories fetched successfully', { count: categories.length });
            res.json(ResponseFormatter.success(categories));
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/categories/:id
     */
    public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.debug('Fetching category by ID', { id: req.params.id });
            const category = await this.categoryRepository.findById(req.params.id);

            if (!category) {
                throw new NotFoundError('Category not found', 'Category');
            }

            logger.info('Category fetched successfully', { id: req.params.id });
            res.json(ResponseFormatter.success(category));
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/categories
     */
    public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Creating new category', { name: req.body.name });
            const category = await this.createCategory.execute(req.body);
            logger.info('Category created successfully', { id: category.id, name: category.name });
            res.status(201).json(ResponseFormatter.success(category));
        } catch (error) {
            next(error);
        }
    };

    /**
     * PUT /api/categories/:id
     */
    public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Updating category', { id: req.params.id });
            const category = await this.updateCategory.execute(req.params.id, req.body);
            logger.info('Category updated successfully', { id: category.id });
            res.json(ResponseFormatter.success(category));
        } catch (error) {
            next(error);
        }
    };

    /**
     * DELETE /api/categories/:id
     */
    public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Deleting category', { id: req.params.id });
            await this.deleteCategory.execute(req.params.id);
            logger.info('Category deleted successfully', { id: req.params.id });
            res.json(ResponseFormatter.success({ message: 'Category deleted successfully' }));
        } catch (error) {
            next(error);
        }
    };

    /**
     * PATCH /api/categories/reorder
     * Body: { items: [{ id: string, sortOrder: number }] }
     */
    public reorder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { items } = req.body;
            logger.info('Reordering categories', { count: items?.length });
            await this.reorderCategories.execute(items);
            logger.info('Categories reordered successfully');
            res.json(ResponseFormatter.success({ message: 'Categories reordered successfully' }));
        } catch (error) {
            next(error);
        }
    };
}
