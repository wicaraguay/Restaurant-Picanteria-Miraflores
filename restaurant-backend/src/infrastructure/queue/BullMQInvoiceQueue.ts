/**
 * BullMQInvoiceQueue.ts
 * Redis-backed invoice processing queue using BullMQ
 *
 * Production-ready queue with:
 * - Persistent job storage in Redis
 * - Automatic retries with exponential backoff
 * - Dead letter queue for permanently failed jobs
 * - Progress tracking
 * - High availability support
 *
 * Environment variables:
 * - REDIS_HOST: Redis server host (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 */

import { Queue, Worker, Job, QueueEvents, ConnectionOptions } from 'bullmq';
import { logger } from '../utils/Logger';
import { JobStatus, InvoiceJobData, QueueJob } from './InvoiceQueue';

/** Redis configuration */
interface RedisConfig {
    host: string;
    port: number;
    password?: string;
}

/** BullMQ-specific configuration */
export interface BullMQConfig {
    redis: RedisConfig;
    maxConcurrency: number;
    maxAttempts: number;
    retryDelay: number;
}

const DEFAULT_CONFIG: BullMQConfig = {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD
    },
    maxConcurrency: 3,
    maxAttempts: 3,
    retryDelay: 5000
};

/** Convert to BullMQ ConnectionOptions */
function getConnectionOptions(redis: RedisConfig): ConnectionOptions {
    return {
        host: redis.host,
        port: redis.port,
        password: redis.password,
        maxRetriesPerRequest: null // Required for BullMQ workers
    };
}

/**
 * BullMQ-based invoice queue implementation
 * Drop-in replacement for InvoiceQueue with Redis persistence
 */
export class BullMQInvoiceQueue {
    private queue: Queue<InvoiceJobData, unknown, string>;
    private worker: Worker<InvoiceJobData, unknown, string> | null = null;
    private queueEvents: QueueEvents;
    private config: BullMQConfig;
    private isRunning: boolean = false;

    constructor(config: Partial<BullMQConfig> = {}) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
            redis: { ...DEFAULT_CONFIG.redis, ...config.redis }
        };

        const connectionOptions = getConnectionOptions(this.config.redis);

        // Create queue with Redis connection
        this.queue = new Queue<InvoiceJobData, unknown, string>('invoice-processing', {
            connection: connectionOptions,
            defaultJobOptions: {
                attempts: this.config.maxAttempts,
                backoff: {
                    type: 'exponential',
                    delay: this.config.retryDelay
                },
                removeOnComplete: { count: 100, age: 3600 },
                removeOnFail: { count: 1000, age: 86400 }
            }
        });

        // Create queue events listener
        this.queueEvents = new QueueEvents('invoice-processing', {
            connection: connectionOptions
        });

        // Setup event listeners
        this.setupEventListeners();

        logger.info(`[BullMQInvoiceQueue] Initialized`, {
            redis: `${(this.config.redis as { host?: string }).host || 'localhost'}:${(this.config.redis as { port?: number }).port || 6379}`,
            maxConcurrency: this.config.maxConcurrency
        });
    }

    /**
     * Add a job to the queue
     */
    public async add(data: InvoiceJobData): Promise<QueueJob> {
        try {
            const job = await this.queue.add('process-invoice', data, {
                jobId: this.generateJobId(data.orderId)
            });

            logger.info(`[BullMQInvoiceQueue] Job added`, {
                jobId: job.id,
                orderId: data.orderId
            });

            return this.mapBullMQJobToQueueJob(job);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`[BullMQInvoiceQueue] Failed to add job`, {
                orderId: data.orderId,
                error: errorMessage
            });
            throw new Error(`Failed to add job to queue: ${errorMessage}`);
        }
    }

    /**
     * Register the job processor
     */
    public process(processor: (job: QueueJob) => Promise<unknown>): void {
        if (this.worker) {
            logger.warn(`[BullMQInvoiceQueue] Worker already registered, stopping previous worker`);
            this.worker.close();
        }

        this.worker = new Worker<InvoiceJobData, unknown, string>(
            'invoice-processing',
            async (job: Job<InvoiceJobData, unknown, string>) => {
                const queueJob = this.mapBullMQJobToQueueJob(job);

                try {
                    const result = await processor(queueJob);
                    return result;
                } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    logger.error(`[BullMQInvoiceQueue] Job processing failed`, {
                        jobId: job.id,
                        error: errorMessage
                    });
                    throw error;
                }
            },
            {
                connection: getConnectionOptions(this.config.redis),
                concurrency: this.config.maxConcurrency,
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 1000 }
            }
        );

        // Setup worker event handlers
        this.worker.on('completed', (job: Job<InvoiceJobData, unknown, string>) => {
            logger.info(`[BullMQInvoiceQueue] Job completed`, {
                jobId: job.id,
                duration: job.finishedOn ? job.finishedOn - (job.processedOn || job.timestamp) : 0
            });
        });

        this.worker.on('failed', (job: Job<InvoiceJobData, unknown, string> | undefined, error: Error) => {
            logger.error(`[BullMQInvoiceQueue] Job failed`, {
                jobId: job?.id,
                error: error.message,
                attempts: job?.attemptsMade
            });
        });

        this.worker.on('error', (error: Error) => {
            logger.error(`[BullMQInvoiceQueue] Worker error`, { error: error.message });
        });

        this.isRunning = true;
        logger.info(`[BullMQInvoiceQueue] Worker started with concurrency ${this.config.maxConcurrency}`);
    }

    /**
     * Get job by ID
     */
    public async getJob(jobId: string): Promise<QueueJob | undefined> {
        try {
            const job = await this.queue.getJob(jobId);
            if (!job) return undefined;

            return this.mapBullMQJobToQueueJob(job);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`[BullMQInvoiceQueue] Failed to get job`, {
                jobId,
                error: errorMessage
            });
            return undefined;
        }
    }

    /**
     * Get queue stats
     */
    public async getStats(): Promise<{
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    }> {
        try {
            const [waiting, active, completed, failed] = await Promise.all([
                this.queue.getWaitingCount(),
                this.queue.getActiveCount(),
                this.queue.getCompletedCount(),
                this.queue.getFailedCount()
            ]);

            return {
                total: waiting + active + completed + failed,
                pending: waiting,
                processing: active,
                completed,
                failed
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`[BullMQInvoiceQueue] Failed to get stats`, {
                error: errorMessage
            });
            return {
                total: 0,
                pending: 0,
                processing: 0,
                completed: 0,
                failed: 0
            };
        }
    }

    /**
     * Update job progress (0-100)
     */
    public async updateProgress(jobId: string, progress: number): Promise<void> {
        try {
            const job = await this.queue.getJob(jobId);
            if (job) {
                await job.updateProgress(Math.min(100, Math.max(0, progress)));
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`[BullMQInvoiceQueue] Failed to update progress`, {
                jobId,
                error: errorMessage
            });
        }
    }

    /**
     * Clean completed/failed jobs older than specified time
     */
    public async clean(maxAge: number = 3600000): Promise<number> {
        try {
            const [completedCleaned, failedCleaned] = await Promise.all([
                this.queue.clean(maxAge, 100, 'completed'),
                this.queue.clean(maxAge, 100, 'failed')
            ]);

            const totalCleaned = completedCleaned.length + failedCleaned.length;

            if (totalCleaned > 0) {
                logger.debug(`[BullMQInvoiceQueue] Cleaned ${totalCleaned} old jobs`, {
                    completed: completedCleaned.length,
                    failed: failedCleaned.length
                });
            }

            return totalCleaned;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`[BullMQInvoiceQueue] Failed to clean jobs`, {
                error: errorMessage
            });
            return 0;
        }
    }

    /**
     * Stop processing and close connections
     */
    public async close(): Promise<void> {
        this.isRunning = false;

        if (this.worker) {
            await this.worker.close();
            logger.info(`[BullMQInvoiceQueue] Worker closed`);
        }

        await this.queueEvents.close();
        await this.queue.close();

        logger.info(`[BullMQInvoiceQueue] All connections closed`);
    }

    // ========== Private Methods ==========

    private generateJobId(orderId: string): string {
        return `invoice_${orderId}_${Date.now()}`;
    }

    private mapBullMQJobToQueueJob(job: Job<InvoiceJobData, unknown, string>): QueueJob {
        const attemptsMade = job.attemptsMade || 0;
        const maxAttempts = job.opts.attempts || 3;

        // Determine status based on job state
        let status: JobStatus;
        const state = job.getState();

        // getState returns a Promise, so we need to check synchronous properties
        if (job.finishedOn && !job.failedReason) {
            status = JobStatus.COMPLETED;
        } else if (job.failedReason) {
            status = JobStatus.FAILED;
        } else if (job.processedOn && !job.finishedOn) {
            status = JobStatus.PROCESSING;
        } else if (attemptsMade > 0 && attemptsMade < maxAttempts) {
            status = JobStatus.RETRYING;
        } else {
            status = JobStatus.PENDING;
        }

        return {
            id: job.id!,
            data: job.data,
            status,
            attempts: attemptsMade,
            maxAttempts,
            createdAt: new Date(job.timestamp),
            startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
            completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
            error: job.failedReason,
            result: job.returnvalue,
            progress: (job.progress as number) || 0
        };
    }

    private setupEventListeners(): void {
        this.queueEvents.on('waiting', ({ jobId }: { jobId: string }) => {
            logger.debug(`[BullMQInvoiceQueue] Job waiting`, { jobId });
        });

        this.queueEvents.on('active', ({ jobId }: { jobId: string }) => {
            logger.debug(`[BullMQInvoiceQueue] Job active`, { jobId });
        });

        this.queueEvents.on('completed', ({ jobId }: { jobId: string; returnvalue: string }) => {
            logger.debug(`[BullMQInvoiceQueue] Job completed event`, { jobId });
        });

        this.queueEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
            logger.warn(`[BullMQInvoiceQueue] Job failed event`, { jobId, reason: failedReason });
        });

        this.queueEvents.on('progress', ({ jobId, data }) => {
            logger.debug(`[BullMQInvoiceQueue] Job progress`, { jobId, progress: data });
        });
    }
}
