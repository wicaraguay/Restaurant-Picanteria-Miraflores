/**
 * Request ID Middleware
 *
 * Generates a unique request ID for each incoming request to enable
 * distributed tracing and request correlation across services.
 *
 * Features:
 * - Generates UUID v4 for new requests
 * - Reads existing X-Request-ID header if present
 * - Attaches request ID to request object
 * - Adds X-Request-ID to response headers
 * - Makes ID available for logging
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Extended Request interface with requestId property
 */
export interface RequestWithId extends Request {
    requestId: string;
}

/**
 * Request ID middleware
 * Should be placed early in middleware chain (before logging, Sentry, etc.)
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Read existing X-Request-ID header if present (for distributed tracing)
    // Otherwise generate a new UUID v4
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    // Attach to request object for use in logging and downstream middleware
    (req as RequestWithId).requestId = requestId;

    // Add X-Request-ID to response headers so clients can correlate requests
    res.setHeader('X-Request-ID', requestId);

    next();
};
