/**
 * @file ErrorBoundary.tsx
 * @description Componente Error Boundary para manejo de errores en React
 * 
 * @purpose
 * Captura errores en componentes hijos y muestra UI de fallback.
 * Previene que errores en un componente rompan toda la aplicación.
 * Integrado con sistema de logging.
 * 
 * @connections
 * - Usa: logger (utils/logger)
 * - Envuelve: Componentes críticos de la aplicación
 * 
 * @layer Components - Error Handling
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

const CHUNK_RELOAD_KEY = 'restaurant_pm_chunk_reload_at';

/**
 * Detecta el fallo clásico post-deploy: la pestaña corre una versión vieja y
 * pide un chunk lazy cuyo archivo ya no existe en el servidor (Vite genera
 * nombres con hash nuevos en cada build y el service worker limpia los viejos).
 */
const isStaleChunkError = (error: Error | null): boolean =>
    /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|chunkloaderror|loading chunk .* failed|'text\/html' is not a valid javascript mime type/i
        .test(error?.message || '');

/** Permite UNA recarga automática por minuto — evita bucles si el error persiste. */
const tryScheduleAutoReload = (): boolean => {
    try {
        const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
        if (Date.now() - last < 60_000) return false;
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
        return true;
    } catch {
        return false;
    }
};

/**
 * ErrorBoundary - Captura errores en componentes hijos
 */
export class ErrorBoundary extends Component<Props, State> {
    public readonly state: State = {
        hasError: false,
        error: null
    };

    private autoReloading = false;

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error
        logger.error('ErrorBoundary caught an error', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack
        });

        // Auto-recuperación post-deploy: si falló la carga de un chunk viejo,
        // recargar trae el index.html nuevo y la app se cura sola sin que el
        // empleado vea la pantalla de error.
        if (isStaleChunkError(error) && tryScheduleAutoReload()) {
            this.autoReloading = true;
            this.forceUpdate();
            window.location.reload();
            return;
        }

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Recarga automática en curso: spinner breve en vez de la pantalla
            // de error (la app vuelve sola con la versión nueva)
            if (this.autoReloading) {
                return (
                    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                            <p className="text-gray-600 dark:text-gray-400 font-medium">Actualizando aplicación…</p>
                        </div>
                    </div>
                );
            }

            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white dark:bg-dark-800 rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
                            <svg
                                className="w-6 h-6 text-red-600 dark:text-red-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                            Algo salió mal
                        </h2>

                        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                            Lo sentimos, ha ocurrido un error inesperado. Por favor, intenta recargar la página.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded text-xs">
                                <p className="font-mono text-red-800 dark:text-red-300 break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleReset}
                                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Intentar de nuevo
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-dark-700 hover:bg-gray-300 dark:hover:bg-dark-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
                            >
                                Recargar página
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Hook para usar ErrorBoundary con componentes funcionales
 */
export const withErrorBoundary = <P extends object>(
    Component: React.ComponentType<P>,
    fallback?: ReactNode
): React.FC<P> => {
    return (props: P) => (
        <ErrorBoundary fallback={fallback}>
            <Component {...props} />
        </ErrorBoundary>
    );
};
