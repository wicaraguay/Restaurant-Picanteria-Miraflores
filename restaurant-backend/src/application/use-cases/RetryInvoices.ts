
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { CheckInvoiceStatus } from './CheckInvoiceStatus';
import { logger } from '../../infrastructure/utils/Logger';

/**
 * @class RetryInvoices
 * @description Use case that identifies and retries sending non-authorized invoices to the SRI.
 * 
 * @purpose
 * Provides an automated way to recover from transient SRI errors or network issues.
 * 
 * @connections
 * - Uses: IBillRepository to find pending invoices.
 * - Uses: CheckInvoiceStatus to perform the actual retry/recovery logic.
 * 
 * @layer Application
 */
export class RetryInvoices {
    constructor(
        private billRepository: IBillRepository,
        private checkInvoiceStatus: CheckInvoiceStatus
    ) { }

    async execute(): Promise<{ processed: number, successes: number, errors: number }> {
        const results = {
            processed: 0,
            successes: 0,
            errors: 0
        };

        try {
            // 1. Identify bills to retry
            // We look for bills that are NOT 'AUTORIZADO' and were created in the last 48 hours
            const fortyEightHoursAgo = new Date();
            fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

            // Fetch bills with problematic statuses
            const statusesToRetry = [
                'BORRADOR', 
                'VALIDADO', 
                'RECIBIDA', 
                'DEVUELTA', 
                'EN PROCESO', 
                'PENDING_RETRY', 
                'UNKNOWN', 
                'ERROR'
            ];

            // Using findPaginated to avoid loading too many documents at once
            const pendingBills = await this.billRepository.findPaginated(1, 100, {
                sriStatus: { $in: statusesToRetry },
                createdAt: { $gte: fortyEightHoursAgo }
            });

            logger.info(`[RetryInvoices] Found ${pendingBills.data.length} invoices to retry.`);

            if (pendingBills.data.length === 0) {
                return results;
            }

            const isProd = process.env.SRI_ENV === '2';

            // 2. Process each bill
            for (const bill of pendingBills.data) {
                results.processed++;
                
                // Skip if no access key (CheckInvoiceStatus requires it)
                if (!bill.accessKey) {
                    logger.warn(`[RetryInvoices] Bill ${bill.documentNumber} (${bill.id}) has no accessKey. Skipping.`);
                    results.errors++;
                    continue;
                }

                try {
                    logger.info(`[RetryInvoices] Retrying Bill ${bill.documentNumber} (Key: ${bill.accessKey})...`);
                    
                    const result = await this.checkInvoiceStatus.execute(bill.accessKey, isProd);
                    
                    if (result.success && result.authorization?.estado === 'AUTORIZADO') {
                        logger.info(`[RetryInvoices] Successfully authorized Bill ${bill.documentNumber}`);
                        results.successes++;
                    } else {
                        logger.warn(`[RetryInvoices] Retry for Bill ${bill.documentNumber} finished with state: ${result.authorization?.estado || 'UNKNOWN'}`);
                        results.errors++;
                    }
                } catch (billError) {
                    logger.error(`[RetryInvoices] Failed to retry Bill ${bill.documentNumber}:`, billError);
                    results.errors++;
                }
            }

        } catch (error) {
            logger.error('[RetryInvoices] Error during retry batch process:', error);
            throw error;
        }

        logger.info(`[RetryInvoices] Finished batch: ${results.successes} authorized, ${results.errors} failures/pending, ${results.processed} total processed.`);
        return results;
    }
}
