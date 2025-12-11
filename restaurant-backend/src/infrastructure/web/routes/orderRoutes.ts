/**
 * Rutas de Órdenes
 * 
 * Define los endpoints para gestión de órdenes (crear, listar).
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
    logger.info('Creating new order', { customerName: req.body.customerName });

    const createOrder = container.getCreateOrderUseCase();
    const order = await createOrder.execute(req.body);

    logger.info('Order created successfully', { id: order.id });
    res.status(201).json(ResponseFormatter.success(order));
}));

router.get('/', ErrorHandler.asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    // Build filter from query params
    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.billed !== undefined) filter.billed = req.query.billed === 'true';
    if (req.query.customerName) filter.customerName = { $regex: req.query.customerName, $options: 'i' };

    // Build sort from query params (default: newest first)
    const sort: any = req.query.sort ? JSON.parse(req.query.sort as string) : { createdAt: -1 };

    logger.debug('Fetching orders with pagination', { page, limit, filter });

    const getOrders = container.getGetOrdersUseCase();
    const result = await getOrders.executePaginated(page, limit, filter, sort);

    logger.info('Orders fetched successfully', {
        count: result.data.length,
        page: result.pagination.page,
        total: result.pagination.total
    });
    res.json(ResponseFormatter.success(result));
}));

router.put('/:id', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Updating order', { id: req.params.id, updates: Object.keys(req.body) });

    const updateOrder = container.getUpdateOrderUseCase();
    const updatedOrder = await updateOrder.execute(req.params.id, req.body);

    logger.info('Order updated successfully', { id: updatedOrder.id });
    res.json(ResponseFormatter.success(updatedOrder));
}));

router.delete('/:id', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Deleting order', { id: req.params.id });

    const deleteOrder = container.getDeleteOrderUseCase();
    await deleteOrder.execute(req.params.id);

    logger.info('Order deleted successfully', { id: req.params.id });
    res.json(ResponseFormatter.success({ deleted: true }));
}));

export default router;
