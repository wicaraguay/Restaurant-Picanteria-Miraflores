/**
 * @file GetEmployees.ts
 * @description Caso de uso para obtener todos los empleados
 * 
 * @purpose
 * Obtiene la lista completa de empleados sin exponer passwords.
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

export class GetEmployees {
    constructor(private employeeRepository: IEmployeeRepository) { }

    async execute(): Promise<Employee[]> {
        const employees = await this.employeeRepository.findAll();

        // Remover passwords antes de retornar por seguridad
        return employees.map(emp => {
            const { password, ...rest } = emp;
            return rest as Employee;
        });
    }
}
