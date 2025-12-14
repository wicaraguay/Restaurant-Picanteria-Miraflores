/**
 * @file CreateEmployee.ts
 * @description Caso de uso para crear un nuevo empleado
 * 
 * @purpose
 * Crea un nuevo empleado con validaciones de rol y username único.
 * Hashea la contraseña antes de guardar.
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
import { ValidationError } from '../../domain/errors/CustomErrors';
import bcrypt from 'bcryptjs';

export class CreateEmployee {
    constructor(
        private employeeRepository: IEmployeeRepository,
        private roleRepository: IRoleRepository
    ) { }

    async execute(employeeData: Employee): Promise<Employee> {
        // Validar que el rol exista
        const role = await this.roleRepository.findById(employeeData.roleId);
        if (!role) {
            throw new ValidationError('Role does not exist');
        }

        // Validar username único
        const existing = await this.employeeRepository.findByUsername(employeeData.username);
        if (existing) {
            throw new ValidationError('Username already exists');
        }

        // Validar que tenga password
        if (!employeeData.password) {
            throw new ValidationError('Password is required');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(employeeData.password, 10);
        const employeeToCreate = {
            ...employeeData,
            password: hashedPassword
        };

        const created = await this.employeeRepository.create(employeeToCreate);

        // Remover password del resultado
        const { password, ...rest } = created;
        return rest as Employee;
    }
}
