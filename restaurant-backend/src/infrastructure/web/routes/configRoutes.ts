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
    container.getUpdateRestaurantConfigUseCase(),
    container.getUploadSRICertificateUseCase(),
    container.getDeleteSRICertificateUseCase(),
    container.getUpdateCertificateEnvironmentUseCase()
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

/**
 * POST /api/config/certificate
 * Upload SRI digital certificate (.p12)
 */
router.post('/certificate', configController.uploadCertificate);

/**
 * DELETE /api/config/certificate
 * Delete SRI digital certificate
 */
router.delete('/certificate', configController.deleteCertificate);

/**
 * PATCH /api/config/certificate/environment
 * Update SRI certificate environment (Pruebas ↔ Producción)
 */
router.patch('/certificate/environment', configController.updateCertificateEnv);

export default router;
