/**
 * ValidateSession Use Case
 *
 * Valida que un token JWT sea válido y que el usuario exista.
 * Se permiten SESIONES MÚLTIPLES: la app (PWA), el navegador y varios
 * dispositivos pueden mantener su sesión a la vez sin expulsarse entre sí.
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

        // Sesiones múltiples permitidas: ya NO se exige que el sessionId del token
        // coincida con el activeSessionId de la BD. Cada login sigue registrando su
        // activeSessionId/lastLoginAt como referencia del último inicio, pero eso ya
        // no invalida las sesiones abiertas en otros dispositivos.

        logger.info('Session validated successfully', { userId: employee.id });

        // No retornar password
        const { password: _, ...userWithoutPassword } = employee;
        return userWithoutPassword as Employee;
    }
}
