import { Request, Response, NextFunction } from 'express';
import { GenerateInvoice } from '../../application/use-cases/GenerateInvoice';
import { CheckInvoiceStatus } from '../../application/use-cases/CheckInvoiceStatus';
import { UpdateBill } from '../../application/use-cases/UpdateBill';
import { GetBills } from '../../application/use-cases/GetBills';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';
import { ValidationError, NotFoundError } from '../../domain/errors/CustomErrors';

export class BillingController {
    constructor(
        private generateInvoice: GenerateInvoice,
        private checkInvoiceStatus: CheckInvoiceStatus,
        private updateBillUseCase: UpdateBill,
        private getBills: GetBills
    ) { }

    public generateXml = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('⚡ Receiving SRI billing request (Backend)', { body: req.body });
            const { order, client, taxRate = 15, logoUrl } = req.body;

            if (!order || !client) {
                throw new ValidationError('Order and Client data are required');
            }

            const result = await this.generateInvoice.execute({ order, client, taxRate, logoUrl });

            logger.info('✅ Billing process completed successfully.');
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    public checkStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { accessKey } = req.params;
            const isProd = process.env.SRI_ENV === '2';

            if (!accessKey) {
                throw new ValidationError('Access Key is required');
            }

            logger.info(`Checking status for Access Key: ${accessKey}`);

            const result = await this.checkInvoiceStatus.execute(accessKey, isProd);

            logger.info('✅ Status check process completed successfully.');
            res.json(result);
        } catch (error) {
            next(error);
        }
    };

    public updateBill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            logger.info('Updating bill data', { id, updateData });

            const updatedBill = await this.updateBillUseCase.execute(id, updateData);

            res.json(ResponseFormatter.success(updatedBill));
        } catch (error) {
            next(error);
        }
    };

    public reSubmit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            logger.info('Re-submitting bill to SRI', { id });

            const bill = await this.getBills.executeById(id);
            if (!bill) {
                res.status(404).json(ResponseFormatter.error('NOT_FOUND', 'Factura no encontrada'));
                return;
            }

            // Reconstruct order and client from Bill data
            const order = {
                id: bill.orderId,
                items: bill.items,
                total: bill.total
            };

            const client = {
                identification: bill.customerIdentification,
                name: bill.customerName,
                address: bill.customerAddress,
                email: bill.customerEmail,
                phone: bill.customerPhone
            };

            // Re-run generation logic using existing Bill ID to update same record
            const result = await this.generateInvoice.execute({ 
                order, 
                client, 
                id: bill.id 
            });

            res.json(result);
        } catch (error) {
            next(error);
        }
    };
}
