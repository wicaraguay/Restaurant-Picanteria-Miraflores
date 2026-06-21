/**
 * SentryService.ts
 * Integration with Sentry for error tracking and performance monitoring
 *
 * Features:
 * - Exception capture and reporting
 * - Performance tracing
 * - User context tracking
 * - Custom context enrichment
 * - Environment-aware configuration
 */

import * as Sentry from '@sentry/node';
import type { Scope } from '@sentry/node';
import { logger } from '../utils/Logger';

export interface SentryUser {
    id?: string;
    email?: string;
    username?: string;
    [key: string]: any;
}

export interface SentryContext {
    [key: string]: any;
}

export type SentryLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Service for managing Sentry error tracking integration
 */
export class SentryService {
    private isInitialized: boolean = false;

    /**
     * Initialize Sentry with environment configuration
     */
    public init(): void {
        const dsn = process.env.SENTRY_DSN;

        if (!dsn) {
            logger.warn('[Sentry] SENTRY_DSN not configured, error tracking disabled');
            return;
        }

        try {
            const environment = process.env.NODE_ENV || 'development';
            const tracesSampleRate = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1');

            Sentry.init({
                dsn,
                environment,
                tracesSampleRate: Math.min(1.0, Math.max(0.0, tracesSampleRate)),
                beforeSend(event) {
                    // Filter out sensitive data
                    if (event.request?.headers) {
                        delete event.request.headers['authorization'];
                        delete event.request.headers['cookie'];
                    }
                    return event;
                },
            });

            this.isInitialized = true;
            logger.info('[Sentry] Initialized successfully', {
                environment,
                tracesSampleRate,
            });
        } catch (error) {
            logger.error('[Sentry] Initialization failed', { error });
        }
    }

    /**
     * Capture an exception and send to Sentry
     * @param error - The error to capture
     * @param context - Optional additional context
     */
    public captureException(error: Error | unknown, context?: SentryContext): void {
        if (!this.isInitialized) {
            logger.debug('[Sentry] Not initialized, skipping exception capture');
            return;
        }

        try {
            if (context) {
                Sentry.withScope((scope: Scope) => {
                    Object.entries(context).forEach(([key, value]) => {
                        scope.setContext(key, value);
                    });
                    Sentry.captureException(error);
                });
            } else {
                Sentry.captureException(error);
            }

            logger.debug('[Sentry] Exception captured', {
                error: error instanceof Error ? error.message : String(error),
            });
        } catch (err) {
            logger.error('[Sentry] Failed to capture exception', { err });
        }
    }

    /**
     * Capture a message and send to Sentry
     * @param message - The message to capture
     * @param level - Severity level
     * @param context - Optional additional context
     */
    public captureMessage(
        message: string,
        level: SentryLevel = 'info',
        context?: SentryContext
    ): void {
        if (!this.isInitialized) {
            logger.debug('[Sentry] Not initialized, skipping message capture');
            return;
        }

        try {
            if (context) {
                Sentry.withScope((scope: Scope) => {
                    Object.entries(context).forEach(([key, value]) => {
                        scope.setContext(key, value);
                    });
                    Sentry.captureMessage(message, level);
                });
            } else {
                Sentry.captureMessage(message, level);
            }

            logger.debug('[Sentry] Message captured', { message, level });
        } catch (err) {
            logger.error('[Sentry] Failed to capture message', { err });
        }
    }

    /**
     * Set user context for error tracking
     * @param user - User information
     */
    public setUser(user: SentryUser | null): void {
        if (!this.isInitialized) {
            return;
        }

        try {
            Sentry.setUser(user);
            logger.debug('[Sentry] User context set', {
                userId: user?.id,
            });
        } catch (err) {
            logger.error('[Sentry] Failed to set user context', { err });
        }
    }

    /**
     * Set custom context
     * @param name - Context name
     * @param context - Context data
     */
    public setContext(name: string, context: SentryContext): void {
        if (!this.isInitialized) {
            return;
        }

        try {
            Sentry.setContext(name, context);
            logger.debug('[Sentry] Context set', { name });
        } catch (err) {
            logger.error('[Sentry] Failed to set context', { err });
        }
    }

    /**
     * Start a span for performance tracking
     * @param name - Span name
     * @param op - Operation type (e.g., 'http.server', 'db.query')
     * @param callback - Function to execute within the span
     * @returns Result of the callback
     */
    public async startSpan<T>(name: string, op: string, callback: () => Promise<T>): Promise<T> {
        if (!this.isInitialized) {
            return callback();
        }

        return Sentry.startSpan({ name, op }, async () => {
            return callback();
        });
    }

    /**
     * Check if Sentry is initialized
     */
    public isEnabled(): boolean {
        return this.isInitialized;
    }

    /**
     * Flush pending events to Sentry
     * @param timeout - Maximum time to wait in milliseconds
     */
    public async flush(timeout: number = 2000): Promise<boolean> {
        if (!this.isInitialized) {
            return true;
        }

        try {
            const result = await Sentry.flush(timeout);
            logger.info('[Sentry] Events flushed', { success: result });
            return result;
        } catch (err) {
            logger.error('[Sentry] Failed to flush events', { err });
            return false;
        }
    }

    /**
     * Close Sentry client
     */
    public async close(timeout: number = 2000): Promise<boolean> {
        if (!this.isInitialized) {
            return true;
        }

        try {
            const result = await Sentry.close(timeout);
            this.isInitialized = false;
            logger.info('[Sentry] Client closed', { success: result });
            return result;
        } catch (err) {
            logger.error('[Sentry] Failed to close client', { err });
            return false;
        }
    }
}

// Singleton instance
export const sentryService = new SentryService();
