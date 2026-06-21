/**
 * RateLimitMiddleware.ts
 * FIX D-02: Rate limiting específico para endpoints de facturación SRI
 *
 * Protege contra:
 * - Abuso de la API de facturación
 * - Intentos de fuerza bruta en reenvíos
 * - Sobrecarga del servicio SRI
 *
 * Configuración por endpoint:
 * - Generación de facturas: Límite estricto (costoso y con efectos permanentes)
 * - Consultas de estado: Límite más permisivo (solo lectura)
 * - Re-envíos: Límite muy estricto (previene reintentos excesivos)
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { logger } from '../../utils/Logger';
import {
    INVOICE_RATE_LIMIT,
    STATUS_CHECK_RATE_LIMIT,
    RESUBMIT_RATE_LIMIT,
    CIRCUIT_RESET_RATE_LIMIT
} from '../../../config/billing.constants';

/**
 * Rate limiter para generación de facturas
 * - Límite estricto: 10 facturas por minuto por IP
 * - Las facturas tienen efectos permanentes en el SRI
 */
export const invoiceGenerationLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: INVOICE_RATE_LIMIT,
    message: {
        success: false,
        error: 'Demasiadas solicitudes de facturación. Por favor espere un minuto antes de intentar de nuevo.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
        logger.warn('[RateLimit] Invoice generation limit exceeded', {
            ip: req.ip,
            path: req.path,
            userId: (req as any).user?.userId
        });
        res.status(429).json(options.message);
    },
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        const userId = (req as any).user?.userId;
        return userId ? `user:${userId}` : req.ip || 'unknown';
    }
});

/**
 * Rate limiter para consultas de estado
 * - Límite más permisivo: 30 consultas por minuto por IP
 * - Solo lectura, no tiene efectos secundarios
 */
export const statusCheckLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: STATUS_CHECK_RATE_LIMIT,
    message: {
        success: false,
        error: 'Demasiadas consultas de estado. Por favor espere un momento.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('[RateLimit] Status check limit exceeded', {
            ip: req.ip,
            path: req.path
        });
        res.status(429).json(options.message);
    }
});

/**
 * Rate limiter para re-envíos de facturas fallidas
 * - Límite muy estricto: 5 re-envíos por 5 minutos por IP
 * - Previene reintentos excesivos que pueden causar duplicados en SRI
 */
export const resubmitLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: RESUBMIT_RATE_LIMIT,
    message: {
        success: false,
        error: 'Demasiados reintentos de facturación. Por favor espere 5 minutos antes de intentar de nuevo. Si el problema persiste, contacte a soporte.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 300
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('[RateLimit] Resubmit limit exceeded', {
            ip: req.ip,
            path: req.path,
            userId: (req as any).user?.userId,
            billId: req.params.id
        });
        res.status(429).json(options.message);
    },
    keyGenerator: (req) => {
        // Rate limit by user + bill ID to prevent abuse per bill
        const userId = (req as any).user?.userId || req.ip;
        const billId = req.params.id || 'unknown';
        return `${userId}:${billId}`;
    }
});

/**
 * Rate limiter para notas de crédito
 * - Similar a facturas: 10 por minuto
 */
export const creditNoteLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: INVOICE_RATE_LIMIT,
    message: {
        success: false,
        error: 'Demasiadas solicitudes de notas de crédito. Por favor espere un minuto.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('[RateLimit] Credit note limit exceeded', {
            ip: req.ip,
            path: req.path,
            userId: (req as any).user?.userId
        });
        res.status(429).json(options.message);
    }
});

/**
 * Rate limiter para operaciones administrativas del circuit breaker
 * - Muy estricto: 3 resets por hora
 */
export const circuitResetLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: CIRCUIT_RESET_RATE_LIMIT,
    message: {
        success: false,
        error: 'Demasiados resets del circuit breaker. Por favor espere.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('[RateLimit] Circuit reset limit exceeded', {
            ip: req.ip,
            userId: (req as any).user?.userId
        });
        res.status(429).json(options.message);
    }
});
