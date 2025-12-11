/**
 * Rutas de Menú
 * 
 * Define los endpoints para gestión del menú (listar, crear items).
 * Utiliza el DIContainer para obtener dependencias.
 * Implementa manejo de errores estandarizado y logging.
 */

import express from 'express';
import { container } from '../../di/DIContainer';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { ResponseFormatter } from '../../utils/ResponseFormatter';
import { logger } from '../../utils/Logger';
import { cacheService } from '../../utils/CacheService';
import { MenuItem } from '../../../domain/entities/MenuItem';

const router = express.Router();

router.get('/', ErrorHandler.asyncHandler(async (req, res) => {
    logger.debug('Fetching menu');

    // Use cache with 10 minute TTL (menu rarely changes)
    const menu = await cacheService.getOrSet(
        'menu:all',
        async () => {
            const getMenu = container.getGetMenuUseCase();
            return await getMenu.execute();
        },
        10 * 60 * 1000 // 10 minutes
    );

    logger.info('Menu fetched successfully', { count: menu.length });
    res.json(ResponseFormatter.success(menu));
}));

router.post('/', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Creating new menu item', { name: req.body.name });

    const menuRepo = container.getMenuRepository();
    const newItem = await menuRepo.create(req.body as MenuItem);

    // Invalidate menu cache
    cacheService.invalidate('menu:all');

    logger.info('Menu item created successfully', { id: newItem.id });
    res.status(201).json(ResponseFormatter.success(newItem));
}));

router.put('/:id', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Updating menu item', { id: req.params.id });

    const menuRepo = container.getMenuRepository();
    const updatedItem = await menuRepo.update(req.params.id, req.body);

    if (!updatedItem) {
        logger.warn('Menu item not found', { id: req.params.id });
        return res.status(404).json(ResponseFormatter.error('MENU_ITEM_NOT_FOUND', 'Menu item not found'));
    }

    // Invalidate menu cache
    cacheService.invalidate('menu:all');

    logger.info('Menu item updated successfully', { id: updatedItem.id });
    res.json(ResponseFormatter.success(updatedItem));
}));

router.delete('/:id', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Deleting menu item', { id: req.params.id });

    const menuRepo = container.getMenuRepository();
    const deleted = await menuRepo.delete(req.params.id);

    if (!deleted) {
        logger.warn('Menu item not found', { id: req.params.id });
        return res.status(404).json(ResponseFormatter.error('MENU_ITEM_NOT_FOUND', 'Menu item not found'));
    }

    // Invalidate menu cache
    cacheService.invalidate('menu:all');

    logger.info('Menu item deleted successfully', { id: req.params.id });
    res.json(ResponseFormatter.success({ deleted: true }));
}));

export default router;
