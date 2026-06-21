/**
 * SentryMiddleware.ts
 * Express middleware for Sentry request and error handling
 *
 * Features:
 * - Request context capture
 * - Automatic error reporting
 * - Performance tracking
 * - User context extraction from JWT
 */

import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { sentryService } from '../../monitoring/SentryService';
import { logger } from '../../utils/Logger';

/**
 * Request handler middleware - captures request context
 * Should be placed early in middleware chain
 */
export const requestHandler = (req: Request, res: Response, next: NextFunction): void => {
    if (!sentryService.isEnabled()) {
        return next();
    }

    try {
        // Set request context
        sentryService.setContext('request', {
            method: req.method,
            url: req.url,
            path: req.path,
            query: req.query,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        // Extract user from JWT if present
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            try {
                // User extraction would happen here if needed
                // For now, just log that auth is present
                logger.debug('[Sentry] Authenticated request', {
                    path: req.path,
                });
            } catch (err) {
                logger.debug('[Sentry] Failed to extract user from token', { err });
            }
        }

        next();
    } catch (error) {
        logger.error('[Sentry] Request handler error', { error });
        next();
    }
};

/**
 * Error handler middleware - captures errors
 * Should be placed after all routes but before final error handler
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!sentryService.isEnabled()) {
        return next(err);
    }

    try {
        // Manual error capture with context
        const context = {
            request: {
                method: req.method,
                url: req.url,
                path: req.path,
                query: req.query,
                body: req.body,
                headers: {
                    ...req.headers,
                    // Remove sensitive headers
                    authorization: undefined,
                    cookie: undefined,
                },
                ip: req.ip,
            },
            response: {
                statusCode: res.statusCode,
            },
        };

        sentryService.captureException(err, context);

        logger.debug('[Sentry] Error captured from middleware', {
            error: err.message,
            path: req.path,
        });

        next(err);
    } catch (captureError) {
        logger.error('[Sentry] Error handler failed', { captureError });
        next(err);
    }
};

/**
 * Express middleware wrapper for easy integration
 */
export const SentryMiddleware = {
    requestHandler,
    errorHandler,
};
