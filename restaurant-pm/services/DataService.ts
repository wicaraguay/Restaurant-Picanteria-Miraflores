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
import { Customer, Order, MenuItem, Bill, RestaurantConfig } from '../types';

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
            // Handle paginated response
            const data = Array.isArray(response) ? response : response.data || [];
            this.saveToCache(cacheKey, data);
            return data;
        } catch (error) {
            logger.warn('Failed to fetch customers, using fallback', error);
            return DataFactory.createDefaultCustomers();
        }
    }

    /**
     * Crea un nuevo cliente
     */
    public async createCustomer(customer: Customer): Promise<Customer> {
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
     * Obtiene todas las órdenes
     */
    public async getOrders(): Promise<Order[]> {
        const cacheKey = 'orders';
        const cached = this.getFromCache<Order[]>(cacheKey);
        if (cached) return cached;

        try {
            logger.debug('Fetching orders from API');
            const response = await api.orders.getAll();
            // Handle paginated response
            const data = Array.isArray(response) ? response : response.data || [];
            this.saveToCache(cacheKey, data);
            return data;
        } catch (error) {
            logger.warn('Failed to fetch orders, using fallback', error);
            return DataFactory.createDefaultOrders();
        }
    }

    /**
     * Crea una nueva orden
     */
    public async createOrder(order: Order): Promise<Order> {
        try {
            logger.info('Creating order', { customerName: order.customerName });
            const created = await api.orders.create(order);
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
            const updated = await api.orders.update(id, updates);
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
            await api.orders.delete(id);
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
            const data = await api.menu.getAll();
            this.saveToCache(cacheKey, data);
            return data;
        } catch (error) {
            logger.warn('Failed to fetch menu, using fallback', error);
            return DataFactory.createDefaultMenuItems();
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
            logger.warn('Failed to fetch bills, using fallback', error);
            return DataFactory.createDefaultBills();
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
     * Carga todos los datos iniciales
     */
    public async loadAllData(): Promise<{
        customers: Customer[];
        orders: Order[];
        menu: MenuItem[];
        bills: Bill[];
        config: RestaurantConfig | null;
    }> {
        logger.info('Loading all initial data');

        const [customers, orders, menu, bills, config] = await Promise.all([
            this.getCustomers(),
            this.getOrders(),
            this.getMenu(),
            this.getBills(),
            this.getConfig()
        ]);

        logger.info('All initial data loaded successfully');

        return { customers, orders, menu, bills, config };
    }
}

// Exportar instancia singleton
export const dataService = DataService.getInstance();
