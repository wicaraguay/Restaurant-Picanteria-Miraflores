import { Role } from '../../hr/types/hr.types';

/**
 * @file auth.types.ts
 * @description Tipos para el módulo de autenticación.
 */

export interface AuthenticatedUser {
    id: string;
    username: string;
    role: Role;
    name: string;
}

export interface LoginCredentials {
    username: string;
    password: string;
}
