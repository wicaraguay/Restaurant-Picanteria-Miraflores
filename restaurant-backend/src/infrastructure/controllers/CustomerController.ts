import { Request, Response, NextFunction } from 'express';
import { CreateCustomer } from '../../application/use-cases/CreateCustomer';
import { GetCustomers } from '../../application/use-cases/GetCustomers';
import { LookupCustomer } from '../../application/use-cases/LookupCustomer';
import { UpdateCustomer } from '../../application/use-cases/UpdateCustomer';
import { DeleteCustomer } from '../../application/use-cases/DeleteCustomer';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';

export class CustomerController {
    constructor(
        private createCustomer: CreateCustomer,
        private getCustomers: GetCustomers,
        private lookupCustomer: LookupCustomer,
        private updateCustomer: UpdateCustomer,
        private deleteCustomer: DeleteCustomer
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

    public lookup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { identification } = req.params;
            logger.info('Looking up customer by identification', { identification });
            
            const customer = await this.lookupCustomer.execute(identification);
            
            if (!customer) {
                res.status(404).json(ResponseFormatter.error('NOT_FOUND', 'Cliente no encontrado en la base de datos local'));
                return;
            }

            res.json(ResponseFormatter.success(customer));
        } catch (error) {
            next(error);
        }
    };

    public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            logger.info('Updating customer', { id, updates: req.body });
            const customer = await this.updateCustomer.execute(id, req.body);
            res.json(ResponseFormatter.success(customer));
        } catch (error) {
            next(error);
        }
    };

    public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            logger.info('Deleting customer', { id });
            await this.deleteCustomer.execute(id);
            // Return success with null data to indicate it's done
            res.json(ResponseFormatter.success(null));
        } catch (error) {
            next(error);
        }
    };
}
