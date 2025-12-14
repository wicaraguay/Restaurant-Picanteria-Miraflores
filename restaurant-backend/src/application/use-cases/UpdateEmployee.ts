/**
 * @file UpdateEmployee.ts
 * @description Caso de uso para actualizar un empleado existente
 * 
 * @purpose
 * Actualiza un empleado con validaciones de rol y username.
 * Hashea nueva contraseña si se proporciona.
 * 
 * @connections
 * - Usa: IEmployeeRepository (domain/repositories)
 * - Usa: IRoleRepository (domain/repositories)
 * - Usa: Employee entity (domain/entities)
 * - Usado por: employeeRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Application - Lógica de negocio
 */

import { IEmployeeRepository } from '../../domain/repositories/IEmployeeRepository';
import { IRoleRepository } from '../../domain/repositories/IRoleRepository';
import { Employee } from '../../domain/entities/Employee';
import { ValidationError, NotFoundError } from '../../domain/errors/CustomErrors';
import bcrypt from 'bcryptjs';

export class UpdateEmployee {
    constructor(
        private employeeRepository: IEmployeeRepository,
        private roleRepository: IRoleRepository
    ) { }

    async execute(id: string, employeeData: Partial<Employee>): Promise<Employee> {
        // Verificar que el empleado existe
        const existing = await this.employeeRepository.findById(id);
        if (!existing) {
            throw new NotFoundError('Employee not found');
        }

        // Si se está cambiando el rol, validar que exista
        if (employeeData.roleId && employeeData.roleId !== existing.roleId) {
            const role = await this.roleRepository.findById(employeeData.roleId);
            if (!role) {
                throw new ValidationError('Role does not exist');
            }
        }

        // Si se está cambiando el username, validar que sea único
        if (employeeData.username && employeeData.username !== existing.username) {
            const duplicate = await this.employeeRepository.findByUsername(employeeData.username);
            if (duplicate) {
                throw new ValidationError('Username already exists');
            }
        }

        // Si se proporciona nueva contraseña, hashearla
        if (employeeData.password) {
            employeeData.password = await bcrypt.hash(employeeData.password, 10);
        }

        const updated = await this.employeeRepository.update(id, employeeData);
        if (!updated) {
            throw new NotFoundError('Employee not found after update');
        }

        // Remover password del resultado
        const { password, ...rest } = updated;
        return rest as Employee;
    }
}
