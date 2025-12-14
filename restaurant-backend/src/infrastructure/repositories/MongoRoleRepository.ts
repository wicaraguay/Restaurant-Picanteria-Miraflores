/**
 * @file MongoRoleRepository.ts
 * @description Implementación MongoDB del repositorio de roles
 * 
 * @purpose
 * Implementa IRoleRepository usando MongoDB como base de datos.
 * Extiende BaseRepository para heredar operaciones CRUD comunes.
 * Implementa método específico findByName para validaciones.
 * 
 * @connections
 * - Implementa: IRoleRepository (domain/repositories)
 * - Extiende: BaseRepository (infrastructure/repositories)
 * - Usa: RoleSchema (infrastructure/database/schemas)
 * - Usa: Role entity (domain/entities)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Infrastructure - Implementación específica de MongoDB
 */

import { IRoleRepository } from '../../domain/repositories/IRoleRepository';
import { Role } from '../../domain/entities/Role';
import { RoleModel } from '../database/schemas/RoleSchema';
import { BaseRepository } from './BaseRepository';
import { logger } from '../utils/Logger';

export class MongoRoleRepository extends BaseRepository<Role> implements IRoleRepository {
    constructor() {
        super(RoleModel, 'Role');
    }

    async findByName(name: string): Promise<Role | null> {
        try {
            logger.debug('Finding role by name', { name });
            const found = await RoleModel.findOne({ name });
            return found ? this.mapToEntity(found) : null;
        } catch (error) {
            logger.error('Failed to find role by name', error);
            throw error;
        }
    }

    protected mapToEntity(doc: any): Role {
        return {
            id: doc.id || doc._id.toString(),
            name: doc.name,
            permissions: doc.permissions instanceof Map
                ? Object.fromEntries(doc.permissions)
                : doc.permissions,
            isSystem: doc.isSystem,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
        };
    }
}
