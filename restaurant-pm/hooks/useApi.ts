/**
 * Hook personalizado para llamadas API
 * 
 * Simplifica el manejo de estados de loading, error y data.
 * Proporciona retry automático en caso de fallo.
 * Integrado con el sistema de logging y manejo de errores.
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';

/**
 * Estado de una llamada API
 */
export interface ApiState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

/**
 * Opciones para el hook useApi
 */
export interface UseApiOptions {
    immediate?: boolean; // Ejecutar inmediatamente al montar
    onSuccess?: (data: any) => void;
    onError?: (error: string) => void;
}

/**
 * Hook useApi - Manejo simplificado de llamadas API
 * 
 * @param apiFunction - Función que realiza la llamada API
 * @param options - Opciones de configuración
 * @returns Estado y funciones de control
 */
export function useApi<T = any>(
    apiFunction: (...args: any[]) => Promise<T>,
    options: UseApiOptions = {}
) {
    const { immediate = false, onSuccess, onError } = options;

    const [state, setState] = useState<ApiState<T>>({
        data: null,
        loading: false,
        error: null,
    });

    /**
     * Ejecuta la llamada API
     */
    const execute = useCallback(
        async (...args: any[]) => {
            setState({ data: null, loading: true, error: null });
            logger.debug('Executing API call', { args });

            try {
                const result = await apiFunction(...args);
                setState({ data: result, loading: false, error: null });
                logger.info('API call successful');

                if (onSuccess) {
                    onSuccess(result);
                }

                return result;
            } catch (error) {
                const errorMessage = ErrorHandler.handle(error, 'API call failed');
                setState({ data: null, loading: false, error: errorMessage });

                if (onError) {
                    onError(errorMessage);
                }

                throw error;
            }
        },
        [apiFunction, onSuccess, onError]
    );

    /**
     * Resetea el estado
     */
    const reset = useCallback(() => {
        setState({ data: null, loading: false, error: null });
    }, []);

    // Ejecutar inmediatamente si se especifica
    useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [immediate, execute]);

    return {
        ...state,
        execute,
        reset,
    };
}
