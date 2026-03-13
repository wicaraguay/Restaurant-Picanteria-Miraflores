/**
 * Utilidad centralizada para manejo de errores
 * 
 * Este archivo proporciona un sistema centralizado para manejar errores en toda la aplicación.
 * Detecta automáticamente el tipo de error y envía la respuesta HTTP apropiada.
 * Incluye middleware para Express y un wrapper para funciones async.
 * Los detalles de error se muestran solo en desarrollo por seguridad.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './Logger';
import { ResponseFormatter } from './ResponseFormatter';
import {
    ValidationError,
    NotFoundError,
    AuthenticationError,
    DatabaseError
} from '../../domain/errors/CustomErrors';

/**
 * Clase ErrorHandler - Manejo centralizado de errores
 * Proporciona métodos estáticos para procesar y responder a errores
 */
export class ErrorHandler {
    /**
     * Handle errors and send appropriate response
     */
    static handle(error: any, req: Request, res: Response): void {
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        // Log the error with stack trace for internal auditing
        logger.error(`[ErrorHandler] ${error.message}`, {
            path: req.path,
            method: req.method,
            stack: error.stack,
            metadata: error.metadata
        });

        // 1. Handle our CustomErrors (ValidationError, NotFoundError, etc.)
        if (error.statusCode && error.code) {
            res.status(error.statusCode).json(
                ResponseFormatter.error(
                    error.code,
                    error.message,
                    error.metadata || error.resource ? { resource: error.resource, ...error.metadata } : undefined
                )
            );
            return;
        }

        // 2. Handle JWT Errors specifically if needed (optional but good)
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            res.status(401).json(ResponseFormatter.error('AUTH_INVALID_TOKEN', 'Token inválido o expirado'));
            return;
        }

        // 3. Fallback for all other unexpected errors
        const statusCode = error.statusCode || 500;
        const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
        const message = isDevelopment ? error.message : 'Ha ocurrido un error inesperado en el servidor.';

        res.status(statusCode).json(
            ResponseFormatter.error(
                errorCode,
                message,
                isDevelopment ? { stack: error.stack, details: error.details } : undefined
            )
        );
    }

    /**
     * Express middleware for global error handling
     */
    static middleware() {
        return (error: Error, req: Request, res: Response, next: NextFunction) => {
            ErrorHandler.handle(error, req, res);
        };
    }

    /**
     * Async handler wrapper to catch errors in async route handlers
     */
    static asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
        return (req: Request, res: Response, next: NextFunction) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}
