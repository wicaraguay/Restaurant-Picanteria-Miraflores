/**
 * Logger para Frontend - Patrón Singleton
 * 
 * Sistema de logging para el frontend con diferentes niveles.
 * Solo activo en modo desarrollo para evitar logs en producción.
 * Proporciona métodos para debug, info, warn y error.
 */

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: any;
}

/**
 * Clase Logger - Implementa patrón Singleton
 * Garantiza una única instancia del logger en toda la aplicación
 */
export class Logger {
    private static instance: Logger;
    private isDevelopment: boolean;

    private constructor() {
        this.isDevelopment = import.meta.env.DEV;
    }

    /**
     * Obtiene la instancia única del Logger (patrón Singleton)
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private formatLog(entry: LogEntry): string {
        const { timestamp, level, message, context } = entry;
        const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
        return `[${timestamp}] [${level}] ${message}${contextStr}`;
    }

    private log(level: LogLevel, message: string, context?: any): void {
        if (!this.isDevelopment && level === LogLevel.DEBUG) {
            return; // No mostrar debug en producción
        }

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context
        };

        const formattedLog = this.formatLog(entry);

        switch (level) {
            case LogLevel.ERROR:
                console.error(formattedLog);
                break;
            case LogLevel.WARN:
                console.warn(formattedLog);
                break;
            case LogLevel.DEBUG:
                console.debug(formattedLog);
                break;
            default:
                console.log(formattedLog);
        }
    }

    public debug(message: string, context?: any): void {
        this.log(LogLevel.DEBUG, message, context);
    }

    public info(message: string, context?: any): void {
        this.log(LogLevel.INFO, message, context);
    }

    public warn(message: string, context?: any): void {
        this.log(LogLevel.WARN, message, context);
    }

    public error(message: string, error?: Error | any): void {
        const context = error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error;
        this.log(LogLevel.ERROR, message, context);
    }
}

// Exportar instancia singleton
export const logger = Logger.getInstance();
