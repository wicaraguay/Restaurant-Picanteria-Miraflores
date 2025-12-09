/**
 * @file IMenuRepository.ts
 * @description Interfaz del repositorio de menú (Domain Layer)
 * 
 * @purpose
 * Define el contrato para operaciones CRUD de items del menú.
 * 
 * @connections
 * - Implementado por: MongoMenuRepository (infrastructure/repositories)
 * - Usa: MenuItem entity (domain/entities)
 * - Usado por: GetMenu use case (application/use-cases)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Domain - Define contratos sin implementación
 */

import { MenuItem } from '../entities/MenuItem';

export interface IMenuRepository {
    create(item: MenuItem): Promise<MenuItem>;
    findById(id: string): Promise<MenuItem | null>;
    findAll(): Promise<MenuItem[]>;
    update(id: string, item: Partial<MenuItem>): Promise<MenuItem | null>;
    delete(id: string): Promise<boolean>;
}
