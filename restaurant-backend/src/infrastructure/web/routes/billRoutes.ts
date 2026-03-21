/**
 * @file billRoutes.ts
 * @description Rutas de Facturas/Notas de Venta
 * 
 * @purpose
 * Define los endpoints para gestión de facturación (crear, listar facturas).
 * Utiliza el BillController para manejar la lógica.
 */

import { Router } from 'express';
import { container } from '../../di/DIContainer';
import { BillController } from '../../controllers/BillController';

const router = Router();

// Instantiate controller with dependencies from DI Container
const billController = new BillController(
    container.getCreateBillUseCase(),
    container.getGetBillsUseCase(),
    container.getDeleteBillUseCase(),
    container.getResetBillingSystemUseCase(),
    container.getResetFullSystemUseCase(),
    container.getBillingService(),
    container.getSRIService()
);

/**
 * GET /api/bills
 * Obtener todas las facturas con paginación y filtros
 */
router.get('/', billController.getAll);

/**
 * POST /api/bills
 * Crear una nueva factura
 */
router.post('/', billController.create);

/**
 * GET /api/bills/:id/pdf
 * Descargar PDF de una factura existente
 */
router.get('/:id/pdf', billController.generatePdf);

/**
 * GET /api/bills/:id/xml
 * Descargar XML firmado de una factura existente
 */
router.get('/:id/xml', billController.generateXml);

/**
 * DELETE /api/bills/:id
 * Eliminar una factura
 */
router.delete('/:id', billController.delete);

/**
 * DELETE /api/bills/reset
 * RESETEA TODO EL SISTEMA DE FACTURACION (CUIDADO)
 */
router.post('/reset', billController.reset);

/**
 * POST /api/bills/reset-all
 * BORRA TODO PARA NUEVO CLIENTE (USO EXTREMO)
 */
router.post('/reset-all', billController.resetAll);

export default router;
