/**
 * Logger Singleton con logging estructurado
 * 
 * Este archivo implementa el patrón Singleton para el sistema de logging.
 * Proporciona métodos para registrar mensajes en diferentes niveles (DEBUG, INFO, WARN, ERROR).
 * Los logs incluyen timestamp, nivel, mensaje y contexto opcional.
 * En modo desarrollo, los logs DEBUG son visibles; en producción se ocultan.
 */

/**
 * Niveles de log disponibles
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
        this.isDevelopment = process.env.NODE_ENV !== 'production';
    }

    /**
     * Obtiene la instancia única del Logger (patrón Singleton)
     * Si no existe, la crea; si ya existe, retorna la existente
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
                if (this.isDevelopment) {
                    console.debug(formattedLog);
                }
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

// Export singleton instance
export const logger = Logger.getInstance();

/**
 * FIX S-02: Mask sensitive data for logging
 * Access keys are 49 characters - show only first 8 and last 4
 * Example: 2506202601179... → 25062026****...****9123
 */
export function maskAccessKey(key: string | undefined | null): string {
    if (!key) return '[no-key]';
    if (key.length < 16) return '***masked***';
    return `${key.substring(0, 8)}****...****${key.slice(-4)}`;
}

/**
 * Mask any string that looks like sensitive data
 * Useful for general purpose masking in logs
 */
export function maskSensitive(value: string | undefined | null, showFirst: number = 4, showLast: number = 4): string {
    if (!value) return '[empty]';
    if (value.length <= showFirst + showLast) return '***';
    return `${value.substring(0, showFirst)}${'*'.repeat(Math.min(8, value.length - showFirst - showLast))}${value.slice(-showLast)}`;
}
