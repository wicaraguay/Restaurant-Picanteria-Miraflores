/**
 * Clases de error personalizadas para un mejor manejo de errores
 * 
 * Este archivo define errores personalizados que extienden la clase Error nativa de JavaScript.
 * Cada error incluye un código, código de estado HTTP, y metadatos adicionales.
 * Todos los errores implementan el método toJSON() para facilitar la serialización.
 */

/**
 * ValidationError - Error de validación de datos
 * Se usa cuando los datos de entrada no cumplen con los requisitos esperados
 * Código HTTP: 400 (Bad Request)
 */
export class ValidationError extends Error {
    public readonly code: string = 'VALIDATION_ERROR';
    public readonly statusCode: number = 400;
    public readonly metadata?: any;

    constructor(message: string, metadata?: any) {
        super(message);
        this.name = 'ValidationError';
        this.metadata = metadata;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            metadata: this.metadata
        };
    }
}

/**
 * NotFoundError - Error de recurso no encontrado
 * Se usa cuando un recurso solicitado no existe en la base de datos
 * Código HTTP: 404 (Not Found)
 */
export class NotFoundError extends Error {
    public readonly code: string = 'NOT_FOUND';
    public readonly statusCode: number = 404;
    public readonly resource?: string;

    constructor(message: string, resource?: string) {
        super(message);
        this.name = 'NotFoundError';
        this.resource = resource;
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            resource: this.resource
        };
    }
}

/**
 * AuthenticationError - Error de autenticación
 * Se usa cuando las credenciales son inválidas o la autenticación falla
 * Código HTTP: 401 (Unauthorized)
 */
export class AuthenticationError extends Error {
    public readonly code: string = 'AUTHENTICATION_ERROR';
    public readonly statusCode: number = 401;

    constructor(message: string = 'Authentication failed') {
        super(message);
        this.name = 'AuthenticationError';
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode
        };
    }
}

/**
 * DatabaseError - Error de base de datos
 * Se usa cuando ocurre un error durante operaciones de base de datos
 * Código HTTP: 500 (Internal Server Error)
 */
export class DatabaseError extends Error {
    public readonly code: string = 'DATABASE_ERROR';
    public readonly statusCode: number = 500;
    public readonly originalError?: Error;

    constructor(message: string, originalError?: Error) {
        super(message);
        this.name = 'DatabaseError';
        this.originalError = originalError;
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            originalError: this.originalError?.message
        };
    }
}
