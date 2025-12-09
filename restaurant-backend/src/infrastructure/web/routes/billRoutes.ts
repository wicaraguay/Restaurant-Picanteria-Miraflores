/**
 * @file billRoutes.ts
 * @description Rutas de Facturas/Notas de Venta
 * 
 * @purpose
 * Define los endpoints para gestión de facturación (crear, listar facturas).
 * Utiliza el DIContainer para obtener dependencias.
 * Implementa manejo de errores estandarizado y logging.
 * 
 * @connections
 * - Usa: DIContainer (infrastructure/di)
 * - Usa: CreateBill, GetBills use cases (application/use-cases)
 * - Usa: ErrorHandler, ResponseFormatter, Logger (infrastructure/utils)
 * - Usado por: main.ts (configuración de rutas)
 * 
 * @layer Infrastructure - Web/API
 */

import { Router } from 'express';
import { container } from '../../di/DIContainer';
import { ResponseFormatter } from '../../utils/ResponseFormatter';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { logger } from '../../utils/Logger';

const router = Router();

// GET /api/bills - Obtener todas las facturas
router.get('/', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Fetching bills');

    const getBills = container.getGetBillsUseCase();
    const bills = await getBills.execute();

    logger.info('Bills fetched successfully', { count: bills.length });
    res.json(ResponseFormatter.success(bills));
}));

// POST /api/bills - Crear una nueva factura
router.post('/', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Creating new bill', { data: req.body });

    const createBill = container.getCreateBillUseCase();
    const createdBill = await createBill.execute(req.body);

    logger.info('Bill created successfully', { id: createdBill.id });
    res.status(201).json(ResponseFormatter.success(createdBill));
}));

export default router;
