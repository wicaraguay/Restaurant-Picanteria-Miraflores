/**
 * @file IEmployeeRepository.ts
 * @description Interfaz del repositorio de empleados (Domain Layer)
 * 
 * @purpose
 * Define el contrato para operaciones de empleados incluyendo autenticación
 * (findByUsername) y gestión de sesiones (updateSession).
 * 
 * @connections
 * - Implementado por: MongoEmployeeRepository (infrastructure/repositories)
 * - Usa: Employee entity (domain/entities)
 * - Usado por: Login, ValidateSession, Logout use cases (application/use-cases)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Domain - Define contratos sin implementación
 */

import { Employee } from '../entities/Employee';

export interface IEmployeeRepository {
    findByUsername(username: string): Promise<Employee | null>;
    findById(id: string): Promise<Employee | null>;
    findAll(): Promise<Employee[]>;
    create(employee: Employee): Promise<Employee>;
    update(id: string, employee: Partial<Employee>): Promise<Employee | null>;
    delete(id: string): Promise<boolean>;
    updateSession(id: string, sessionId: string, lastLoginAt: Date): Promise<void>;
}
