import { Request, Response, NextFunction } from 'express';
import { GenerateInvoice } from '../../application/use-cases/GenerateInvoice';
import { CheckInvoiceStatus } from '../../application/use-cases/CheckInvoiceStatus';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';

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
                logger.warn('⚠️ Missing data in billing request');
                res.status(400).json({ error: 'Order and Client data are required' });
                return;
            }

            const result = await this.generateInvoice.execute({ order, client, taxRate, logoUrl });

            logger.info('✅ Billing process completed successfully.');
            res.json(result);
        } catch (error) {
            logger.error('Billing error:', error);
            next(error);
        }
    };

    public checkStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { accessKey } = req.params;
            const isProd = process.env.SRI_ENV === '2';

            if (!accessKey) {
                res.status(400).json({ error: 'Access Key is required' });
                return;
            }

            logger.info(`Checking status for Access Key: ${accessKey}`);

            const result = await this.checkInvoiceStatus.execute(accessKey, isProd);

            logger.info('✅ Status check process completed successfully.');
            res.json(result);
        } catch (error) {
            logger.error('Error checking SRI status:', error);
            res.status(500).json({ error: 'Failed to check status' });
        }
    };
}
