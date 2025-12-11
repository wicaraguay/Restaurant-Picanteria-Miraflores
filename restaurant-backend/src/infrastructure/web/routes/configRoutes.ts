/**
 * Rutas de Configuración del Restaurante
 * 
 * Define los endpoints para obtener y actualizar la configuración global.
 */

import express from 'express';
import { container } from '../../di/DIContainer';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { ResponseFormatter } from '../../utils/ResponseFormatter';
import { logger } from '../../utils/Logger';
import { cacheService } from '../../utils/CacheService';

const router = express.Router();

router.get('/', ErrorHandler.asyncHandler(async (req, res) => {
    logger.debug('Fetching restaurant config');

    // Use cache with 15 minute TTL (config rarely changes)
    const config = await cacheService.getOrSet(
        'config:restaurant',
        async () => {
            const getConfig = container.getGetRestaurantConfigUseCase();
            return await getConfig.execute();
        },
        15 * 60 * 1000 // 15 minutes
    );

    logger.info('Restaurant config fetched successfully');
    res.json(ResponseFormatter.success(config));
}));

router.put('/', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Updating restaurant config', { fields: Object.keys(req.body) });

    const updateConfig = container.getUpdateRestaurantConfigUseCase();
    const updatedConfig = await updateConfig.execute(req.body);

    // Invalidate config cache
    cacheService.invalidate('config:restaurant');

    logger.info('Restaurant config updated successfully');
    res.json(ResponseFormatter.success(updatedConfig));
}));

export default router;
