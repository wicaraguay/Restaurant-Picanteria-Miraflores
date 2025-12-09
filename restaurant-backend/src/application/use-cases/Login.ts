/**
 * @file Login.ts
 * @description Caso de uso para autenticación de empleados
 * 
 * @purpose
 * Maneja el proceso de login: valida credenciales, genera JWT token y sessionId,
 * actualiza sesión en BD. Retorna usuario sin password.
 * 
 * @connections
 * - Usa: IEmployeeRepository (domain/repositories)
 * - Usa: Employee entity (domain/entities)
 * - Usa: JWTService (infrastructure/utils)
 * - Usa: Logger (infrastructure/utils)
 * - Usado por: authRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Application - Lógica de negocio
 */

import { IEmployeeRepository } from '../../domain/repositories/IEmployeeRepository';
import { Employee } from '../../domain/entities/Employee';
import { JWTService } from '../../infrastructure/utils/JWTService';
import { logger } from '../../infrastructure/utils/Logger';

export interface LoginResponse {
    user: Employee;
    token: string;
    sessionId: string;
}

export class Login {
    constructor(private employeeRepository: IEmployeeRepository) { }

    async execute(username: string, password?: string): Promise<LoginResponse | null> {
        const employee = await this.employeeRepository.findByUsername(username);
        if (!employee) return null;

        // TODO: In production, verify hashed password. For now comparing plain text as per prototype.
        if (employee.password === password) {
            // Generar sessionId único
            const sessionId = JWTService.generateSessionId();

            // Generar JWT token
            const token = JWTService.generateToken({
                userId: employee.id,
                username: employee.username,
                roleId: employee.roleId,
                sessionId: sessionId
            });

            // Actualizar sesión en la base de datos
            await this.employeeRepository.updateSession(employee.id, sessionId, new Date());

            logger.info('User logged in successfully', { userId: employee.id, sessionId });

            // No retornar password en la respuesta
            const { password: _, ...userWithoutPassword } = employee;

            return {
                user: { ...userWithoutPassword, activeSessionId: sessionId, lastLoginAt: new Date() },
                token,
                sessionId
            };
        }
        return null;
    }
}
