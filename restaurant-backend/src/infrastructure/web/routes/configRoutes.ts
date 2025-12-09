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

const router = express.Router();

router.get('/', ErrorHandler.asyncHandler(async (req, res) => {
    logger.debug('Fetching restaurant config');

    const getConfig = container.getGetRestaurantConfigUseCase();
    const config = await getConfig.execute();

    logger.info('Restaurant config fetched successfully');
    res.json(ResponseFormatter.success(config));
}));

router.put('/', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Updating restaurant config', { fields: Object.keys(req.body) });

    const updateConfig = container.getUpdateRestaurantConfigUseCase();
    const updatedConfig = await updateConfig.execute(req.body);

    logger.info('Restaurant config updated successfully');
    res.json(ResponseFormatter.success(updatedConfig));
}));

export default router;
