/**
 * @file IRestaurantConfigRepository.ts
 * @description Interfaz del repositorio de configuración del restaurante (Domain Layer)
 * 
 * @purpose
 * Define el contrato para operaciones de configuración global del restaurante.
 * Implementa patrón Singleton (solo una configuración por restaurante).
 * 
 * @connections
 * - Implementado por: MongoRestaurantConfigRepository (infrastructure/repositories)
 * - Usa: RestaurantConfig entity (domain/entities)
 * - Usado por: GetRestaurantConfig, UpdateRestaurantConfig (application/use-cases)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Domain - Define contratos sin implementación
 */

import { RestaurantConfig } from '../entities/RestaurantConfig';

export interface IRestaurantConfigRepository {
    get(): Promise<RestaurantConfig | null>;
    update(config: Partial<RestaurantConfig>): Promise<RestaurantConfig>;
    getOrCreate(): Promise<RestaurantConfig>;

    /**
     * Atomically retrieves and increments the sequential number for invoices.
     * This method is thread-safe and ensures unique sequential numbers.
     * @returns The next sequential number to use for invoice generation
     */
    getNextSequential(): Promise<number>;
    getNextCreditNoteSequential(): Promise<number>;

    /**
     * Devuelve el ambiente SRI activo — FUENTE ÚNICA DE VERDAD.
     * Prioridad: sriCertificate.environment (BD, configurable desde la UI)
     *          > process.env.SRI_ENV > '1' (Pruebas).
     * Todos los flujos de emisión/verificación deben usar este método, nunca
     * leer process.env.SRI_ENV directamente.
     * @returns '1' (Pruebas) | '2' (Producción)
     */
    getEnvironment(): Promise<'1' | '2'>;
}
