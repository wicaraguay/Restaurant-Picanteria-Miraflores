/**
 * Utilidad para LocalStorage/SessionStorage
 * 
 * Proporciona métodos type-safe para trabajar con storage del navegador.
 * Maneja errores de storage automáticamente.
 * Serializa/deserializa objetos JSON.
 */

import { logger } from './logger';

/**
 * Clase para manejo seguro de localStorage y sessionStorage
 */
export class StorageUtil {
    /**
     * Guarda un valor en localStorage
     */
    static setItem<T>(key: string, value: T): boolean {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            logger.debug(`Stored item in localStorage: ${key}`);
            return true;
        } catch (error) {
            logger.error(`Failed to store item in localStorage: ${key}`, error);
            return false;
        }
    }

    /**
     * Obtiene un valor de localStorage
     */
    static getItem<T>(key: string): T | null {
        try {
            const item = localStorage.getItem(key);
            if (item === null) {
                return null;
            }
            return JSON.parse(item) as T;
        } catch (error) {
            logger.error(`Failed to get item from localStorage: ${key}`, error);
            return null;
        }
    }

    /**
     * Elimina un valor de localStorage
     */
    static removeItem(key: string): void {
        try {
            localStorage.removeItem(key);
            logger.debug(`Removed item from localStorage: ${key}`);
        } catch (error) {
            logger.error(`Failed to remove item from localStorage: ${key}`, error);
        }
    }

    /**
     * Limpia todo el localStorage
     */
    static clear(): void {
        try {
            localStorage.clear();
            logger.debug('Cleared localStorage');
        } catch (error) {
            logger.error('Failed to clear localStorage', error);
        }
    }

    /**
     * Guarda un valor en sessionStorage
     */
    static setSessionItem<T>(key: string, value: T): boolean {
        try {
            const serialized = JSON.stringify(value);
            sessionStorage.setItem(key, serialized);
            logger.debug(`Stored item in sessionStorage: ${key}`);
            return true;
        } catch (error) {
            logger.error(`Failed to store item in sessionStorage: ${key}`, error);
            return false;
        }
    }

    /**
     * Obtiene un valor de sessionStorage
     */
    static getSessionItem<T>(key: string): T | null {
        try {
            const item = sessionStorage.getItem(key);
            if (item === null) {
                return null;
            }
            return JSON.parse(item) as T;
        } catch (error) {
            logger.error(`Failed to get item from sessionStorage: ${key}`, error);
            return null;
        }
    }

    /**
     * Elimina un valor de sessionStorage
     */
    static removeSessionItem(key: string): void {
        try {
            sessionStorage.removeItem(key);
            logger.debug(`Removed item from sessionStorage: ${key}`);
        } catch (error) {
            logger.error(`Failed to remove item from sessionStorage: ${key}`, error);
        }
    }
}
