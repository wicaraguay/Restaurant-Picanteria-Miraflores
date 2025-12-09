/**
 * Logout Use Case
 * 
 * Invalida la sesión actual eliminando el activeSessionId de la base de datos.
 */

import { IEmployeeRepository } from '../../domain/repositories/IEmployeeRepository';
import { logger } from '../../infrastructure/utils/Logger';

export class Logout {
    constructor(private employeeRepository: IEmployeeRepository) { }

    async execute(userId: string): Promise<void> {
        try {
            // Invalidar sesión eliminando el sessionId
            await this.employeeRepository.updateSession(userId, '', new Date());
            logger.info('User logged out successfully', { userId });
        } catch (error) {
            logger.error('Failed to logout user', error);
            throw error;
        }
    }
}
