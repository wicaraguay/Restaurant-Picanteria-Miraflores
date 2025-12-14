/**
 * @file GetEmployee.ts
 * @description Caso de uso para obtener un empleado por ID
 * 
 * @purpose
 * Obtiene un empleado específico sin exponer su password.
 * 
 * @connections
 * - Usa: IEmployeeRepository (domain/repositories)
 * - Usa: Employee entity (domain/entities)
 * - Usado por: employeeRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Application - Lógica de negocio
 */

import { IEmployeeRepository } from '../../domain/repositories/IEmployeeRepository';
import { Employee } from '../../domain/entities/Employee';
import { NotFoundError } from '../../domain/errors/CustomErrors';

export class GetEmployee {
    constructor(private employeeRepository: IEmployeeRepository) { }

    async execute(id: string): Promise<Employee> {
        const employee = await this.employeeRepository.findById(id);

        if (!employee) {
            throw new NotFoundError('Employee not found');
        }

        // Remover password por seguridad
        const { password, ...rest } = employee;
        return rest as Employee;
    }
}
