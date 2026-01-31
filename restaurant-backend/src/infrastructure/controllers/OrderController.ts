import { Request, Response, NextFunction } from 'express';
import { CreateOrder } from '../../application/use-cases/CreateOrder';
import { GetOrders } from '../../application/use-cases/GetOrders';
import { UpdateOrder } from '../../application/use-cases/UpdateOrder';
import { DeleteOrder } from '../../application/use-cases/DeleteOrder';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';

export class OrderController {
    constructor(
        private createOrder: CreateOrder,
        private getOrders: GetOrders,
        private updateOrder: UpdateOrder,
        private deleteOrder: DeleteOrder
    ) { }

    public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Creating new order', { customerName: req.body.customerName });
            const order = await this.createOrder.execute(req.body);
            logger.info('Order created successfully', { id: order.id });
            res.status(201).json(ResponseFormatter.success(order));
        } catch (error) {
            next(error);
        }
    };

    public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
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

            const result = await this.getOrders.executePaginated(page, limit, filter, sort);

            logger.info('Orders fetched successfully', {
                count: result.data.length,
                page: result.pagination.page,
                total: result.pagination.total
            });
            res.json(ResponseFormatter.success(result));
        } catch (error) {
            next(error);
        }
    };

    public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Updating order', { id: req.params.id, updates: Object.keys(req.body) });
            const updatedOrder = await this.updateOrder.execute(req.params.id, req.body);
            logger.info('Order updated successfully', { id: updatedOrder.id });
            res.json(ResponseFormatter.success(updatedOrder));
        } catch (error) {
            next(error);
        }
    };

    public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Deleting order', { id: req.params.id });
            await this.deleteOrder.execute(req.params.id);
            logger.info('Order deleted successfully', { id: req.params.id });
            res.json(ResponseFormatter.success({ deleted: true }));
        } catch (error) {
            next(error);
        }
    };
}
