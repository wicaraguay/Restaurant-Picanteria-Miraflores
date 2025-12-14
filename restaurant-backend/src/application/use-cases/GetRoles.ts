/**
 * @file GetRoles.ts
 * @description Caso de uso para obtener todos los roles
 * 
 * @purpose
 * Obtiene la lista completa de roles del sistema.
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

export class GetRoles {
    constructor(private roleRepository: IRoleRepository) { }

    async execute(): Promise<Role[]> {
        return this.roleRepository.findAll();
    }
}
