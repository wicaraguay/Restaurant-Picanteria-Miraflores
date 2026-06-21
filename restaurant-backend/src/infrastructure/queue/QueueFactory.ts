/**
 * QueueFactory.ts
 * Factory for creating the appropriate invoice queue implementation
 *
 * Strategy:
 * - If Redis is available (REDIS_HOST env var set) → use BullMQInvoiceQueue
 * - Otherwise → fallback to InvoiceQueue (in-memory)
 *
 * Benefits:
 * - Seamless fallback for dev environments without Redis
 * - Easy testing without external dependencies
 * - Production-ready with Redis for scalability
 */

import { logger } from '../utils/Logger';
import { InvoiceQueue } from './InvoiceQueue';
import { BullMQInvoiceQueue } from './BullMQInvoiceQueue';

// Common interface for queue operations
export interface IInvoiceQueue {
    add: (data: any) => Promise<any>;
    process: (processor: (job: any) => Promise<any>) => void;
    getJob: (jobId: string) => Promise<any> | any;
    getStats: () => Promise<any> | any;
    updateProgress?: (jobId: string, progress: number) => Promise<void> | void;
    clean?: (maxAge: number) => Promise<number> | number;
}

let queueInstance: IInvoiceQueue | null = null;

/**
 * Get the invoice queue instance (singleton)
 * Returns BullMQ queue if Redis is available, otherwise in-memory queue
 */
export function getInvoiceQueue(): IInvoiceQueue {
    if (queueInstance) {
        return queueInstance;
    }

    const redisHost = process.env.REDIS_HOST;
    const useRedis = !!redisHost;

    if (useRedis) {
        try {
            logger.info(`[QueueFactory] Initializing BullMQ queue with Redis`, {
                host: redisHost,
                port: process.env.REDIS_PORT || '6379'
            });

            queueInstance = new BullMQInvoiceQueue({
                redis: {
                    host: redisHost,
                    port: parseInt(process.env.REDIS_PORT || '6379', 10),
                    password: process.env.REDIS_PASSWORD
                },
                maxConcurrency: parseInt(process.env.QUEUE_CONCURRENCY || '3', 10),
                maxAttempts: 3,
                retryDelay: 5000
            });

            logger.info(`[QueueFactory] BullMQ queue initialized successfully`);
        } catch (error: any) {
            logger.error(`[QueueFactory] Failed to initialize BullMQ queue, falling back to in-memory`, {
                error: error.message
            });

            // Fallback to in-memory on Redis connection error
            queueInstance = new InvoiceQueue({
                name: 'invoice-processing',
                maxConcurrency: 3,
                maxAttempts: 3,
                retryDelay: 5000,
                jobTimeout: 120000
            });
        }
    } else {
        logger.info(`[QueueFactory] REDIS_HOST not configured, using in-memory queue`);

        queueInstance = new InvoiceQueue({
            name: 'invoice-processing',
            maxConcurrency: 3,
            maxAttempts: 3,
            retryDelay: 5000,
            jobTimeout: 120000
        });
    }

    return queueInstance;
}

/**
 * Reset queue instance (useful for testing)
 */
export function resetQueueInstance(): void {
    queueInstance = null;
}
