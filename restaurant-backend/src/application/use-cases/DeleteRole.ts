/**
 * @file DeleteRole.ts
 * @description Caso de uso para eliminar un rol
 * 
 * @purpose
 * Elimina un rol del sistema con validaciones de seguridad.
 * Previene eliminación de roles del sistema y roles en uso.
 * 
 * @connections
 * - Usa: IRoleRepository (domain/repositories)
 * - Usa: IEmployeeRepository (domain/repositories)
 * - Usado por: roleRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Application - Lógica de negocio
 */

import { IRoleRepository } from '../../domain/repositories/IRoleRepository';
import { IEmployeeRepository } from '../../domain/repositories/IEmployeeRepository';
import { ValidationError, NotFoundError } from '../../domain/errors/CustomErrors';

export class DeleteRole {
    constructor(
        private roleRepository: IRoleRepository,
        private employeeRepository: IEmployeeRepository
    ) { }

    async execute(id: string): Promise<void> {
        // Verificar que el rol existe
        const role = await this.roleRepository.findById(id);
        if (!role) {
            throw new NotFoundError('Role not found');
        }

        // Proteger roles del sistema
        if (role.isSystem) {
            throw new ValidationError('Cannot delete system role');
        }

        // Verificar que no haya empleados con este rol
        const employees = await this.employeeRepository.findAll();
        const hasEmployees = employees.some(emp => emp.roleId === id);

        if (hasEmployees) {
            throw new ValidationError('Cannot delete role that is assigned to employees');
        }

        const deleted = await this.roleRepository.delete(id);
        if (!deleted) {
            throw new NotFoundError('Role not found during deletion');
        }
    }
}
