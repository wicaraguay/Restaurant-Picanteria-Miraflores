import { Request, Response, NextFunction } from 'express';
import { CreateCustomer } from '../../application/use-cases/CreateCustomer';
import { GetCustomers } from '../../application/use-cases/GetCustomers';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';

export class CustomerController {
    constructor(
        private createCustomer: CreateCustomer,
        private getCustomers: GetCustomers
    ) { }

    public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Creating new customer', { name: req.body.name });
            const customer = await this.createCustomer.execute(req.body);
            logger.info('Customer created successfully', { id: customer.id });
            res.status(201).json(ResponseFormatter.success(customer));
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
            if (req.query.name) filter.name = { $regex: req.query.name, $options: 'i' };
            if (req.query.email) filter.email = { $regex: req.query.email, $options: 'i' };
            if (req.query.phone) filter.phone = { $regex: req.query.phone, $options: 'i' };

            // Build sort from query params (default: alphabetical by name)
            const sort: any = req.query.sort ? JSON.parse(req.query.sort as string) : { name: 1 };

            logger.debug('Fetching customers with pagination', { page, limit, filter });

            const result = await this.getCustomers.executePaginated(page, limit, filter, sort);

            logger.info('Customers fetched successfully', {
                count: result.data.length,
                page: result.pagination.page,
                total: result.pagination.total
            });
            res.json(ResponseFormatter.success(result));
        } catch (error) {
            next(error);
        }
    };
}
