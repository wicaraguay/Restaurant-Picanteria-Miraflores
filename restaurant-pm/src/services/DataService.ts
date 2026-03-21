/**
 * @file DataService.ts
 * @description Servicio de datos (Repository Pattern + Singleton)
 * 
 * @purpose
 * Centraliza todas las operaciones de datos de la aplicación.
 * Implementa Repository Pattern para abstraer acceso a datos.
 * Proporciona caché y fallback a datos por defecto.
 * 
 * @connections
 * - Usa: api.ts (ApiService)
 * - Usa: DataFactory (services/factories)
 * - Usa: logger (utils/logger)
 * - Usado por: Componentes y Contexts
 * 
 * @layer Services - Repository Pattern + Singleton
 */

import { api } from '../api';
import { DataFactory } from './factories/DataFactory';
import { logger } from '../utils/logger';
import { RestaurantConfig } from '../types';
import { Customer } from '../modules/customers/types/customer.types';
import { Bill } from '../modules/billing/types/billing.types';
import { Order } from '../modules/orders/types/order.types';
import { MenuItem } from '../modules/menu/types/menu.types';
import { orderService } from '../modules/orders/services/OrderService';
import { menuService } from '../modules/menu/services/MenuService';
import { Employee, Role } from '../modules/hr/types/hr.types';

/**
 * DataService - Singleton para gestión de datos
 * Implementa Repository Pattern
 */
export class DataService {
    private static instance: DataService;

    // Caché simple en memoria
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

    private constructor() {
        logger.info('DataService initialized');
    }

    /**
     * Obtiene la instancia única (Singleton Pattern)
     */
    public static getInstance(): DataService {
        if (!DataService.instance) {
            DataService.instance = new DataService();
        }
        return DataService.instance;
    }

    /**
     * Verifica si el caché es válido
     */
    private isCacheValid(key: string): boolean {
        const cached = this.cache.get(key);
        if (!cached) return false;

        const age = Date.now() - cached.timestamp;
        return age < this.CACHE_TTL;
    }

    /**
     * Obtiene datos del caché
     */
    private getFromCache<T>(key: string): T | null {
        if (this.isCacheValid(key)) {
            logger.debug(`Cache hit for ${key}`);
            return this.cache.get(key)!.data as T;
        }
        return null;
    }

    /**
     * Guarda datos en caché
     */
    private saveToCache<T>(key: string, data: T): void {
        this.cache.set(key, { data, timestamp: Date.now() });
        logger.debug(`Cached data for ${key}`);
    }

    /**
     * Limpia el caché
     */
    public clearCache(): void {
        this.cache.clear();
        logger.info('Cache cleared');
    }

    /**
     * Obtiene todos los clientes
     */
    public async getCustomers(): Promise<Customer[]> {
        const cacheKey = 'customers';
        const cached = this.getFromCache<Customer[]>(cacheKey);
        if (cached) return cached;

        try {
            logger.debug('Fetching customers from API');
            const response = await api.customers.getAll();
            
            // Handle new API response format { success: true, data: { data: Customer[], pagination: ... } }
            // or the simplified { success: true, data: Customer[] }
            let data: Customer[] = [];
            
            if (response && response.data) {
                data = Array.isArray(response.data) ? response.data : (response.data.data || []);
            } else {
                data = Array.isArray(response) ? response : [];
            }

            this.saveToCache(cacheKey, data);
            return data;
        } catch (error) {
            logger.warn('Failed to fetch customers, returning empty array', error);
            return [];
        }
    }

    /**
     * Crea un nuevo cliente
     */
    public async createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
        try {
            logger.info('Creating customer', { name: customer.name });
            const created = await api.customers.create(customer);
            this.clearCache(); // Invalidar caché
            return created;
        } catch (error) {
            logger.error('Failed to create customer', error);
            throw error;
        }
    }

    /**
     * Actualiza un cliente existente
     */
    public async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
        try {
            logger.info('Updating customer', { id, name: updates.name });
            const updated = await api.customers.update(id, updates);
            this.clearCache();
            return updated;
        } catch (error) {
            logger.error('Failed to update customer', error);
            throw error;
        }
    }

    /**
     * Elimina un cliente
     */
    public async deleteCustomer(id: string): Promise<void> {
        try {
            logger.info('Deleting customer', { id });
            await api.customers.delete(id);
            this.clearCache();
        } catch (error) {
            logger.error('Failed to delete customer', error);
            throw error;
        }
    }

    /**
     * Obtiene todas las órdenes
     */
    public async getOrders(): Promise<Order[]> {
        const cacheKey = 'orders';
        const cached = this.getFromCache<Order[]>(cacheKey);
        if (cached) return cached;

        try {
            logger.debug('Fetching orders from API');
            const response = await orderService.getAll();
            // Handle paginated response
            const data = Array.isArray(response) ? response : response.data || [];
            this.saveToCache(cacheKey, data);
            return data;
        } catch (error) {
            logger.warn('Failed to fetch orders, returning empty array', error);
            return [];
        }
    }

    /**
     * Crea una nueva orden
     */
    public async createOrder(order: Order): Promise<Order> {
        try {
            logger.info('Creating order', { customerName: order.customerName });
            const created = await orderService.create(order);
            this.clearCache();
            return created;
        } catch (error) {
            logger.error('Failed to create order', error);
            throw error;
        }
    }

    /**
     * Actualiza una orden
     */
    public async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
        try {
            logger.info('Updating order', { id, updates });
            const updated = await orderService.update(id, updates);
            this.clearCache();
            return updated;
        } catch (error) {
            logger.error('Failed to update order', error);
            throw error;
        }
    }

    /**
     * Elimina una orden
     */
    public async deleteOrder(id: string): Promise<void> {
        try {
            logger.info('Deleting order', { id });
            await orderService.delete(id);
            this.clearCache();
        } catch (error) {
            logger.error('Failed to delete order', error);
            throw error;
        }
    }

    /**
     * Obtiene el menú
     */
    public async getMenu(): Promise<MenuItem[]> {
        const cacheKey = 'menu';
        const cached = this.getFromCache<MenuItem[]>(cacheKey);
        if (cached) return cached;

        try {
            logger.debug('Fetching menu from API');
            const data = await menuService.getAll();
            this.saveToCache(cacheKey, data);
            return data;
        } catch (error) {
            logger.warn('Failed to fetch menu, returning empty array', error);
            return [];
        }
    }

    /**
     * Obtiene todas las facturas
     */
    public async getBills(): Promise<Bill[]> {
        const cacheKey = 'bills';
        const cached = this.getFromCache<Bill[]>(cacheKey);
        if (cached) return cached;

        try {
            logger.debug('Fetching bills from API');
            const response = await api.bills.getAll();
            // Handle paginated response
            const data = Array.isArray(response) ? response : response.data || [];
            this.saveToCache(cacheKey, data);
            return data;
        } catch (error) {
            logger.warn('Failed to fetch bills, returning empty array', error);
            return [];
        }
    }

    /**
     * Crea una nueva factura
     */
    public async createBill(bill: Bill): Promise<Bill> {
        try {
            logger.info('Creating bill', { documentNumber: bill.documentNumber });
            const created = await api.bills.create(bill);
            this.clearCache();
            return created;
        } catch (error) {
            logger.error('Failed to create bill', error);
            throw error;
        }
    }

    /**
     * Obtiene la configuración del restaurante
     */
    public async getConfig(): Promise<RestaurantConfig | null> {
        const cacheKey = 'config';
        const cached = this.getFromCache<RestaurantConfig>(cacheKey);
        if (cached) return cached;

        try {
            logger.debug('Fetching config from API');
            const data = await api.config.get();
            this.saveToCache(cacheKey, data);
            return data;
        } catch (error) {
            logger.warn('Failed to fetch config', error);
            return null;
        }
    }

    /**
     * Actualiza la configuración del restaurante
     */
    public async updateConfig(config: Partial<RestaurantConfig>): Promise<RestaurantConfig> {
        try {
            logger.info('Updating config');
            const updated = await api.config.update(config);
            this.clearCache();
            return updated;
        } catch (error) {
            logger.error('Failed to update config', error);
            throw error;
        }
    }

    /**
     * Obtiene todos los empleados
     */
    public async getEmployees(): Promise<Employee[]> {
        const cacheKey = 'employees';
        const cached = this.getFromCache<Employee[]>(cacheKey);
        if (cached) return cached;

        try {
            logger.debug('Fetching employees from API');
            const data = await api.employees.getAll();
            this.saveToCache(cacheKey, data);
            return data;
        } catch (error) {
            logger.warn('Failed to fetch employees, returning empty array', error);
            return [];
        }
    }

    /**
     * Obtiene todos los roles
     */
    public async getRoles(): Promise<Role[]> {
        const cacheKey = 'roles';
        const cached = this.getFromCache<Role[]>(cacheKey);
        if (cached) return cached;

        try {
            logger.debug('Fetching roles from API');
            const data = await api.roles.getAll();
            this.saveToCache(cacheKey, data);
            return data;
        } catch (error) {
            logger.warn('Failed to fetch roles, returning empty array', error);
            return [];
        }
    }

    /**
     * Carga todos los datos iniciales
     */
    public async loadAllData(): Promise<{
        customers: Customer[];
        orders: Order[];
        menu: MenuItem[];
        bills: Bill[];
        employees: Employee[];
        roles: Role[];
        config: RestaurantConfig | null;
    }> {
        logger.info('Loading all initial data');

        const [customers, orders, menu, bills, config, employees, roles] = await Promise.all([
            this.getCustomers(),
            this.getOrders(),
            this.getMenu(),
            this.getBills(),
            this.getConfig(),
            this.getEmployees(),
            this.getRoles()
        ]);

        logger.info('All initial data loaded successfully');

        return { customers, orders, menu, bills, config, employees, roles };
    }
}

// Exportar instancia singleton
export const dataService = DataService.getInstance();
export default dataService;

