import { Request, Response, NextFunction } from 'express';
import { GenerateInvoice } from '../../application/use-cases/GenerateInvoice';
import { CheckInvoiceStatus } from '../../application/use-cases/CheckInvoiceStatus';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';
import { ValidationError } from '../../domain/errors/CustomErrors';

export class BillingController {
    constructor(
        private generateInvoice: GenerateInvoice,
        private checkInvoiceStatus: CheckInvoiceStatus
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
}
