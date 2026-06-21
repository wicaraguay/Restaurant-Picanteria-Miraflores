/**
 * CircuitBreaker.ts
 * FIX D-01: Circuit Breaker pattern for SRI service resilience
 *
 * Prevents cascade failures when SRI is unavailable by:
 * - Tracking consecutive failures
 * - "Opening" the circuit after threshold is reached (fail fast)
 * - Periodically allowing "half-open" test requests
 * - Automatically "closing" when service recovers
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit tripped, requests fail immediately without calling SRI
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

import { logger } from './Logger';
import { sentryService } from '../monitoring/SentryService';
import { metricsService } from '../monitoring/MetricsService';
import {
    CIRCUIT_FAILURE_THRESHOLD,
    CIRCUIT_RESET_TIMEOUT_MS,
    CIRCUIT_SUCCESS_THRESHOLD
} from '../../config/billing.constants';

export enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
    /** Number of consecutive failures before opening circuit (default: 5) */
    failureThreshold: number;
    /** Time in ms to wait before testing recovery (default: 60000 = 1 min) */
    resetTimeout: number;
    /** Number of successful calls in HALF_OPEN to close circuit (default: 2) */
    successThreshold: number;
    /** Optional name for logging */
    name: string;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
    failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
    resetTimeout: CIRCUIT_RESET_TIMEOUT_MS,
    successThreshold: CIRCUIT_SUCCESS_THRESHOLD,
    name: 'default'
};

export interface CircuitBreakerState {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime: number | null;
    nextAttemptTime: number | null;
}

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failures: number = 0;
    private successes: number = 0;
    private lastFailureTime: number | null = null;
    private nextAttemptTime: number | null = null;
    private options: CircuitBreakerOptions;

    constructor(options: Partial<CircuitBreakerOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        logger.info(`[CircuitBreaker:${this.options.name}] Initialized`, {
            failureThreshold: this.options.failureThreshold,
            resetTimeout: this.options.resetTimeout,
            successThreshold: this.options.successThreshold
        });
    }

    /**
     * Execute a function with circuit breaker protection
     * @param fn The async function to execute
     * @returns The result of the function
     * @throws CircuitOpenError if circuit is open, or the original error
     */
    public async execute<T>(fn: () => Promise<T>): Promise<T> {
        // Check if we should allow this request
        if (!this.canExecute()) {
            const waitTime = this.nextAttemptTime
                ? Math.ceil((this.nextAttemptTime - Date.now()) / 1000)
                : 0;

            logger.warn(`[CircuitBreaker:${this.options.name}] Circuit OPEN, rejecting request`, {
                waitTimeSeconds: waitTime,
                failures: this.failures
            });

            throw new CircuitOpenError(
                `El servicio del SRI está temporalmente no disponible. ` +
                `Por favor, intente nuevamente en ${waitTime} segundos. ` +
                `(Circuito abierto después de ${this.failures} fallos consecutivos)`,
                waitTime
            );
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }

    /**
     * Check if a request should be allowed
     */
    private canExecute(): boolean {
        const now = Date.now();

        switch (this.state) {
            case CircuitState.CLOSED:
                return true;

            case CircuitState.OPEN:
                // Check if enough time has passed to try again
                if (this.nextAttemptTime && now >= this.nextAttemptTime) {
                    this.transitionTo(CircuitState.HALF_OPEN);
                    return true;
                }
                return false;

            case CircuitState.HALF_OPEN:
                // Allow limited requests in half-open state
                return true;

            default:
                return true;
        }
    }

    /**
     * Handle successful execution
     */
    private onSuccess(): void {
        if (this.state === CircuitState.HALF_OPEN) {
            this.successes++;
            logger.debug(`[CircuitBreaker:${this.options.name}] Success in HALF_OPEN`, {
                successes: this.successes,
                threshold: this.options.successThreshold
            });

            if (this.successes >= this.options.successThreshold) {
                this.transitionTo(CircuitState.CLOSED);
            }
        } else if (this.state === CircuitState.CLOSED) {
            // Reset failure count on success
            this.failures = 0;
        }
    }

    /**
     * Handle failed execution
     */
    private onFailure(error: any): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        // Only count network/server errors, not validation errors
        const isTransientError = this.isTransientError(error);

        if (!isTransientError) {
            // Don't count validation errors toward circuit breaker
            logger.debug(`[CircuitBreaker:${this.options.name}] Non-transient error, not counting`, {
                errorType: error.name,
                message: error.message?.substring(0, 100)
            });
            this.failures--; // Undo the increment
            return;
        }

        logger.warn(`[CircuitBreaker:${this.options.name}] Failure recorded`, {
            failures: this.failures,
            threshold: this.options.failureThreshold,
            state: this.state
        });

        // Report transient errors to Sentry
        sentryService.captureException(error, {
            circuitBreaker: {
                name: this.options.name,
                failures: this.failures,
                threshold: this.options.failureThreshold,
                state: this.state,
            },
        });

        if (this.state === CircuitState.HALF_OPEN) {
            // Any failure in half-open goes back to open
            this.transitionTo(CircuitState.OPEN);
        } else if (this.state === CircuitState.CLOSED) {
            if (this.failures >= this.options.failureThreshold) {
                this.transitionTo(CircuitState.OPEN);
            }
        }
    }

    /**
     * Determine if an error is transient (network/server) vs permanent (validation)
     */
    private isTransientError(error: any): boolean {
        const message = error.message?.toLowerCase() || '';
        const code = error.code || '';

        // Network errors - transient
        if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'].includes(code)) {
            return true;
        }

        // Server errors (500s) - transient
        if (message.includes('error 500') ||
            message.includes('servicio del sri') ||
            message.includes('temporalmente no disponible') ||
            message.includes('problemas internos')) {
            return true;
        }

        // Validation/business errors - NOT transient (don't trip circuit)
        if (message.includes('secuencial') ||
            message.includes('firma') ||
            message.includes('identificación') ||
            message.includes('ruc') ||
            message.includes('clave de acceso')) {
            return false;
        }

        // Axios errors with response status
        if (error.response?.status >= 500) {
            return true;
        }
        if (error.response?.status >= 400 && error.response?.status < 500) {
            return false; // Client errors are not transient
        }

        // Default to transient for unknown errors
        return true;
    }

    /**
     * Transition to a new state
     */
    private transitionTo(newState: CircuitState): void {
        const oldState = this.state;
        this.state = newState;

        logger.info(`[CircuitBreaker:${this.options.name}] State transition`, {
            from: oldState,
            to: newState,
            failures: this.failures
        });

        // Update metrics
        metricsService.setCircuitBreakerState(this.options.name, newState);

        switch (newState) {
            case CircuitState.OPEN:
                this.nextAttemptTime = Date.now() + this.options.resetTimeout;
                this.successes = 0;
                logger.warn(`[CircuitBreaker:${this.options.name}] Circuit OPENED`, {
                    nextAttemptIn: `${this.options.resetTimeout / 1000}s`,
                    totalFailures: this.failures
                });

                // Notify Sentry when circuit opens
                sentryService.captureMessage(
                    `Circuit breaker opened: ${this.options.name}`,
                    'warning',
                    {
                        circuitBreaker: {
                            name: this.options.name,
                            failures: this.failures,
                            threshold: this.options.failureThreshold,
                            resetTimeout: this.options.resetTimeout,
                        },
                    }
                );
                break;

            case CircuitState.HALF_OPEN:
                this.successes = 0;
                logger.info(`[CircuitBreaker:${this.options.name}] Circuit HALF-OPEN, testing recovery`);
                break;

            case CircuitState.CLOSED:
                this.failures = 0;
                this.successes = 0;
                this.nextAttemptTime = null;
                logger.info(`[CircuitBreaker:${this.options.name}] Circuit CLOSED, service recovered`);
                break;
        }
    }

    /**
     * Get current circuit state (for monitoring/health checks)
     */
    public getState(): CircuitBreakerState {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailureTime: this.lastFailureTime,
            nextAttemptTime: this.nextAttemptTime
        };
    }

    /**
     * Force reset the circuit breaker (admin operation)
     */
    public reset(): void {
        logger.info(`[CircuitBreaker:${this.options.name}] Manual reset`);
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
    }

    /**
     * Check if circuit is currently allowing requests
     */
    public isAvailable(): boolean {
        return this.canExecute();
    }
}

/**
 * Custom error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
    public readonly waitTimeSeconds: number;
    public readonly isCircuitOpen: boolean = true;

    constructor(message: string, waitTimeSeconds: number) {
        super(message);
        this.name = 'CircuitOpenError';
        this.waitTimeSeconds = waitTimeSeconds;
    }
}

// Singleton instances for different services
const circuitBreakers: Map<string, CircuitBreaker> = new Map();

/**
 * Get or create a circuit breaker for a named service
 */
export function getCircuitBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!circuitBreakers.has(name)) {
        circuitBreakers.set(name, new CircuitBreaker({ ...options, name }));
    }
    return circuitBreakers.get(name)!;
}

/**
 * Get all circuit breaker states (for health monitoring)
 */
export function getAllCircuitStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};
    circuitBreakers.forEach((cb, name) => {
        states[name] = cb.getState();
    });
    return states;
}

// Pre-configured circuit breaker for SRI operations
export const sriCircuitBreaker = getCircuitBreaker('SRI', {
    failureThreshold: CIRCUIT_FAILURE_THRESHOLD,
    resetTimeout: CIRCUIT_RESET_TIMEOUT_MS,
    successThreshold: CIRCUIT_SUCCESS_THRESHOLD
});
