
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
        logger.debug('DEBUG: CronService.init() called');
        logger.info('[CronService] Initializing Cron Jobs...');


        // 1. Retry Invoices Cron (Every 15 minutes, at :00, :15, :30, :45)
        const invoiceJob = cron.schedule('*/15 * * * *', async () => {
            logger.info('[CronService] Running scheduled task: RetryInvoices');
            try {
                const results = await this.retryInvoices.execute();
                logger.info('[CronService] RetryInvoices completed', results);
            } catch (error) {
                logger.error('[CronService] RetryInvoices failed:', error);
            }
        });

        // 2. Retry Credit Notes Cron (Every 15 minutes, offset by 1 min: :01, :16, :31, :46)
        // Offset prevents both jobs from hitting SRI simultaneously
        const creditNoteJob = cron.schedule('1-59/15 * * * *', async () => {
            logger.info('[CronService] Running scheduled task: RetryCreditNotes');
            try {
                const results = await this.retryCreditNotes.execute();
                logger.info('[CronService] RetryCreditNotes completed', results);
            } catch (error) {
                logger.error('[CronService] RetryCreditNotes failed:', error);
            }
        });

        this.jobs.push(invoiceJob, creditNoteJob);

        logger.info(`[CronService] ${this.jobs.length} jobs scheduled successfully.`);
        logger.info('[CronService] Schedule: Invoices at :00/:15/:30/:45, CreditNotes at :01/:16/:31/:46');
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
