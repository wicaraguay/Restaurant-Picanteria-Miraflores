/**
 * MetricsService.ts
 * Prometheus metrics collection and exposition
 *
 * Features:
 * - SRI invoice and credit note counters
 * - HTTP request metrics
 * - Circuit breaker state tracking
 * - Invoice queue size monitoring
 * - Default Node.js metrics
 */

import { Request, Response, NextFunction } from 'express';
import * as promClient from 'prom-client';
import { logger } from '../utils/Logger';
import { CircuitState } from '../utils/CircuitBreaker';
import { JobStatus } from '../queue/InvoiceQueue';

/**
 * Service for collecting and exposing Prometheus metrics
 */
export class MetricsService {
    private registry: promClient.Registry;
    private isInitialized: boolean = false;

    // Counters
    private sriInvoicesTotal!: promClient.Counter;
    private sriCreditNotesTotal!: promClient.Counter;
    private httpRequestsTotal!: promClient.Counter;

    // Histograms
    private sriRequestDuration!: promClient.Histogram;
    private httpRequestDuration!: promClient.Histogram;

    // Gauges
    private circuitBreakerState!: promClient.Gauge;
    private invoiceQueueSize!: promClient.Gauge;

    constructor() {
        this.registry = new promClient.Registry();
    }

    /**
     * Initialize metrics collection
     */
    public init(): void {
        if (this.isInitialized) {
            logger.warn('[Metrics] Already initialized');
            return;
        }

        try {
            // Set default labels for all metrics
            this.registry.setDefaultLabels({
                app: 'restaurant-backend',
                environment: process.env.NODE_ENV || 'development',
            });

            // Initialize counters
            this.sriInvoicesTotal = new promClient.Counter({
                name: 'sri_invoices_total',
                help: 'Total number of SRI invoices processed',
                labelNames: ['status'] as const,
                registers: [this.registry],
            });

            this.sriCreditNotesTotal = new promClient.Counter({
                name: 'sri_credit_notes_total',
                help: 'Total number of SRI credit notes processed',
                labelNames: ['status'] as const,
                registers: [this.registry],
            });

            this.httpRequestsTotal = new promClient.Counter({
                name: 'http_requests_total',
                help: 'Total number of HTTP requests',
                labelNames: ['method', 'path', 'status'] as const,
                registers: [this.registry],
            });

            // Initialize histograms
            this.sriRequestDuration = new promClient.Histogram({
                name: 'sri_request_duration_seconds',
                help: 'Duration of SRI requests in seconds',
                labelNames: ['operation'] as const,
                buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
                registers: [this.registry],
            });

            this.httpRequestDuration = new promClient.Histogram({
                name: 'http_request_duration_seconds',
                help: 'Duration of HTTP requests in seconds',
                labelNames: ['method', 'path', 'status'] as const,
                buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
                registers: [this.registry],
            });

            // Initialize gauges
            this.circuitBreakerState = new promClient.Gauge({
                name: 'circuit_breaker_state',
                help: 'Circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN)',
                labelNames: ['name'] as const,
                registers: [this.registry],
            });

            this.invoiceQueueSize = new promClient.Gauge({
                name: 'invoice_queue_size',
                help: 'Number of jobs in invoice queue',
                labelNames: ['status'] as const,
                registers: [this.registry],
            });

            // Collect default Node.js metrics
            promClient.collectDefaultMetrics({
                register: this.registry,
                prefix: 'nodejs_',
            });

            this.isInitialized = true;
            logger.info('[Metrics] Initialized successfully');
        } catch (error) {
            logger.error('[Metrics] Initialization failed', { error });
        }
    }

    /**
     * Record SRI invoice processing
     * @param status - Processing status (success, failed, rejected)
     */
    public recordSRIInvoice(status: string): void {
        if (!this.isInitialized) return;
        try {
            this.sriInvoicesTotal.labels(status).inc();
        } catch (error) {
            logger.error('[Metrics] Failed to record SRI invoice', { error });
        }
    }

    /**
     * Record SRI credit note processing
     * @param status - Processing status (success, failed, rejected)
     */
    public recordSRICreditNote(status: string): void {
        if (!this.isInitialized) return;
        try {
            this.sriCreditNotesTotal.labels(status).inc();
        } catch (error) {
            logger.error('[Metrics] Failed to record SRI credit note', { error });
        }
    }

    /**
     * Record HTTP request
     * @param method - HTTP method
     * @param path - Request path
     * @param status - Response status code
     */
    public recordHTTPRequest(method: string, path: string, status: number): void {
        if (!this.isInitialized) return;
        try {
            this.httpRequestsTotal.labels(method, path, status.toString()).inc();
        } catch (error) {
            logger.error('[Metrics] Failed to record HTTP request', { error });
        }
    }

    /**
     * Record SRI request duration
     * @param operation - Operation name (send_invoice, authorize_invoice, etc.)
     * @param durationSeconds - Duration in seconds
     */
    public recordSRIRequestDuration(operation: string, durationSeconds: number): void {
        if (!this.isInitialized) return;
        try {
            this.sriRequestDuration.labels(operation).observe(durationSeconds);
        } catch (error) {
            logger.error('[Metrics] Failed to record SRI request duration', { error });
        }
    }

    /**
     * Record HTTP request duration
     * @param method - HTTP method
     * @param path - Request path
     * @param status - Response status code
     * @param durationSeconds - Duration in seconds
     */
    public recordHTTPRequestDuration(
        method: string,
        path: string,
        status: number,
        durationSeconds: number
    ): void {
        if (!this.isInitialized) return;
        try {
            this.httpRequestDuration
                .labels(method, path, status.toString())
                .observe(durationSeconds);
        } catch (error) {
            logger.error('[Metrics] Failed to record HTTP request duration', { error });
        }
    }

    /**
     * Update circuit breaker state
     * @param name - Circuit breaker name
     * @param state - Circuit state
     */
    public setCircuitBreakerState(name: string, state: CircuitState): void {
        if (!this.isInitialized) return;
        try {
            const stateValue =
                state === CircuitState.CLOSED ? 0 : state === CircuitState.OPEN ? 1 : 2;
            this.circuitBreakerState.labels(name).set(stateValue);
        } catch (error) {
            logger.error('[Metrics] Failed to set circuit breaker state', { error });
        }
    }

    /**
     * Update invoice queue size
     * @param status - Job status
     * @param count - Number of jobs with this status
     */
    public setInvoiceQueueSize(status: JobStatus, count: number): void {
        if (!this.isInitialized) return;
        try {
            this.invoiceQueueSize.labels(status).set(count);
        } catch (error) {
            logger.error('[Metrics] Failed to set invoice queue size', { error });
        }
    }

    /**
     * Get metrics in Prometheus text format
     */
    public async getMetrics(): Promise<string> {
        if (!this.isInitialized) {
            return '# Metrics not initialized\n';
        }

        try {
            return await this.registry.metrics();
        } catch (error) {
            logger.error('[Metrics] Failed to get metrics', { error });
            return '# Error collecting metrics\n';
        }
    }

    /**
     * Get metrics content type
     */
    public getContentType(): string {
        return this.registry.contentType;
    }

    /**
     * Check if metrics are initialized
     */
    public isEnabled(): boolean {
        return this.isInitialized;
    }

    /**
     * Express middleware for recording HTTP request metrics
     */
    public middleware(): (req: Request, res: Response, next: NextFunction) => void {
        return (req: Request, res: Response, next: NextFunction) => {
            if (!this.isInitialized) {
                return next();
            }

            const start = Date.now();

            // Record metrics when response finishes
            res.on('finish', () => {
                try {
                    const duration = (Date.now() - start) / 1000; // Convert to seconds
                    const path = req.route?.path || req.path;
                    const status = res.statusCode;

                    this.recordHTTPRequest(req.method, path, status);
                    this.recordHTTPRequestDuration(req.method, path, status, duration);
                } catch (error) {
                    logger.error('[Metrics] Middleware error', { error });
                }
            });

            next();
        };
    }
}

// Singleton instance
export const metricsService = new MetricsService();
