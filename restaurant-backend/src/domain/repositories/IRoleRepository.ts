/**
 * @file IRoleRepository.ts
 * @description Interfaz del repositorio de roles (Domain Layer)
 * 
 * @purpose
 * Define el contrato para operaciones CRUD de roles incluyendo búsqueda
 * por nombre para validaciones de unicidad.
 * 
 * @connections
 * - Implementado por: MongoRoleRepository (infrastructure/repositories)
 * - Usa: Role entity (domain/entities)
 * - Usado por: CreateRole, GetRoles, UpdateRole, DeleteRole use cases
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Domain - Define contratos sin implementación
 */

import { Role } from '../entities/Role';

export interface IRoleRepository {
    findById(id: string): Promise<Role | null>;
    findAll(): Promise<Role[]>;
    create(role: Role): Promise<Role>;
    update(id: string, role: Partial<Role>): Promise<Role | null>;
    delete(id: string): Promise<boolean>;
    findByName(name: string): Promise<Role | null>;
}
