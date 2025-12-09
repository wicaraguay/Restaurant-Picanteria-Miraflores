/**
 * Manejo Centralizado de Errores - Frontend
 * 
 * Proporciona utilidades para manejar errores de manera consistente.
 * Formatea mensajes de error para mostrar al usuario.
 * Registra errores en consola durante desarrollo.
 */

import { logger } from './logger';

/**
 * Clase para manejo centralizado de errores en el frontend
 */
export class ErrorHandler {
    /**
     * Extrae un mensaje de error legible desde diferentes tipos de error
     */
    static extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'string') {
            return error;
        }

        if (error && typeof error === 'object') {
            // Intentar extraer mensaje de respuesta API
            if ('message' in error && typeof error.message === 'string') {
                return error.message;
            }
            if ('error' in error && typeof error.error === 'string') {
                return error.error;
            }
        }

        return 'Ha ocurrido un error inesperado';
    }

    /**
     * Maneja un error y retorna un mensaje amigable para el usuario
     */
    static handle(error: unknown, context?: string): string {
        const message = this.extractErrorMessage(error);
        const fullContext = context ? `${context}: ${message}` : message;

        logger.error(fullContext, error);

        return this.getUserFriendlyMessage(message);
    }

    /**
     * Convierte mensajes técnicos en mensajes amigables para el usuario
     */
    private static getUserFriendlyMessage(message: string): string {
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
            return 'Error de conexión. Por favor verifica tu conexión a internet.';
        }

        if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
            return 'No autorizado. Por favor inicia sesión nuevamente.';
        }

        if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
            return 'No tienes permisos para realizar esta acción.';
        }

        if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
            return 'Recurso no encontrado.';
        }

        if (lowerMessage.includes('timeout')) {
            return 'La solicitud ha tardado demasiado. Por favor intenta nuevamente.';
        }

        // Si el mensaje ya es amigable, retornarlo
        return message;
    }

    /**
     * Muestra un error al usuario (puede integrarse con un sistema de notificaciones)
     */
    static showError(error: unknown, context?: string): void {
        const message = this.handle(error, context);
        // Por ahora usar alert, pero se puede reemplazar con un toast/notification system
        alert(message);
    }
}
