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
            // Manejo especial para 401 Unauthorized (Sesión expirada o inválida)
            if (response.status === 401) {
                logger.warn('Unauthorized request - session may be expired', { url: response.url });
                
                // Si no es el endpoint de login, limpiar el token para forzar re-login
                if (!response.url.includes(API_ENDPOINTS.AUTH.LOGIN)) {
                    this.setToken(null);
                }
            }

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
    /**
     * Método GET genérico
     */
    public async get<T>(endpoint: string): Promise<T> {
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
    public async post<T>(endpoint: string, data: any): Promise<T> {
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
    public async put<T>(endpoint: string, data: any): Promise<T> {
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
    public async delete<T>(endpoint: string): Promise<T> {
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

    /**
     * Método PATCH genérico
     */
    public async patch<T>(endpoint: string, data: any): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;
        logger.debug(`PATCH ${url}`, { data });

        try {
            const response = await this.fetchWithTimeout(url, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
            return await this.processResponse<T>(response);
        } catch (error) {
            logger.error(`PATCH ${url} failed`, error);
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
        getAll: async (params?: {
            page?: number;
            limit?: number;
            name?: string;
            email?: string;
            phone?: string;
            sort?: any;
        }): Promise<any> => {
            const queryParams = new URLSearchParams();
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.name) queryParams.append('name', params.name);
            if (params?.email) queryParams.append('email', params.email);
            if (params?.phone) queryParams.append('phone', params.phone);
            if (params?.sort) queryParams.append('sort', JSON.stringify(params.sort));

            const url = queryParams.toString()
                ? `${API_ENDPOINTS.CUSTOMERS.BASE}?${queryParams}`
                : API_ENDPOINTS.CUSTOMERS.BASE;
            return this.get(url);
        },
        getById: async (id: string): Promise<any> => {
            return this.get(API_ENDPOINTS.CUSTOMERS.BY_ID(id));
        },
        create: async (data: any): Promise<any> => {
            return this.post(API_ENDPOINTS.CUSTOMERS.BASE, data);
        },
        update: async (id: string, data: any): Promise<any> => {
            return this.put(API_ENDPOINTS.CUSTOMERS.BY_ID(id), data);
        },
        delete: async (id: string): Promise<any> => {
            return this.delete(API_ENDPOINTS.CUSTOMERS.BY_ID(id));
        },
        lookupByIdentification: async (identification: string): Promise<any> => {
            return this.get(`${API_ENDPOINTS.CUSTOMERS.BASE}/lookup/${identification}`);
        },
    };

    /**
     * Órdenes
     */
    public orders = {
        getAll: async (params?: {
            page?: number;
            limit?: number;
            status?: string;
            billed?: boolean;
            customerName?: string;
            sort?: any;
        }): Promise<any> => {
            const queryParams = new URLSearchParams();
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.status) queryParams.append('status', params.status);
            if (params?.billed !== undefined) queryParams.append('billed', params.billed.toString());
            if (params?.customerName) queryParams.append('customerName', params.customerName);
            if (params?.sort) queryParams.append('sort', JSON.stringify(params.sort));

            const url = queryParams.toString()
                ? `${API_ENDPOINTS.ORDERS.BASE}?${queryParams}`
                : API_ENDPOINTS.ORDERS.BASE;
            return this.get(url);
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
        delete: async (id: string): Promise<any> => {
            return this.delete(API_ENDPOINTS.MENU.BY_ID(id));
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
        uploadCertificate: async (data: { certificateBase64: string; password: string; environment: '1' | '2' }): Promise<any> => {
            return this.post('/config/certificate', data);
        },
        deleteCertificate: async (): Promise<any> => {
            return this.delete('/config/certificate');
        },
        updateCertificateEnvironment: async (environment: '1' | '2'): Promise<any> => {
            return this.patch('/config/certificate/environment', { environment });
        },
    };

    /**
     * Facturación
     */
    public bills = {
        getAll: async (params?: {
            page?: number;
            limit?: number;
            documentNumber?: string;
            customerIdentification?: string;
            documentType?: string;
            sort?: any;
        }): Promise<any> => {
            const queryParams = new URLSearchParams();
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.documentNumber) queryParams.append('documentNumber', params.documentNumber);
            if (params?.customerIdentification) queryParams.append('customerIdentification', params.customerIdentification);
            if (params?.documentType) queryParams.append('documentType', params.documentType);
            if (params?.sort) queryParams.append('sort', JSON.stringify(params.sort));

            const url = queryParams.toString()
                ? `${API_ENDPOINTS.BILLS.BASE}?${queryParams}`
                : API_ENDPOINTS.BILLS.BASE;
            return this.get(url);
        },
        create: async (data: any): Promise<any> => {
            return this.post(API_ENDPOINTS.BILLS.BASE, data);
        },
        delete: async (id: string): Promise<any> => {
            return this.delete(`${API_ENDPOINTS.BILLS.BASE}/${id}`);
        },
        resetSystem: async (): Promise<any> => {
            return this.post(`${API_ENDPOINTS.BILLS.BASE}/reset`, {});
        },
        resetAllSystem: async (): Promise<any> => {
            return this.post(`${API_ENDPOINTS.BILLS.BASE}/reset-all`, {});
        },
    };

    /**
     * SRI Billing (Generación de XML)
     */
    public billing = {
        generateXML: async (data: { order: any, client: any, taxRate?: number, logoUrl?: string }): Promise<any> => {
            return this.post('/billing/generate-xml', data);
        },
        checkStatus: async (accessKey: string): Promise<any> => {
            return this.post(`/billing/check-status/${accessKey}`, {});
        }
    };

    /**
     * Empleados
     */
    public employees = {
        getAll: async (): Promise<any[]> => {
            return this.get(API_ENDPOINTS.EMPLOYEES.BASE);
        },
        getById: async (id: string): Promise<any> => {
            return this.get(API_ENDPOINTS.EMPLOYEES.BY_ID(id));
        },
        create: async (data: any): Promise<any> => {
            return this.post(API_ENDPOINTS.EMPLOYEES.BASE, data);
        },
        update: async (id: string, data: any): Promise<any> => {
            return this.put(API_ENDPOINTS.EMPLOYEES.BY_ID(id), data);
        },
        delete: async (id: string): Promise<any> => {
            return this.delete(API_ENDPOINTS.EMPLOYEES.BY_ID(id));
        },
    };

    /**
     * Roles
     */
    public roles = {
        getAll: async (): Promise<any[]> => {
            return this.get(API_ENDPOINTS.ROLES.BASE);
        },
        getById: async (id: string): Promise<any> => {
            return this.get(API_ENDPOINTS.ROLES.BY_ID(id));
        },
        create: async (data: any): Promise<any> => {
            return this.post(API_ENDPOINTS.ROLES.BASE, data);
        },
        update: async (id: string, data: any): Promise<any> => {
            return this.put(API_ENDPOINTS.ROLES.BY_ID(id), data);
        },
        delete: async (id: string): Promise<any> => {
            return this.delete(API_ENDPOINTS.ROLES.BY_ID(id));
        },
    };

    /**
     * Exportación de datos
     */
    public export = {
        menu: async (): Promise<Blob> => {
            const response = await this.fetchWithTimeout(
                `${this.baseURL}/export/menu`,
                {
                    method: 'GET',
                    headers: {
                        ...DEFAULT_HEADERS,
                        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
                    }
                }
            );
            if (!response.ok) throw new Error('Error al exportar menú');
            return response.blob();
        },
        clients: async (): Promise<Blob> => {
            const response = await this.fetchWithTimeout(
                `${this.baseURL}/export/clients`,
                {
                    method: 'GET',
                    headers: {
                        ...DEFAULT_HEADERS,
                        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
                    }
                }
            );
            if (!response.ok) throw new Error('Error al exportar clientes');
            return response.blob();
        },
        bills: async (): Promise<Blob> => {
            const response = await this.fetchWithTimeout(
                `${this.baseURL}/export/bills`,
                {
                    method: 'GET',
                    headers: {
                        ...DEFAULT_HEADERS,
                        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
                    }
                }
            );
            if (!response.ok) throw new Error('Error al exportar facturas');
            return response.blob();
        },
        orders: async (): Promise<Blob> => {
            const response = await this.fetchWithTimeout(
                `${this.baseURL}/export/orders`,
                {
                    method: 'GET',
                    headers: {
                        ...DEFAULT_HEADERS,
                        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
                    }
                }
            );
            if (!response.ok) throw new Error('Error al exportar órdenes');
            return response.blob();
        }
    };

    /**
     * Auditoría del sistema (solo admin)
     */
    public audit = {
        getDocumentHistory: async (collection: string, documentId: string): Promise<any> => {
            return this.get(`/audit/history/${collection}/${documentId}`);
        },
        getDeletedDocuments: async (since?: string, collection?: string): Promise<any> => {
            const params = new URLSearchParams();
            if (since) params.append('since', since);
            if (collection) params.append('collection', collection);
            const query = params.toString() ? `?${params}` : '';
            return this.get(`/audit/deleted${query}`);
        },
        getUserActivity: async (userId: string, limit?: number): Promise<any> => {
            const params = new URLSearchParams();
            if (limit) params.append('limit', limit.toString());
            const query = params.toString() ? `?${params}` : '';
            return this.get(`/audit/user/${userId}${query}`);
        },
        getStats: async (since?: string): Promise<any> => {
            const params = new URLSearchParams();
            if (since) params.append('since', since);
            const query = params.toString() ? `?${params}` : '';
            return this.get(`/audit/stats${query}`);
        }
    };

    /**
     * Categorías de productos
     */
    public categories = {
        getAll: async (params?: {
            productType?: 'menu' | 'retail';
            visibleOnWebsite?: boolean;
            includeProductCount?: boolean;
        }): Promise<any> => {
            const queryParams = new URLSearchParams();
            if (params?.productType) queryParams.append('productType', params.productType);
            if (params?.visibleOnWebsite !== undefined) queryParams.append('visibleOnWebsite', params.visibleOnWebsite.toString());
            if (params?.includeProductCount) queryParams.append('includeProductCount', 'true');

            const url = queryParams.toString()
                ? `${API_ENDPOINTS.CATEGORIES.BASE}?${queryParams}`
                : API_ENDPOINTS.CATEGORIES.BASE;
            return this.get(url);
        },
        getById: async (id: string): Promise<any> => {
            return this.get(API_ENDPOINTS.CATEGORIES.BY_ID(id));
        },
        create: async (data: any): Promise<any> => {
            return this.post(API_ENDPOINTS.CATEGORIES.BASE, data);
        },
        update: async (id: string, data: any): Promise<any> => {
            return this.put(API_ENDPOINTS.CATEGORIES.BY_ID(id), data);
        },
        delete: async (id: string): Promise<any> => {
            return this.delete(API_ENDPOINTS.CATEGORIES.BY_ID(id));
        },
        reorder: async (items: { id: string; sortOrder: number }[]): Promise<any> => {
            return this.patch(API_ENDPOINTS.CATEGORIES.REORDER, { items });
        },
    };

    /**
     * Backups de base de datos
     */
    public backup = {
        list: async (): Promise<any> => {
            return this.get('/backups');
        },
        create: async (): Promise<any> => {
            return this.post('/backups', {});
        },
        download: async (id: string): Promise<Blob> => {
            const response = await fetch(
                `${this.baseURL}/backups/${id}/download`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${this.getToken()}`,
                    },
                }
            );
            if (!response.ok) throw new Error('Error al descargar backup');
            return response.blob();
        },
        delete: async (id: string): Promise<any> => {
            return this.delete(`/backups/${id}`);
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
    billing: apiService.billing,
    employees: apiService.employees,
    roles: apiService.roles,
    categories: apiService.categories,
    export: apiService.export,
    audit: apiService.audit,
    backup: apiService.backup,
    getToken: () => apiService.getToken(),
    setToken: (token: string | null) => apiService.setToken(token),
};
