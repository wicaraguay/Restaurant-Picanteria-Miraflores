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
            const body = this.normalizeCustomerData(req.body);
            logger.info('Creating new customer', { name: body.name, identification: body.identification });
            const customer = await this.createCustomer.execute(body);
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

            // Build sort from query params (default: newest first)
            const sort: any = req.query.sort ? JSON.parse(req.query.sort as string) : { createdAt: -1 };

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
                logger.info('Customer not found in local DB', { identification });
                res.json(ResponseFormatter.success(null));
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
            const updates = this.normalizeCustomerData(req.body);
            logger.info('Updating customer', { id, updates });
            const customer = await this.updateCustomer.execute(id, updates);
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

    /**
     * Normalizes customer data before saving.
     * - Removes empty identification strings (sparse unique index ignores absent fields, NOT "")
     * - Uppercases and trims name
     */
    private normalizeCustomerData(data: any): any {
        const normalized = { ...data };
        if (!normalized.identification || String(normalized.identification).trim() === '') {
            delete normalized.identification;
        } else {
            normalized.identification = String(normalized.identification).trim();
        }
        if (normalized.name) normalized.name = String(normalized.name).trim().toUpperCase();
        return normalized;
    }
}
