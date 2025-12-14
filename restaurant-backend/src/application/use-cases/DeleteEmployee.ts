/**
 * @file DeleteEmployee.ts
 * @description Caso de uso para eliminar un empleado
 * 
 * @purpose
 * Elimina un empleado del sistema.
 * Puede incluir validaciones adicionales como verificar órdenes activas.
 * 
 * @connections
 * - Usa: IEmployeeRepository (domain/repositories)
 * - Usado por: employeeRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Application - Lógica de negocio
 */

import { IEmployeeRepository } from '../../domain/repositories/IEmployeeRepository';
import { NotFoundError } from '../../domain/errors/CustomErrors';

export class DeleteEmployee {
    constructor(private employeeRepository: IEmployeeRepository) { }

    async execute(id: string): Promise<void> {
        // Verificar que el empleado existe
        const employee = await this.employeeRepository.findById(id);
        if (!employee) {
            throw new NotFoundError('Employee not found');
        }

        const deleted = await this.employeeRepository.delete(id);
        if (!deleted) {
            throw new NotFoundError('Employee not found during deletion');
        }
    }
}
