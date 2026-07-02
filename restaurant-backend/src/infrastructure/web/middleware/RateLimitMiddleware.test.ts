/**
 * RateLimitMiddleware.test.ts
 * Unit tests for RateLimitMiddleware
 *
 * Tests all rate limiters with HTTP simulation via supertest
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';
import {
    invoiceGenerationLimiter,
    statusCheckLimiter,
    resubmitLimiter,
    creditNoteLimiter,
    circuitResetLimiter
} from './RateLimitMiddleware';
import { logger } from '../../utils/Logger';

// Mock logger
vi.mock('../../utils/Logger', () => ({
    logger: {
        warn: vi.fn(),
        info: vi.fn(),
        error: vi.fn()
    }
}));

describe('RateLimitMiddleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('invoiceGenerationLimiter', () => {
        let app: Express;

        beforeEach(() => {
            app = express();
            app.use(express.json());
            app.post('/invoices', invoiceGenerationLimiter, (req: Request, res: Response) => {
                res.status(200).json({ success: true });
            });
        });

        it('should allow 10 requests per minute', async () => {
            // Send 10 requests (should all succeed)
            for (let i = 0; i < 10; i++) {
                const response = await request(app)
                    .post('/invoices')
                    .send({ data: 'test' });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.headers).toHaveProperty('ratelimit-limit', '10');
                expect(response.headers).toHaveProperty('ratelimit-remaining');
            }
        });

        it('should block request #11 with 429 status', async () => {
            // Send 10 successful requests
            for (let i = 0; i < 10; i++) {
                await request(app)
                    .post('/invoices')
                    .send({ data: 'test' });
            }

            // 11th request should be blocked
            const response = await request(app)
                .post('/invoices')
                .send({ data: 'test' });

            expect(response.status).toBe(429);
            expect(response.body).toEqual({
                success: false,
                error: 'Demasiadas solicitudes de facturación. Por favor espere un minuto antes de intentar de nuevo.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 60
            });
        });

        it('should include RateLimit-* headers in responses', async () => {
            const response = await request(app)
                .post('/invoices')
                .send({ data: 'test' });

            expect(response.headers).toHaveProperty('ratelimit-limit');
            expect(response.headers).toHaveProperty('ratelimit-remaining');
            expect(response.headers).toHaveProperty('ratelimit-reset');
            expect(response.headers['ratelimit-limit']).toBe('10');
        });

        it('should log warning when limit exceeded', async () => {
            // Send 10 requests to exhaust limit
            for (let i = 0; i < 10; i++) {
                await request(app)
                    .post('/invoices')
                    .send({ data: 'test' });
            }

            // Trigger rate limit
            await request(app)
                .post('/invoices')
                .send({ data: 'test' });

            expect(logger.warn).toHaveBeenCalledWith(
                '[RateLimit] Invoice generation limit exceeded',
                expect.objectContaining({
                    path: '/invoices'
                })
            );
        });

        it('should use userId as key when authenticated', async () => {
            const appWithAuth = express();
            appWithAuth.use(express.json());

            // Middleware to add user to request
            appWithAuth.use((req: any, res: Response, next: NextFunction) => {
                req.user = { userId: 'user123' };
                next();
            });

            appWithAuth.post('/invoices', invoiceGenerationLimiter, (req: Request, res: Response) => {
                res.status(200).json({ success: true });
            });

            // Send 10 requests with authenticated user
            for (let i = 0; i < 10; i++) {
                await request(appWithAuth)
                    .post('/invoices')
                    .send({ data: 'test' });
            }

            // 11th request should be blocked
            const response = await request(appWithAuth)
                .post('/invoices')
                .send({ data: 'test' });

            expect(response.status).toBe(429);
        });
    });

    describe('statusCheckLimiter', () => {
        let app: Express;

        beforeEach(() => {
            app = express();
            app.use(express.json());
            app.get('/status/:id', statusCheckLimiter, (req: Request, res: Response) => {
                res.status(200).json({ success: true });
            });
        });

        it('should allow 30 requests per minute', async () => {
            // Send 30 requests (should all succeed)
            for (let i = 0; i < 30; i++) {
                const response = await request(app)
                    .get('/status/123')
                    .send();

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            }
        });

        it('should block request #31 with 429 status', async () => {
            // Send 30 successful requests
            for (let i = 0; i < 30; i++) {
                await request(app)
                    .get('/status/123')
                    .send();
            }

            // 31st request should be blocked
            const response = await request(app)
                .get('/status/123')
                .send();

            expect(response.status).toBe(429);
            expect(response.body).toEqual({
                success: false,
                error: 'Demasiadas consultas de estado. Por favor espere un momento.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 60
            });
        });

        it('should include RateLimit-* headers', async () => {
            const response = await request(app)
                .get('/status/123')
                .send();

            expect(response.headers).toHaveProperty('ratelimit-limit', '30');
            expect(response.headers).toHaveProperty('ratelimit-remaining');
            expect(response.headers).toHaveProperty('ratelimit-reset');
        });

        it('should log warning when limit exceeded', async () => {
            // Exhaust limit
            for (let i = 0; i < 30; i++) {
                await request(app).get('/status/123');
            }

            // Trigger rate limit
            await request(app).get('/status/123');

            expect(logger.warn).toHaveBeenCalledWith(
                '[RateLimit] Status check limit exceeded',
                expect.objectContaining({
                    path: '/status/123'
                })
            );
        });
    });

    describe('resubmitLimiter', () => {
        let app: Express;

        beforeEach(() => {
            app = express();
            app.use(express.json());

            // Middleware to add user to request
            app.use((req: any, res: Response, next: NextFunction) => {
                req.user = { userId: 'user123' };
                next();
            });

            app.post('/resubmit/:id', resubmitLimiter, (req: Request, res: Response) => {
                res.status(200).json({ success: true });
            });
        });

        it('should allow 5 requests per 5 minutes', async () => {
            // Send 5 requests (should all succeed)
            for (let i = 0; i < 5; i++) {
                const response = await request(app)
                    .post('/resubmit/bill123')
                    .send({ data: 'test' });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            }
        });

        it('should block request #6 with 429 status', async () => {
            // Send 5 successful requests
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/resubmit/bill123')
                    .send({ data: 'test' });
            }

            // 6th request should be blocked
            const response = await request(app)
                .post('/resubmit/bill123')
                .send({ data: 'test' });

            expect(response.status).toBe(429);
            expect(response.body).toEqual({
                success: false,
                error: 'Demasiados reintentos de facturación. Por favor espere 5 minutos antes de intentar de nuevo. Si el problema persiste, contacte a soporte.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 300
            });
        });

        it('should limit by user+billId using keyGenerator', async () => {
            // Send 5 requests for bill123
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/resubmit/bill123')
                    .send({ data: 'test' });
            }

            // 6th request for bill123 should be blocked
            const response1 = await request(app)
                .post('/resubmit/bill123')
                .send({ data: 'test' });
            expect(response1.status).toBe(429);

            // But request for bill456 should succeed (different key)
            const response2 = await request(app)
                .post('/resubmit/bill456')
                .send({ data: 'test' });
            expect(response2.status).toBe(200);
        });

        it('should include retryAfter of 300 in error message', async () => {
            // Exhaust limit
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/resubmit/bill123')
                    .send({ data: 'test' });
            }

            const response = await request(app)
                .post('/resubmit/bill123')
                .send({ data: 'test' });

            expect(response.body.retryAfter).toBe(300);
        });

        it('should log billId when limit exceeded', async () => {
            // Exhaust limit
            for (let i = 0; i < 5; i++) {
                await request(app).post('/resubmit/bill999');
            }

            // Trigger rate limit
            await request(app).post('/resubmit/bill999');

            expect(logger.warn).toHaveBeenCalledWith(
                '[RateLimit] Resubmit limit exceeded',
                expect.objectContaining({
                    billId: 'bill999',
                    userId: 'user123'
                })
            );
        });
    });

    describe('creditNoteLimiter', () => {
        let app: Express;

        beforeEach(() => {
            app = express();
            app.use(express.json());
            app.post('/credit-notes', creditNoteLimiter, (req: Request, res: Response) => {
                res.status(200).json({ success: true });
            });
        });

        it('should allow 10 requests per minute', async () => {
            // Send 10 requests (should all succeed)
            for (let i = 0; i < 10; i++) {
                const response = await request(app)
                    .post('/credit-notes')
                    .send({ data: 'test' });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            }
        });

        it('should block request #11 with 429 status', async () => {
            // Send 10 successful requests
            for (let i = 0; i < 10; i++) {
                await request(app)
                    .post('/credit-notes')
                    .send({ data: 'test' });
            }

            // 11th request should be blocked
            const response = await request(app)
                .post('/credit-notes')
                .send({ data: 'test' });

            expect(response.status).toBe(429);
            expect(response.body).toEqual({
                success: false,
                error: 'Demasiadas solicitudes de notas de crédito. Por favor espere un minuto.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 60
            });
        });

        it('should include RateLimit-* headers', async () => {
            const response = await request(app)
                .post('/credit-notes')
                .send({ data: 'test' });

            expect(response.headers).toHaveProperty('ratelimit-limit', '10');
            expect(response.headers).toHaveProperty('ratelimit-remaining');
        });

        it('should log warning when limit exceeded', async () => {
            // Exhaust limit
            for (let i = 0; i < 10; i++) {
                await request(app).post('/credit-notes');
            }

            // Trigger rate limit
            await request(app).post('/credit-notes');

            expect(logger.warn).toHaveBeenCalledWith(
                '[RateLimit] Credit note limit exceeded',
                expect.objectContaining({
                    path: '/credit-notes'
                })
            );
        });
    });

    describe('circuitResetLimiter', () => {
        let app: Express;

        beforeEach(() => {
            app = express();
            app.use(express.json());
            app.post('/circuit/reset', circuitResetLimiter, (req: Request, res: Response) => {
                res.status(200).json({ success: true });
            });
        });

        it('should allow only 3 requests per hour', async () => {
            // Send 3 requests (should all succeed)
            for (let i = 0; i < 3; i++) {
                const response = await request(app)
                    .post('/circuit/reset')
                    .send({ data: 'test' });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            }
        });

        it('should block request #4 with 429 status', async () => {
            // Send 3 successful requests
            for (let i = 0; i < 3; i++) {
                await request(app)
                    .post('/circuit/reset')
                    .send({ data: 'test' });
            }

            // 4th request should be blocked
            const response = await request(app)
                .post('/circuit/reset')
                .send({ data: 'test' });

            expect(response.status).toBe(429);
            expect(response.body).toEqual({
                success: false,
                error: 'Demasiados resets del circuit breaker. Por favor espere.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 3600
            });
        });

        it('should include retryAfter of 3600 (1 hour) in error message', async () => {
            // Exhaust limit
            for (let i = 0; i < 3; i++) {
                await request(app)
                    .post('/circuit/reset')
                    .send({ data: 'test' });
            }

            const response = await request(app)
                .post('/circuit/reset')
                .send({ data: 'test' });

            expect(response.body.retryAfter).toBe(3600);
        });

        it('should include RateLimit-* headers with limit of 3', async () => {
            const response = await request(app)
                .post('/circuit/reset')
                .send({ data: 'test' });

            expect(response.headers).toHaveProperty('ratelimit-limit', '3');
            expect(response.headers).toHaveProperty('ratelimit-remaining');
        });

        it('should log warning when limit exceeded', async () => {
            // Exhaust limit
            for (let i = 0; i < 3; i++) {
                await request(app).post('/circuit/reset');
            }

            // Trigger rate limit
            await request(app).post('/circuit/reset');

            expect(logger.warn).toHaveBeenCalledWith(
                '[RateLimit] Circuit reset limit exceeded',
                expect.objectContaining({
                    ip: expect.any(String)
                })
            );
        });
    });

    describe('Common behavior across all limiters', () => {
        it('all limiters should return 429 when limit exceeded', async () => {
            const limiters = [
                { limiter: invoiceGenerationLimiter, max: 10, path: '/test-invoice' },
                { limiter: statusCheckLimiter, max: 30, path: '/test-status' },
                { limiter: creditNoteLimiter, max: 10, path: '/test-credit' },
                { limiter: circuitResetLimiter, max: 3, path: '/test-circuit' }
            ];

            for (const { limiter, max, path } of limiters) {
                const app = express();
                app.use(express.json());
                app.post(path, limiter, (req: Request, res: Response) => {
                    res.status(200).json({ success: true });
                });

                // Exhaust limit
                for (let i = 0; i < max; i++) {
                    await request(app).post(path);
                }

                // Should return 429
                const response = await request(app).post(path);
                expect(response.status).toBe(429);
            }
        });

        it('all limiters should include RateLimit-* headers', async () => {
            const limiters = [
                { limiter: invoiceGenerationLimiter, path: '/test-invoice' },
                { limiter: statusCheckLimiter, path: '/test-status' },
                { limiter: creditNoteLimiter, path: '/test-credit' },
                { limiter: circuitResetLimiter, path: '/test-circuit' }
            ];

            for (const { limiter, path } of limiters) {
                const app = express();
                app.post(path, limiter, (req: Request, res: Response) => {
                    res.status(200).json({ success: true });
                });

                const response = await request(app).post(path);

                expect(response.headers).toHaveProperty('ratelimit-limit');
                expect(response.headers).toHaveProperty('ratelimit-remaining');
                expect(response.headers).toHaveProperty('ratelimit-reset');
            }
        });

        it('all limiters should include retryAfter in error message', async () => {
            const limiters = [
                { limiter: invoiceGenerationLimiter, max: 10, path: '/test-invoice', retryAfter: 60 },
                { limiter: statusCheckLimiter, max: 30, path: '/test-status', retryAfter: 60 },
                { limiter: creditNoteLimiter, max: 10, path: '/test-credit', retryAfter: 60 },
                { limiter: circuitResetLimiter, max: 3, path: '/test-circuit', retryAfter: 3600 }
            ];

            for (const { limiter, max, path, retryAfter } of limiters) {
                const app = express();
                app.post(path, limiter, (req: Request, res: Response) => {
                    res.status(200).json({ success: true });
                });

                // Exhaust limit
                for (let i = 0; i < max; i++) {
                    await request(app).post(path);
                }

                const response = await request(app).post(path);
                expect(response.body).toHaveProperty('retryAfter', retryAfter);
            }
        });
    });
});
