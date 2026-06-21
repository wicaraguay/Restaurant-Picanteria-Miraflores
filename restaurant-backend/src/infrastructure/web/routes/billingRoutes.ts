/**
 * Rutas de Facturación SRI
 *
 * Define los endpoints para la generación y consulta de facturas electrónicas SRI.
 * Utiliza el DIContainer y BillingController.
 * FIX D-02: Rate limiting aplicado a todos los endpoints
 */

import express from 'express';
import { container } from '../../di/DIContainer';
import { BillingController } from '../../controllers/BillingController';
import {
    invoiceGenerationLimiter,
    statusCheckLimiter,
    resubmitLimiter,
    circuitResetLimiter
} from '../middleware/RateLimitMiddleware';

const router = express.Router();

// Instantiate controller with dependencies from DI Container
const billingController = container.getBillingController();

/**
 * POST /api/billing/generate-xml
 * Genera el XML, firma y envía al SRI
 * FIX D-02: Rate limited to 10 invoices per minute
 */
router.post('/generate-xml', invoiceGenerationLimiter, billingController.generateXml);

/**
 * POST /api/billing/preview-xml
 * FIX D-05: Preview XML before sending to SRI
 * Generates XML without sending, allows user review
 */
router.post('/preview-xml', statusCheckLimiter, billingController.previewXml);

/**
 * POST /api/billing/check-status/:accessKey
 * Consulta el estado de una factura en el SRI
 * FIX D-02: Rate limited to 30 checks per minute
 */
router.post('/check-status/:accessKey', statusCheckLimiter, billingController.checkStatus);

/**
 * PUT /api/billing/update-bill/:id
 * Actualiza los datos y detalles (items) de una factura fallida
 */
router.put('/update-bill/:id', billingController.updateBill);

/**
 * POST /api/billing/re-submit/:id
 * Re-intenta el envío de una factura al SRI tras correcciones
 * FIX D-02: Rate limited to 5 resubmits per 5 minutes per bill
 */
router.post('/re-submit/:id', resubmitLimiter, billingController.reSubmit);

/**
 * GET /api/billing/circuit-status
 * FIX D-01: Returns the current state of the SRI circuit breaker
 */
router.get('/circuit-status', billingController.getCircuitStatus);

/**
 * POST /api/billing/circuit-reset
 * FIX D-01: Resets the SRI circuit breaker to CLOSED state (admin only)
 * FIX D-02: Rate limited to 3 resets per hour
 */
router.post('/circuit-reset', circuitResetLimiter, billingController.resetCircuit);

/**
 * GET /api/billing/queue-stats
 * FIX D-04: Returns invoice queue statistics for monitoring
 */
router.get('/queue-stats', billingController.getQueueStats);

/**
 * GET /api/billing/queue-job/:jobId
 * FIX D-04: Returns status of a specific queue job
 */
router.get('/queue-job/:jobId', billingController.getQueueJob);

export default router;
