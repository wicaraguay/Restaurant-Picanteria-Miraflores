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
const billingController = new BillingController(
    container.getGenerateInvoiceUseCase(),
    container.getCheckInvoiceStatusUseCase()
);

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

export default router;
