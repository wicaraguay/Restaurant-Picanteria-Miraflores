/**
 * Formateador de respuestas API estandarizadas
 * 
 * Este archivo proporciona utilidades para formatear respuestas HTTP de manera consistente.
 * Todas las respuestas exitosas incluyen: success, data, y metadata.
 * Todas las respuestas de error incluyen: success (false), error con code y message, y metadata.
 * Soporta paginación con metadatos adicionales.
 */

/**
 * Interfaz para respuestas exitosas
 * @template T - Tipo de datos que se retornan
 */
export interface SuccessResponse<T = any> {
    success: true;
    data: T;
    metadata?: {
        timestamp: string;
        requestId?: string;
        pagination?: PaginationMetadata;
    };
}

/**
 * Interfaz para respuestas de error
 */
export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
    };
    metadata?: {
        timestamp: string;
        requestId?: string;
    };
}

export interface PaginationMetadata {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/**
 * Clase ResponseFormatter - Utilidad para formatear respuestas API
 * Proporciona métodos estáticos para crear respuestas consistentes
 */
export class ResponseFormatter {
    /**
     * Format a successful response
     */
    static success<T>(data: T, metadata?: Partial<SuccessResponse['metadata']>): SuccessResponse<T> {
        return {
            success: true,
            data,
            metadata: {
                timestamp: new Date().toISOString(),
                ...metadata
            }
        };
    }

    /**
     * Format an error response
     */
    static error(
        code: string,
        message: string,
        details?: any,
        metadata?: Partial<ErrorResponse['metadata']>
    ): ErrorResponse {
        return {
            success: false,
            error: {
                code,
                message,
                details
            },
            metadata: {
                timestamp: new Date().toISOString(),
                ...metadata
            }
        };
    }

    /**
     * Format a paginated response
     */
    static paginated<T>(
        data: T[],
        page: number,
        pageSize: number,
        totalItems: number
    ): SuccessResponse<T[]> {
        const totalPages = Math.ceil(totalItems / pageSize);

        return {
            success: true,
            data,
            metadata: {
                timestamp: new Date().toISOString(),
                pagination: {
                    page,
                    pageSize,
                    totalItems,
                    totalPages
                }
            }
        };
    }
}
