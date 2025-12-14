/**
 * @file AuthService.ts
 * @description Servicio de autenticación (Singleton Pattern)
 * 
 * @purpose
 * Centraliza toda la lógica de autenticación de la aplicación.
 * Implementa Singleton para garantizar una única instancia.
 * Integra con AuthContext y ApiService.
 * 
 * @connections
 * - Usa: api.ts (ApiService)
 * - Usa: StorageUtil (utils/storage)
 * - Usa: logger (utils/logger)
 * - Usado por: AuthContext
 * - Usado por: AdminApp
 * 
 * @layer Services - Singleton Pattern
 */

import { api } from '../api';
import { StorageUtil } from '../utils/storage';
import { logger } from '../utils/logger';
import { Employee, Role } from '../types';

/**
 * Constantes para storage keys
 */
const STORAGE_KEYS = {
    TOKEN: 'restaurant_pm_token',
    SESSION: 'restaurant_pm_session',
    USER: 'restaurant_pm_user'
} as const;

/**
 * Tipo para usuario autenticado
 */
export type AuthenticatedUser = Employee & { role: Role };

/**
 * AuthService - Singleton para gestión de autenticación
 */
export class AuthService {
    private static instance: AuthService;

    private constructor() {
        logger.info('AuthService initialized');
    }

    /**
     * Obtiene la instancia única (Singleton Pattern)
     */
    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    /**
     * Guarda la sesión en storage
     */
    public saveSession(token: string, sessionId: string, user: AuthenticatedUser): void {
        StorageUtil.setItem(STORAGE_KEYS.TOKEN, token);
        StorageUtil.setItem(STORAGE_KEYS.SESSION, sessionId);
        StorageUtil.setItem(STORAGE_KEYS.USER, user);
        logger.info('Session saved to storage', { userId: user.id });
    }

    /**
     * Carga la sesión desde storage
     */
    public loadSession(): { token: string; user: AuthenticatedUser } | null {
        const token = StorageUtil.getItem<string>(STORAGE_KEYS.TOKEN);
        const user = StorageUtil.getItem<AuthenticatedUser>(STORAGE_KEYS.USER);

        if (token && user) {
            logger.debug('Session loaded from storage', { userId: user.id });
            return { token, user };
        }

        return null;
    }

    /**
     * Limpia la sesión del storage
     */
    public clearSession(): void {
        StorageUtil.removeItem(STORAGE_KEYS.TOKEN);
        StorageUtil.removeItem(STORAGE_KEYS.SESSION);
        StorageUtil.removeItem(STORAGE_KEYS.USER);
        logger.info('Session cleared from storage');
    }

    /**
     * Inicia sesión
     */
    /**
     * Inicia sesión
     */
    public async login(
        username: string,
        password: string
    ): Promise<{ success: boolean; user?: AuthenticatedUser; error?: string }> {
        try {
            logger.info('Login attempt', { username });

            const response = await api.auth.login(username, password);

            if (!response || !response.user) {
                logger.warn('Login failed - invalid response');
                return { success: false, error: 'Credenciales inválidas' };
            }

            const employee = response.user;

            // La API ahora devuelve el rol populado dentro del usuario
            if (!employee.role) {
                logger.error('User has no role assigned from backend', { userId: employee.id });
                return { success: false, error: 'Usuario sin rol asignado' };
            }

            const userWithRole: AuthenticatedUser = {
                ...employee,
                role: employee.role // Usar el rol que viene del backend
            };

            // Guardar sesión
            this.saveSession(response.token, response.sessionId, userWithRole);

            logger.info('Login successful', { userId: employee.id, role: employee.role.name });
            return { success: true, user: userWithRole };

        } catch (error) {
            logger.error('Login error', error);
            return { success: false, error: 'Error al iniciar sesión' };
        }
    }

    /**
     * Valida una sesión existente
     */
    public async validateSession(token: string): Promise<Employee | null> {
        try {
            logger.debug('Validating session');
            const user = await api.auth.validate(token);

            if (user) {
                logger.info('Session validated successfully', { userId: user.id });
                return user;
            }

            logger.warn('Session validation failed');
            return null;

        } catch (error) {
            logger.error('Session validation error', error);
            return null;
        }
    }

    /**
     * Cierra sesión
     */
    public async logout(token: string): Promise<void> {
        try {
            logger.info('Logout attempt');
            await api.auth.logout(token);
        } catch (error) {
            logger.error('Logout error', error);
        } finally {
            this.clearSession();
            logger.info('User logged out');
        }
    }

    /**
     * Restaura sesión desde storage
     */
    public async restoreSession(): Promise<{ success: boolean; user?: AuthenticatedUser }> {
        try {
            const session = this.loadSession();

            if (!session) {
                logger.debug('No session to restore');
                return { success: false };
            }

            const { token, user } = session;

            // Validar token con backend
            const validatedUser = await this.validateSession(token);

            if (validatedUser) {
                logger.info('Session restored successfully', { userId: user.id });
                return { success: true, user };
            }

            // Token inválido, limpiar sesión
            this.clearSession();
            logger.warn('Stored token is invalid, session cleared');
            return { success: false };

        } catch (error) {
            logger.error('Failed to restore session', error);
            this.clearSession();
            return { success: false };
        }
    }
}

// Exportar instancia singleton
export const authService = AuthService.getInstance();
