/**
 * @file UpdateRole.ts
 * @description Caso de uso para actualizar un rol existente
 * 
 * @purpose
 * Actualiza un rol existente con validaciones de sistema.
 * Protege roles del sistema de modificaciones no permitidas.
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
import { ValidationError, NotFoundError } from '../../domain/errors/CustomErrors';

export class UpdateRole {
    constructor(private roleRepository: IRoleRepository) { }

    async execute(id: string, roleData: Partial<Role>): Promise<Role> {
        // Verificar que el rol existe
        const existing = await this.roleRepository.findById(id);
        if (!existing) {
            throw new NotFoundError('Role not found');
        }

        // Proteger roles del sistema
        if (existing.isSystem && roleData.name) {
            throw new ValidationError('Cannot change name of system role');
        }

        // Si se está cambiando el nombre, validar que no exista otro con ese nombre
        if (roleData.name && roleData.name !== existing.name) {
            const duplicate = await this.roleRepository.findByName(roleData.name);
            if (duplicate) {
                throw new ValidationError('Role with this name already exists');
            }
        }

        const updated = await this.roleRepository.update(id, roleData);
        if (!updated) {
            throw new NotFoundError('Role not found after update');
        }

        return updated;
    }
}
