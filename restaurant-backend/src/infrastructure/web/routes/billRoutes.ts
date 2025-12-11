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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    // Build filter from query params
    const filter: any = {};
    if (req.query.documentNumber) filter.documentNumber = req.query.documentNumber;
    if (req.query.customerIdentification) filter.customerIdentification = req.query.customerIdentification;
    if (req.query.documentType) filter.documentType = req.query.documentType;

    // Build sort from query params (default: newest first)
    const sort: any = req.query.sort ? JSON.parse(req.query.sort as string) : { createdAt: -1 };

    logger.info('Fetching bills with pagination', { page, limit, filter });

    const getBills = container.getGetBillsUseCase();
    const result = await getBills.executePaginated(page, limit, filter, sort);

    logger.info('Bills fetched successfully', {
        count: result.data.length,
        page: result.pagination.page,
        total: result.pagination.total
    });
    res.json(ResponseFormatter.success(result));
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
