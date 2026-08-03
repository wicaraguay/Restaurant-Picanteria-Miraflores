/**
 * Configuración de API
 * 
 * Centraliza toda la configuración relacionada con las llamadas API.
 * Define URLs base, timeouts, y otras configuraciones.
 */

import { Capacitor } from '@capacitor/core';

/**
 * URL base de la API del backend.
 *
 * - App NATIVA (Capacitor / Android): SIEMPRE apunta al backend de producción.
 *   Motivo: el emulador o el teléfono NO alcanzan 'localhost' (ese 'localhost'
 *   es el propio dispositivo, no la PC). Un build nativo debe hablar con el VPS
 *   por HTTPS. Se puede sobrescribir con VITE_API_URL_NATIVE si algún día se
 *   necesita apuntar a otro backend nativo.
 * - WEB (dev / producción): usa VITE_API_URL (Vercel la define en producción) o
 *   localhost en desarrollo.
 */
const NATIVE_API_URL = import.meta.env.VITE_API_URL_NATIVE || 'https://api.picanteriamiraflores.com/api';
const WEB_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const API_BASE_URL = Capacitor.isNativePlatform() ? NATIVE_API_URL : WEB_API_URL;

/**
 * Timeout para requests HTTP (en milisegundos)
 */
export const API_TIMEOUT = 60000; // 60 segundos (evitar Operation aborted en producción)

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
    CATEGORIES: {
        BASE: '/categories',
        BY_ID: (id: string) => `/categories/${id}`,
        REORDER: '/categories/reorder',
    },
} as const;
