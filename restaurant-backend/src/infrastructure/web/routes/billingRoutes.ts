/**
 * Rutas de Facturación SRI
 * 
 * Define los endpoints para la generación y consulta de facturas electrónicas SRI.
 * Utiliza el DIContainer y BillingController.
 */

import express from 'express';
import { container } from '../../di/DIContainer';
import { BillingController } from '../../controllers/BillingController';

const router = express.Router();

// Instantiate controller with dependencies from DI Container
const billingController = container.getBillingController();

/**
 * POST /api/billing/generate-xml
 * Genera el XML, firma y envía al SRI
 */
router.post('/generate-xml', billingController.generateXml);

/**
 * POST /api/billing/check-status/:accessKey
 * Consulta el estado de una factura en el SRI
 */
router.post('/check-status/:accessKey', billingController.checkStatus);

/**
 * PUT /api/billing/update-bill/:id
 * Actualiza los datos y detalles (items) de una factura fallida
 */
router.put('/update-bill/:id', billingController.updateBill);

/**
 * POST /api/billing/re-submit/:id
 * Re-intenta el envío de una factura al SRI tras correcciones
 */
router.post('/re-submit/:id', billingController.reSubmit);

export default router;
