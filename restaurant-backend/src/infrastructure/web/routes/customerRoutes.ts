/**
 * Rutas de Clientes
 * 
 * Define los endpoints para gestión de clientes (crear, listar).
 * Utiliza el DIContainer para obtener dependencias.
 * Implementa manejo de errores estandarizado y logging.
 */

import express from 'express';
import { container } from '../../di/DIContainer';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { ResponseFormatter } from '../../utils/ResponseFormatter';
import { logger } from '../../utils/Logger';

const router = express.Router();

router.post('/', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Creating new customer', { name: req.body.name });

    const createCustomer = container.getCreateCustomerUseCase();
    const customer = await createCustomer.execute(req.body);

    logger.info('Customer created successfully', { id: customer.id });
    res.status(201).json(ResponseFormatter.success(customer));
}));

router.get('/', ErrorHandler.asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    // Build filter from query params
    const filter: any = {};
    if (req.query.name) filter.name = { $regex: req.query.name, $options: 'i' };
    if (req.query.email) filter.email = { $regex: req.query.email, $options: 'i' };
    if (req.query.phone) filter.phone = { $regex: req.query.phone, $options: 'i' };

    // Build sort from query params (default: alphabetical by name)
    const sort: any = req.query.sort ? JSON.parse(req.query.sort as string) : { name: 1 };

    logger.debug('Fetching customers with pagination', { page, limit, filter });

    const getCustomers = container.getGetCustomersUseCase();
    const result = await getCustomers.executePaginated(page, limit, filter, sort);

    logger.info('Customers fetched successfully', {
        count: result.data.length,
        page: result.pagination.page,
        total: result.pagination.total
    });
    res.json(ResponseFormatter.success(result));
}));

export default router;
