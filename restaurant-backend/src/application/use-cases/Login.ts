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
import bcrypt from 'bcryptjs';

export interface LoginResponse {
    user: Employee;
    token: string;
    sessionId: string;
}

export class Login {
    constructor(private employeeRepository: IEmployeeRepository) { }

    async execute(username: string, password: string): Promise<LoginResponse | null> {
        const employee = await this.employeeRepository.findByUsername(username);
        if (!employee) {
            logger.warn('Login attempt with non-existent username', { username });
            return null;
        }

        if (!password) {
            logger.warn('Login attempt without password', { username });
            return null;
        }

        if (!employee.password) {
            logger.error('Employee has no password set', { username });
            return null;
        }

        // Verificar contraseña hasheada con bcrypt
        // TypeScript sabe que password no es undefined aquí por el check anterior
        const isPasswordValid = await bcrypt.compare(password, employee.password);

        if (!isPasswordValid) {
            logger.warn('Login attempt with invalid password', { username });
            return null;
        }

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
}
