/**
 * InvoiceQueue.ts
 * FIX D-04: Async invoice processing queue
 *
 * Simple in-memory queue for async invoice processing.
 * Benefits:
 * - Non-blocking invoice generation
 * - Automatic retries on failure
 * - Progress tracking
 * - Easy migration path to BullMQ/Redis
 *
 * For production with high volume, replace with BullMQ:
 * - npm install bullmq ioredis
 * - Configure Redis connection
 * - Replace InMemoryQueue with BullMQ Queue
 */

import { logger } from '../utils/Logger';
import { metricsService } from '../monitoring/MetricsService';
import { EventEmitter } from 'events';
import {
    QUEUE_MAX_CONCURRENCY,
    QUEUE_MAX_ATTEMPTS,
    QUEUE_RETRY_DELAY_MS,
    QUEUE_JOB_TIMEOUT_MS
} from '../../config/billing.constants';

/** Job status */
export enum JobStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    RETRYING = 'RETRYING'
}

/** Invoice job data */
export interface InvoiceJobData {
    orderId: string;
    order: any;
    client: any;
    taxRate?: number;
    logoUrl?: string;
    billId?: string;
}

/** Job in the queue */
export interface QueueJob<T = InvoiceJobData> {
    id: string;
    data: T;
    status: JobStatus;
    attempts: number;
    maxAttempts: number;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
    result?: any;
    progress: number;
}

/** Queue configuration */
export interface QueueOptions {
    name: string;
    maxConcurrency: number;
    maxAttempts: number;
    retryDelay: number; // ms
    jobTimeout: number; // ms
}

const DEFAULT_OPTIONS: QueueOptions = {
    name: 'invoice-queue',
    maxConcurrency: QUEUE_MAX_CONCURRENCY,
    maxAttempts: QUEUE_MAX_ATTEMPTS,
    retryDelay: QUEUE_RETRY_DELAY_MS,
    jobTimeout: QUEUE_JOB_TIMEOUT_MS
};

/**
 * Simple in-memory queue implementation
 * Can be replaced with BullMQ for production scalability
 */
export class InvoiceQueue extends EventEmitter {
    private queue: Map<string, QueueJob> = new Map();
    private processing: Set<string> = new Set();
    private processor: ((job: QueueJob) => Promise<any>) | null = null;
    private options: QueueOptions;
    private isRunning: boolean = false;
    private processInterval: NodeJS.Timeout | null = null;

    constructor(options: Partial<QueueOptions> = {}) {
        super();
        this.options = { ...DEFAULT_OPTIONS, ...options };
        logger.info(`[InvoiceQueue] Initialized`, {
            name: this.options.name,
            maxConcurrency: this.options.maxConcurrency,
            maxAttempts: this.options.maxAttempts
        });
    }

    /**
     * Add a job to the queue
     */
    public async add(data: InvoiceJobData): Promise<QueueJob> {
        const jobId = this.generateJobId();
        const job: QueueJob = {
            id: jobId,
            data,
            status: JobStatus.PENDING,
            attempts: 0,
            maxAttempts: this.options.maxAttempts,
            createdAt: new Date(),
            progress: 0
        };

        this.queue.set(jobId, job);
        logger.info(`[InvoiceQueue] Job added`, { jobId, orderId: data.orderId });

        this.emit('job:added', job);

        // Update metrics
        this.updateQueueMetrics();

        // Trigger processing
        this.processNext();

        return job;
    }

    /**
     * Register the job processor
     */
    public process(processor: (job: QueueJob) => Promise<any>): void {
        this.processor = processor;
        this.start();
    }

    /**
     * Start processing queue
     */
    public start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        logger.info(`[InvoiceQueue] Started`);

        // Process pending jobs periodically
        this.processInterval = setInterval(() => this.processNext(), 1000);
    }

    /**
     * Stop processing
     */
    public stop(): void {
        this.isRunning = false;
        if (this.processInterval) {
            clearInterval(this.processInterval);
            this.processInterval = null;
        }
        logger.info(`[InvoiceQueue] Stopped`);
    }

    /**
     * Get job by ID
     */
    public getJob(jobId: string): QueueJob | undefined {
        return this.queue.get(jobId);
    }

    /**
     * Get all jobs with optional status filter
     */
    public getJobs(status?: JobStatus): QueueJob[] {
        const jobs = Array.from(this.queue.values());
        if (status) {
            return jobs.filter(j => j.status === status);
        }
        return jobs;
    }

    /**
     * Get queue stats
     */
    public getStats(): {
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    } {
        const jobs = Array.from(this.queue.values());
        const stats = {
            total: jobs.length,
            pending: jobs.filter(j => j.status === JobStatus.PENDING).length,
            processing: jobs.filter(j => j.status === JobStatus.PROCESSING).length,
            completed: jobs.filter(j => j.status === JobStatus.COMPLETED).length,
            failed: jobs.filter(j => j.status === JobStatus.FAILED).length
        };

        // Update metrics
        metricsService.setInvoiceQueueSize(JobStatus.PENDING, stats.pending);
        metricsService.setInvoiceQueueSize(JobStatus.PROCESSING, stats.processing);
        metricsService.setInvoiceQueueSize(JobStatus.COMPLETED, stats.completed);
        metricsService.setInvoiceQueueSize(JobStatus.FAILED, stats.failed);

        return stats;
    }

    /**
     * Update job progress (0-100)
     */
    public updateProgress(jobId: string, progress: number): void {
        const job = this.queue.get(jobId);
        if (job) {
            job.progress = Math.min(100, Math.max(0, progress));
            this.emit('job:progress', job);
        }
    }

    /**
     * Clean completed/failed jobs older than specified time
     */
    public clean(maxAge: number = 3600000): number {
        const now = Date.now();
        let cleaned = 0;

        for (const [id, job] of this.queue.entries()) {
            if (
                (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) &&
                job.completedAt &&
                (now - job.completedAt.getTime()) > maxAge
            ) {
                this.queue.delete(id);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`[InvoiceQueue] Cleaned ${cleaned} old jobs`);
        }

        return cleaned;
    }

    // ========== Private Methods ==========

    private generateJobId(): string {
        return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    private async processNext(): Promise<void> {
        if (!this.processor || !this.isRunning) return;
        if (this.processing.size >= this.options.maxConcurrency) return;

        // Find next pending job
        const pendingJob = Array.from(this.queue.values())
            .find(j => j.status === JobStatus.PENDING || j.status === JobStatus.RETRYING);

        if (!pendingJob) return;

        // Mark as processing
        pendingJob.status = JobStatus.PROCESSING;
        pendingJob.startedAt = new Date();
        pendingJob.attempts++;
        this.processing.add(pendingJob.id);

        logger.info(`[InvoiceQueue] Processing job`, {
            jobId: pendingJob.id,
            attempt: pendingJob.attempts,
            orderId: pendingJob.data.orderId
        });

        this.emit('job:started', pendingJob);

        try {
            // Add timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Job timeout')), this.options.jobTimeout);
            });

            const result = await Promise.race([
                this.processor(pendingJob),
                timeoutPromise
            ]);

            // Success
            pendingJob.status = JobStatus.COMPLETED;
            pendingJob.completedAt = new Date();
            pendingJob.result = result;
            pendingJob.progress = 100;

            logger.info(`[InvoiceQueue] Job completed`, {
                jobId: pendingJob.id,
                duration: pendingJob.completedAt.getTime() - pendingJob.startedAt!.getTime()
            });

            this.emit('job:completed', pendingJob);
            this.updateQueueMetrics();

        } catch (error: any) {
            pendingJob.error = error.message;

            // Check if should retry
            if (pendingJob.attempts < pendingJob.maxAttempts) {
                pendingJob.status = JobStatus.RETRYING;
                logger.warn(`[InvoiceQueue] Job failed, will retry`, {
                    jobId: pendingJob.id,
                    attempt: pendingJob.attempts,
                    maxAttempts: pendingJob.maxAttempts,
                    error: error.message
                });

                // Schedule retry
                setTimeout(() => {
                    pendingJob.status = JobStatus.PENDING;
                    this.processNext();
                }, this.options.retryDelay);

            } else {
                pendingJob.status = JobStatus.FAILED;
                pendingJob.completedAt = new Date();
                logger.error(`[InvoiceQueue] Job failed permanently`, {
                    jobId: pendingJob.id,
                    attempts: pendingJob.attempts,
                    error: error.message
                });

                this.emit('job:failed', pendingJob);
                this.updateQueueMetrics();
            }
        } finally {
            this.processing.delete(pendingJob.id);
        }
    }

    /**
     * Update queue size metrics
     */
    private updateQueueMetrics(): void {
        const jobs = Array.from(this.queue.values());
        metricsService.setInvoiceQueueSize(
            JobStatus.PENDING,
            jobs.filter(j => j.status === JobStatus.PENDING).length
        );
        metricsService.setInvoiceQueueSize(
            JobStatus.PROCESSING,
            jobs.filter(j => j.status === JobStatus.PROCESSING).length
        );
        metricsService.setInvoiceQueueSize(
            JobStatus.COMPLETED,
            jobs.filter(j => j.status === JobStatus.COMPLETED).length
        );
        metricsService.setInvoiceQueueSize(
            JobStatus.FAILED,
            jobs.filter(j => j.status === JobStatus.FAILED).length
        );
    }
}

// Singleton instance for invoice processing
export const invoiceQueue = new InvoiceQueue({
    name: 'invoice-processing',
    maxConcurrency: QUEUE_MAX_CONCURRENCY,
    maxAttempts: QUEUE_MAX_ATTEMPTS,
    retryDelay: QUEUE_RETRY_DELAY_MS,
    jobTimeout: QUEUE_JOB_TIMEOUT_MS
});
