/**
 * @file CreateRole.ts
 * @description Caso de uso para crear un nuevo rol
 * 
 * @purpose
 * Crea un nuevo rol en el sistema con validación de nombre único.
 * 
 * @connections
 * - Usa: IRoleRepository (domain/repositories)
 * - Usa: Role entity (domain/entities)
 * - Usado por: roleRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Application - Lógica de negocio
 */

import { IRoleRepository } from '../../domain/repositories/IRoleRepository';
import { Role } from '../../domain/entities/Role';
import { ValidationError } from '../../domain/errors/CustomErrors';

export class CreateRole {
    constructor(private roleRepository: IRoleRepository) { }

    async execute(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
        // Validar que no exista rol con el mismo nombre
        const existing = await this.roleRepository.findByName(roleData.name);
        if (existing) {
            throw new ValidationError('Role with this name already exists');
        }

        const role: Role = {
            id: '', // MongoDB generará el ID
            ...roleData
        };

        return this.roleRepository.create(role);
    }
}
