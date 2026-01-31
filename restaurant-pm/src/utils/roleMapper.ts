/**
 * @file roleMapper.ts
 * @description Utilidad para mapeo de roles backend ↔ frontend
 * 
 * @purpose
 * Centraliza la lógica de mapeo de roles entre backend y frontend.
 * Elimina código duplicado de conversión de roleId.
 * 
 * @connections
 * - Usado por: AuthService
 * - Usado por: Componentes que manejan roles
 * 
 * @layer Utils
 */

import { Role } from '../types';

/**
 * Mapeo de roles backend a frontend
 */
export const BACKEND_TO_FRONTEND_ROLE_MAP: Record<string, string> = {
    'admin': '1',
    'cashier': '2',
    'waiter': '3',
    'chef': '4'
};

/**
 * Mapeo de roles frontend a backend
 */
export const FRONTEND_TO_BACKEND_ROLE_MAP: Record<string, string> = {
    '1': 'admin',
    '2': 'cashier',
    '3': 'waiter',
    '4': 'chef'
};

/**
 * RoleMapper - Utilidad para mapeo de roles
 */
export class RoleMapper {
    /**
     * Convierte roleId del backend al frontend
     */
    static toFrontend(backendRoleId: string): string {
        return BACKEND_TO_FRONTEND_ROLE_MAP[backendRoleId] || '1'; // Default a admin
    }

    /**
     * Convierte roleId del frontend al backend
     */
    static toBackend(frontendRoleId: string): string {
        return FRONTEND_TO_BACKEND_ROLE_MAP[frontendRoleId] || 'admin'; // Default a admin
    }

    /**
     * Obtiene el rol por ID
     */
    static getRoleById(roleId: string, roles: Role[]): Role | undefined {
        return roles.find(r => r.id === roleId);
    }

    /**
     * Verifica si un rol tiene un permiso específico
     */
    static hasPermission(role: Role, permission: keyof Role['permissions']): boolean {
        return role.permissions[permission] === true;
    }

    /**
     * Obtiene todos los permisos de un rol
     */
    static getPermissions(role: Role): string[] {
        return Object.entries(role.permissions)
            .filter(([_, hasPermission]) => hasPermission)
            .map(([permission]) => permission);
    }
}
