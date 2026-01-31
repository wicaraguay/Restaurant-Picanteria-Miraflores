/**
 * Hook personalizado para localStorage
 * 
 * Sincroniza un estado de React con localStorage.
 * Type-safe y con manejo automático de errores.
 * Útil para persistir preferencias del usuario.
 */

import { useState, useEffect, useCallback } from 'react';
import { StorageUtil } from '../utils/storage';
import { logger } from '../utils/logger';

/**
 * Hook useLocalStorage - Sincroniza estado con localStorage
 * 
 * @param key - Clave en localStorage
 * @param initialValue - Valor inicial si no existe en storage
 * @returns [valor, setValue, removeValue]
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T) => void, () => void] {
    // Estado para almacenar el valor
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            // Intentar obtener del localStorage
            const item = StorageUtil.getItem<T>(key);
            return item !== null ? item : initialValue;
        } catch (error) {
            logger.error(`Error reading from localStorage: ${key}`, error);
            return initialValue;
        }
    });

    /**
     * Actualiza el valor en estado y localStorage
     */
    const setValue = useCallback(
        (value: T) => {
            try {
                setStoredValue(value);
                StorageUtil.setItem(key, value);
            } catch (error) {
                logger.error(`Error saving to localStorage: ${key}`, error);
            }
        },
        [key]
    );

    /**
     * Elimina el valor de localStorage y resetea al inicial
     */
    const removeValue = useCallback(() => {
        try {
            setStoredValue(initialValue);
            StorageUtil.removeItem(key);
        } catch (error) {
            logger.error(`Error removing from localStorage: ${key}`, error);
        }
    }, [key, initialValue]);

    // Sincronizar con cambios en otras pestañas/ventanas
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue) {
                try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch (error) {
                    logger.error('Error parsing storage event', error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key]);

    return [storedValue, setValue, removeValue];
}
