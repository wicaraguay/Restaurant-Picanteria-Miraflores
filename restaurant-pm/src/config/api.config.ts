/**
 * Configuración de API
 * 
 * Centraliza toda la configuración relacionada con las llamadas API.
 * Define URLs base, timeouts, y otras configuraciones.
 */

/**
 * URL base de la API del backend
 * Usa variable de entorno o fallback a localhost:3000
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Timeout para requests HTTP (en milisegundos)
 */
export const API_TIMEOUT = 30000; // 30 segundos

/**
 * Configuración de headers por defecto
 */
export const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
};

/**
 * Endpoints de la API
 */
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        VALIDATE: '/auth/validate',
        LOGOUT: '/auth/logout',
    },
    CUSTOMERS: {
        BASE: '/customers',
        BY_ID: (id: string) => `/customers/${id}`,
    },
    ORDERS: {
        BASE: '/orders',
        BY_ID: (id: string) => `/orders/${id}`,
    },
    MENU: {
        BASE: '/menu',
        BY_ID: (id: string) => `/menu/${id}`,
    },
    BILLS: {
        BASE: '/bills',
    },
    EMPLOYEES: {
        BASE: '/employees',
        BY_ID: (id: string) => `/employees/${id}`,
    },
    ROLES: {
        BASE: '/roles',
        BY_ID: (id: string) => `/roles/${id}`,
    },
} as const;
