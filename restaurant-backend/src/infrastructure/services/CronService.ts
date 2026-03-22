
import cron, { ScheduledTask } from 'node-cron';
import { RetryInvoices } from '../../application/use-cases/RetryInvoices';
import { logger } from '../utils/Logger';

/**
 * @class CronService
 * @description Service to manage background scheduled tasks (Cron Jobs).
 * 
 * @purpose
 * Handles the scheduling and execution of repetitive tasks like retrying failed invoices.
 * 
 * @connections
 * - Uses: node-cron for scheduling.
 * - Uses: RetryInvoices use case.
 * - Initialized in: main.ts
 * 
 * @layer Infrastructure
 */
export class CronService {
    private static instance: CronService;
    private jobs: ScheduledTask[] = [];

    private constructor(private retryInvoices: RetryInvoices) { }

    public static getInstance(retryInvoices: RetryInvoices): CronService {
        if (!CronService.instance) {
            CronService.instance = new CronService(retryInvoices);
        }
        return CronService.instance;
    }

    /**
     * Initializes all cron jobs
     */
    public init(): void {
        console.log('DEBUG: CronService.init() called');
        logger.info('[CronService] Initializing Cron Jobs...');


        // 1. Retry Invoices Cron (Every 15 minutes)
        // Adjust schedule as needed. '*/15 * * * *' = every 15 minutes
        const retryJob = cron.schedule('*/15 * * * *', async () => {
            logger.info('[CronService] Running scheduled task: RetryInvoices');
            try {
                const results = await this.retryInvoices.execute();
                logger.info('[CronService] RetryInvoices task completed', results);
            } catch (error) {
                logger.error('[CronService] Error during RetryInvoices scheduled task:', error);
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
