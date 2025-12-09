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
    logger.debug('Fetching all customers');

    const getCustomers = container.getGetCustomersUseCase();
    const customers = await getCustomers.execute();

    logger.info('Customers fetched successfully', { count: customers.length });
    res.json(ResponseFormatter.success(customers));
}));

export default router;
