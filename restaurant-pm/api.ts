/**
 * Servicio API - Patrón Singleton
 * 
 * Centraliza todas las llamadas HTTP al backend.
 * Implementa patrón Singleton para garantizar una única instancia.
 * Maneja automáticamente el nuevo formato de respuestas del backend.
 * Incluye manejo de errores y logging integrado.
 */

import { logger } from './utils/logger';
import { ErrorHandler } from './utils/errorHandler';
import { API_BASE_URL, API_TIMEOUT, DEFAULT_HEADERS, API_ENDPOINTS } from './config/api.config';

/**
 * Interfaz para respuestas exitosas del backend
 */
export interface ApiSuccessResponse<T = any> {
    success: true;
    data: T;
    metadata?: {
        timestamp: string;
        [key: string]: any;
    };
}

/**
 * Interfaz para respuestas de error del backend
 */
export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
    };
    metadata?: {
        timestamp: string;
        [key: string]: any;
    };
}

/**
 * Tipo de respuesta de la API
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Clase ApiService - Implementa patrón Singleton
 * Gestiona todas las llamadas HTTP al backend
 */
export class ApiService {
    private static instance: ApiService;
    private baseURL: string;
    private timeout: number;
    private token: string | null = null;

    private constructor() {
        this.baseURL = API_BASE_URL;
        this.timeout = API_TIMEOUT;
        // Intentar cargar token desde localStorage
        this.token = localStorage.getItem('restaurant_pm_token');
        logger.info('ApiService initialized', { baseURL: this.baseURL });
    }

    /**
     * Obtiene la instancia única del ApiService (patrón Singleton)
     */
    public static getInstance(): ApiService {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }

    /**
     * Establece el token JWT para autenticación
     */
    public setToken(token: string | null): void {
        this.token = token;
        if (token) {
            localStorage.setItem('restaurant_pm_token', token);
        } else {
            localStorage.removeItem('restaurant_pm_token');
        }
    }

    /**
     * Obtiene el token actual
     */
    public getToken(): string | null {
        return this.token;
    }

    /**
     * Realiza una petición HTTP con timeout
     */
    private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const headers: HeadersInit = {
                ...DEFAULT_HEADERS,
                ...options.headers,
            };

            // Agregar token JWT si existe
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers,
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Procesa la respuesta de la API
     */
    private async processResponse<T>(response: Response): Promise<T> {
        const contentType = response.headers.get('content-type');

        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Respuesta no es JSON');
        }

        const data: ApiResponse<T> = await response.json();

        if (!response.ok) {
            const errorMessage = data.success === false
                ? data.error.message
                : `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }

        // Si la respuesta usa el nuevo formato, extraer data
        if ('success' in data && data.success && 'data' in data) {
            return data.data;
        }

        // Fallback para respuestas en formato antiguo
        return data as T;
    }

    /**
     * Método GET genérico
     */
    private async get<T>(endpoint: string): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;
        logger.debug(`GET ${url}`);

        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'GET',
            });
            return await this.processResponse<T>(response);
        } catch (error) {
            logger.error(`GET ${url} failed`, error);
            throw error;
        }
    }

    /**
     * Método POST genérico
     */
    private async post<T>(endpoint: string, data: any): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;
        logger.debug(`POST ${url}`, { data });

        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'POST',
                body: JSON.stringify(data),
            });
            return await this.processResponse<T>(response);
        } catch (error) {
            logger.error(`POST ${url} failed`, error);
            throw error;
        }
    }

    /**
     * Método PUT genérico
     */
    private async put<T>(endpoint: string, data: any): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;
        logger.debug(`PUT ${url}`, { data });

        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
            return await this.processResponse<T>(response);
        } catch (error) {
            logger.error(`PUT ${url} failed`, error);
            throw error;
        }
    }

    /**
     * Método DELETE genérico
     */
    private async delete<T>(endpoint: string): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;
        logger.debug(`DELETE ${url}`);

        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'DELETE',
            });
            return await this.processResponse<T>(response);
        } catch (error) {
            logger.error(`DELETE ${url} failed`, error);
            throw error;
        }
    }

    // ==================== Métodos de API específicos ====================

    /**
     * Autenticación
     */
    public auth = {
        login: async (username: string, password?: string): Promise<any> => {
            const response: any = await this.post(API_ENDPOINTS.AUTH.LOGIN, { username, password });
            // Guardar token automáticamente
            if (response && response.token) {
                this.setToken(response.token);
            }
            return response;
        },
        register: async (data: any): Promise<any> => {
            return this.post(API_ENDPOINTS.AUTH.REGISTER, data);
        },
        validate: async (token: string): Promise<any> => {
            // Temporalmente establecer el token para la validación
            const originalToken = this.token;
            this.token = token;
            try {
                const response: any = await this.get(API_ENDPOINTS.AUTH.VALIDATE);
                return response.user;
            } catch (error) {
                return null;
            } finally {
                this.token = originalToken;
            }
        },
        logout: async (token: string): Promise<void> => {
            const originalToken = this.token;
            this.token = token;
            try {
                await this.post(API_ENDPOINTS.AUTH.LOGOUT, {});
            } finally {
                this.setToken(null);
                this.token = originalToken;
            }
        },
    };

    /**
     * Clientes
     */
    public customers = {
        getAll: async (): Promise<any[]> => {
            return this.get(API_ENDPOINTS.CUSTOMERS.BASE);
        },
        getById: async (id: string): Promise<any> => {
            return this.get(API_ENDPOINTS.CUSTOMERS.BY_ID(id));
        },
        create: async (data: any): Promise<any> => {
            return this.post(API_ENDPOINTS.CUSTOMERS.BASE, data);
        },
    };

    /**
     * Órdenes
     */
    public orders = {
        getAll: async (): Promise<any[]> => {
            return this.get(API_ENDPOINTS.ORDERS.BASE);
        },
        getById: async (id: string): Promise<any> => {
            return this.get(API_ENDPOINTS.ORDERS.BY_ID(id));
        },
        create: async (data: any): Promise<any> => {
            return this.post(API_ENDPOINTS.ORDERS.BASE, data);
        },
        update: async (id: string, data: any): Promise<any> => {
            return this.put(API_ENDPOINTS.ORDERS.BY_ID(id), data);
        },
        delete: async (id: string): Promise<any> => {
            return this.delete(API_ENDPOINTS.ORDERS.BY_ID(id));
        },
    };

    /**
     * Menú
     */
    public menu = {
        getAll: async (): Promise<any[]> => {
            return this.get(API_ENDPOINTS.MENU.BASE);
        },
        getById: async (id: string): Promise<any> => {
            return this.get(API_ENDPOINTS.MENU.BY_ID(id));
        },
        create: async (data: any): Promise<any> => {
            return this.post(API_ENDPOINTS.MENU.BASE, data);
        },
        update: async (id: string, data: any): Promise<any> => {
            return this.put(API_ENDPOINTS.MENU.BY_ID(id), data);
        },
    };

    /**
     * Configuración del Restaurante
     */
    public config = {
        get: async (): Promise<any> => {
            return this.get('/config');
        },
        update: async (data: any): Promise<any> => {
            return this.put('/config', data);
        },
    };

    /**
     * Facturación
     */
    public bills = {
        getAll: async (): Promise<any[]> => {
            return this.get(API_ENDPOINTS.BILLS.BASE);
        },
        create: async (data: any): Promise<any> => {
            return this.post(API_ENDPOINTS.BILLS.BASE, data);
        },
    };
}

// Exportar instancia singleton
export const apiService = ApiService.getInstance();

// Mantener compatibilidad con código existente
export const api = {
    auth: apiService.auth,
    customers: apiService.customers,
    orders: apiService.orders,
    menu: apiService.menu,
    config: apiService.config,
    bills: apiService.bills,
    getToken: () => apiService.getToken(),
    setToken: (token: string | null) => apiService.setToken(token),
};
