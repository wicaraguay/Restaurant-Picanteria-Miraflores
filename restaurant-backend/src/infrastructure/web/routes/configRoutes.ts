/**
 * Rutas de Configuración del Restaurante
 * 
 * Define los endpoints para obtener y actualizar la configuración global.
 * Utiliza el DIContainer para obtener dependencias e inyectarlas en el ConfigController.
 */

import express from 'express';
import { container } from '../../di/DIContainer';
import { ConfigController } from '../../controllers/ConfigController';

const router = express.Router();

// Instantiate controller with dependencies from DI Container
const configController = new ConfigController(
    container.getGetRestaurantConfigUseCase(),
    container.getUpdateRestaurantConfigUseCase()
);

/**
 * GET /api/config
 * Obtiene la configuración actual del restaurante (cacheada)
 */
router.get('/', configController.get);

/**
 * PUT /api/config
 * Actualiza la configuración del restaurante e invalida la caché
 */
router.put('/', configController.update);

export default router;
