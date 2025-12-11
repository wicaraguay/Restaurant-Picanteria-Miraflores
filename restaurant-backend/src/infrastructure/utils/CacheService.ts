/**
 * @file CacheService.ts
 * @description Servicio de caché en memoria para datos estáticos
 * 
 * @purpose
 * Implementa un sistema de caché simple en memoria para reducir consultas
 * a la base de datos en datos que raramente cambian (menú, configuración).
 * 
 * @layer Infrastructure - Utilities
 */

import { logger } from './Logger';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

/**
 * Servicio de caché en memoria con TTL (Time To Live)
 */
export class CacheService {
    private static instance: CacheService;
    private cache: Map<string, CacheEntry<any>>;

    private constructor() {
        this.cache = new Map();
        logger.info('CacheService initialized');

        // Limpiar cache expirado cada 5 minutos
        setInterval(() => this.cleanExpiredEntries(), 5 * 60 * 1000);
    }

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    /**
     * Obtener valor del caché
     * @param key - Clave del caché
     * @returns Valor o null si no existe o expiró
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            logger.debug(`Cache miss: ${key}`);
            return null;
        }

        const now = Date.now();
        const age = now - entry.timestamp;

        if (age > entry.ttl) {
            logger.debug(`Cache expired: ${key} (age: ${age}ms, ttl: ${entry.ttl}ms)`);
            this.cache.delete(key);
            return null;
        }

        logger.debug(`Cache hit: ${key} (age: ${age}ms)`);
        return entry.data as T;
    }

    /**
     * Guardar valor en el caché
     * @param key - Clave del caché
     * @param data - Datos a cachear
     * @param ttl - Tiempo de vida en milisegundos (default: 5 minutos)
     */
    set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
        logger.debug(`Cache set: ${key} (ttl: ${ttl}ms)`);
    }

    /**
     * Invalidar entrada del caché
     * @param key - Clave a invalidar
     */
    invalidate(key: string): void {
        const deleted = this.cache.delete(key);
        if (deleted) {
            logger.debug(`Cache invalidated: ${key}`);
        }
    }

    /**
     * Invalidar todas las entradas que coincidan con un patrón
     * @param pattern - Patrón regex o string
     */
    invalidatePattern(pattern: string | RegExp): void {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        let count = 0;

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }

        logger.info(`Cache invalidated ${count} entries matching pattern: ${pattern}`);
    }

    /**
     * Limpiar todo el caché
     */
    clear(): void {
        const size = this.cache.size;
        this.cache.clear();
        logger.info(`Cache cleared: ${size} entries removed`);
    }

    /**
     * Limpiar entradas expiradas
     */
    private cleanExpiredEntries(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            const age = now - entry.timestamp;
            if (age > entry.ttl) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`Cache cleanup: ${cleaned} expired entries removed`);
        }
    }

    /**
     * Obtener estadísticas del caché
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * Wrapper para obtener o generar datos cacheados
     * @param key - Clave del caché
     * @param generator - Función para generar datos si no están en caché
     * @param ttl - Tiempo de vida en milisegundos
     */
    async getOrSet<T>(
        key: string,
        generator: () => Promise<T>,
        ttl: number = 5 * 60 * 1000
    ): Promise<T> {
        const cached = this.get<T>(key);

        if (cached !== null) {
            return cached;
        }

        logger.debug(`Generating cache entry: ${key}`);
        const data = await generator();
        this.set(key, data, ttl);
        return data;
    }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();
