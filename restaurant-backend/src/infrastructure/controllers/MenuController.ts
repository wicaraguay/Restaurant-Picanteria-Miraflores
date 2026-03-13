import { Request, Response, NextFunction } from 'express';
import { GetMenu } from '../../application/use-cases/GetMenu';
import { CreateMenu } from '../../application/use-cases/CreateMenu';
import { UpdateMenu } from '../../application/use-cases/UpdateMenu';
import { DeleteMenu } from '../../application/use-cases/DeleteMenu';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';
import { NotFoundError } from '../../domain/errors/CustomErrors';
import { cacheService } from '../utils/CacheService';
import { MenuItem } from '../../domain/entities/MenuItem';

export class MenuController {
    constructor(
        private getMenu: GetMenu,
        private createMenu: CreateMenu,
        private updateMenu: UpdateMenu,
        private deleteMenu: DeleteMenu
    ) { }

    public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.debug('Fetching menu');

            // Use cache with 10 minute TTL (menu rarely changes)
            const menu = await cacheService.getOrSet(
                'menu:all',
                async () => {
                    return await this.getMenu.execute();
                },
                10 * 60 * 1000 // 10 minutes
            );

            logger.info('Menu fetched successfully', { count: menu.length });
            res.json(ResponseFormatter.success(menu));
        } catch (error) {
            next(error);
        }
    };

    public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Creating new menu item', { name: req.body.name });
            const newItem = await this.createMenu.execute(req.body as MenuItem);

            // Invalidate menu cache
            cacheService.invalidate('menu:all');

            logger.info('Menu item created successfully', { id: newItem.id });
            res.status(201).json(ResponseFormatter.success(newItem));
        } catch (error) {
            next(error);
        }
    };

    public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Updating menu item', { id: req.params.id });
            const updatedItem = await this.updateMenu.execute(req.params.id, req.body);

            if (!updatedItem) {
                throw new NotFoundError('Menu item not found', 'MenuItem');
            }

            // Invalidate menu cache
            cacheService.invalidate('menu:all');

            logger.info('Menu item updated successfully', { id: updatedItem.id });
            res.json(ResponseFormatter.success(updatedItem));
        } catch (error) {
            next(error);
        }
    };

    public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Deleting menu item', { id: req.params.id });
            const deleted = await this.deleteMenu.execute(req.params.id);

            if (!deleted) {
                throw new NotFoundError('Menu item not found', 'MenuItem');
            }

            // Invalidate menu cache
            cacheService.invalidate('menu:all');

            logger.info('Menu item deleted successfully', { id: req.params.id });
            res.json(ResponseFormatter.success({ deleted: true }));
        } catch (error) {
            next(error);
        }
    };
}
