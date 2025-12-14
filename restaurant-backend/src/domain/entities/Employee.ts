/**
 * @file Employee.ts
 * @description Entidad de dominio que representa un empleado del restaurante
 * 
 * @purpose
 * Define la estructura de datos de un empleado incluyendo credenciales de autenticación,
 * información laboral (salario, turnos), y gestión de sesiones.
 * 
 * @connections
 * - Usado por: IEmployeeRepository (domain/repositories)
 * - Usado por: MongoEmployeeRepository (infrastructure/repositories)
 * - Usado por: EmployeeSchema (infrastructure/database/schemas)
 * - Usado por: Login, ValidateSession, Logout (application/use-cases)
 * - Usado por: authRoutes (infrastructure/web/routes)
 * - Usado por: seed.ts (para crear empleado admin inicial)
 * 
 * @layer Domain - Entidad pura sin dependencias externas
 */

import { Role } from './Role';

export interface Employee {
    id: string;
    name: string;
    username: string;
    password?: string;
    roleId: string;
    role?: Role; // Propiedad populada
    phone: string;
    salary: number;
    shifts: { [key: string]: string };
    equipment: { uniform: boolean; epp: boolean };
    activeSessionId?: string;  // Para tracking de sesión única
    lastLoginAt?: Date;        // Última fecha de login
}
