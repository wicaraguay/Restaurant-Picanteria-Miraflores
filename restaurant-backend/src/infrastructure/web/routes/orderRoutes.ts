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
    logger.debug('Fetching all orders');

    const getOrders = container.getGetOrdersUseCase();
    const orders = await getOrders.execute();

    logger.info('Orders fetched successfully', { count: orders.length });
    res.json(ResponseFormatter.success(orders));
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
