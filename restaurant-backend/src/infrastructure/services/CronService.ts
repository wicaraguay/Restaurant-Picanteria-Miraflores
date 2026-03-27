
import cron, { ScheduledTask } from 'node-cron';
import { RetryInvoices } from '../../application/use-cases/RetryInvoices';
import { RetryCreditNotes } from '../../application/use-cases/RetryCreditNotes';
import { logger } from '../utils/Logger';

/**
 * @class CronService
 * @description Service to manage background scheduled tasks (Cron Jobs).
 */
export class CronService {
    private static instance: CronService;
    private jobs: ScheduledTask[] = [];

    private constructor(
        private retryInvoices: RetryInvoices,
        private retryCreditNotes: RetryCreditNotes
    ) { }

    public static getInstance(retryInvoices: RetryInvoices, retryCreditNotes: RetryCreditNotes): CronService {
        if (!CronService.instance) {
            CronService.instance = new CronService(retryInvoices, retryCreditNotes);
        }
        return CronService.instance;
    }

    /**
     * Initializes all cron jobs
     */
    public init(): void {
        console.log('DEBUG: CronService.init() called');
        logger.info('[CronService] Initializing Cron Jobs...');


        // 1. Retry SRI Documents Cron (Every 3 hours)
        // Adjust schedule as needed.        // Scheduled to run every 15 minutes for testing (was every 3 hours)
        const retryJob = cron.schedule('*/15 * * * *', async () => {
            logger.info('[CronService] Running scheduled task: RetrySRIDocuments');
            try {
                // Retry Invoices
                const invoiceResults = await this.retryInvoices.execute();
                logger.info('[CronService] RetryInvoices task completed', invoiceResults);

                // Retry Credit Notes
                const ncResults = await this.retryCreditNotes.execute();
                logger.info('[CronService] RetryCreditNotes task completed', ncResults);
            } catch (error) {
                logger.error('[CronService] Error during RetrySRIDocuments scheduled task:', error);
            }
        });

        this.jobs.push(retryJob);

        logger.info(`[CronService] ${this.jobs.length} jobs scheduled successfully.`);
    }

    /**
     * Stops all active cron jobs
     */
    public stop(): void {
        logger.info('[CronService] Stopping all Cron Jobs...');
        this.jobs.forEach(job => job.stop());
        this.jobs = [];
    }
}
