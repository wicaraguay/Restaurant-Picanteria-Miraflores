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
    static handle(error: Error, req: Request, res: Response): void {
        logger.error('Error occurred', error);

        // Handle custom errors
        if (error instanceof ValidationError) {
            res.status(error.statusCode).json(
                ResponseFormatter.error(
                    error.code,
                    error.message,
                    error.metadata
                )
            );
            return;
        }

        if (error instanceof NotFoundError) {
            res.status(error.statusCode).json(
                ResponseFormatter.error(
                    error.code,
                    error.message,
                    { resource: error.resource }
                )
            );
            return;
        }

        if (error instanceof AuthenticationError) {
            res.status(error.statusCode).json(
                ResponseFormatter.error(
                    error.code,
                    error.message
                )
            );
            return;
        }

        if (error instanceof DatabaseError) {
            res.status(error.statusCode).json(
                ResponseFormatter.error(
                    error.code,
                    error.message,
                    process.env.NODE_ENV === 'development'
                        ? { originalError: error.originalError?.message }
                        : undefined
                )
            );
            return;
        }

        // Handle unknown errors
        const statusCode = 500;
        const message = process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : error.message;

        res.status(statusCode).json(
            ResponseFormatter.error(
                'INTERNAL_ERROR',
                message,
                process.env.NODE_ENV === 'development'
                    ? { stack: error.stack }
                    : undefined
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
