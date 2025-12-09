/**
 * ValidateSession Use Case
 * 
 * Valida que un token JWT sea válido y que el sessionId coincida
 * con el almacenado en la base de datos (para sesión única).
 */

import { IEmployeeRepository } from '../../domain/repositories/IEmployeeRepository';
import { Employee } from '../../domain/entities/Employee';
import { JWTService, JWTPayload } from '../../infrastructure/utils/JWTService';
import { logger } from '../../infrastructure/utils/Logger';

export class ValidateSession {
    constructor(private employeeRepository: IEmployeeRepository) { }

    async execute(token: string): Promise<Employee | null> {
        // Verificar token JWT
        const payload: JWTPayload | null = JWTService.verifyToken(token);
        if (!payload) {
            logger.warn('Invalid or expired token');
            return null;
        }

        // Buscar usuario en la base de datos
        const employee = await this.employeeRepository.findById(payload.userId);
        if (!employee) {
            logger.warn('User not found', { userId: payload.userId });
            return null;
        }

        // Verificar que el sessionId coincida (sesión única)
        if (employee.activeSessionId !== payload.sessionId) {
            logger.warn('Session ID mismatch - user logged in elsewhere', {
                userId: payload.userId,
                expectedSessionId: employee.activeSessionId,
                providedSessionId: payload.sessionId
            });
            return null;
        }

        logger.info('Session validated successfully', { userId: employee.id });

        // No retornar password
        const { password: _, ...userWithoutPassword } = employee;
        return userWithoutPassword as Employee;
    }
}
