/**
 * Auth Context - REFACTORIZADO
 * 
 * Maneja el estado de autenticación global de la aplicación.
 * AHORA USA AuthService para eliminar código duplicado.
 * Implementa persistencia de sesión con localStorage y JWT.
 * Valida automáticamente la sesión al cargar la aplicación.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthenticatedUser } from '../services/AuthService';
import { logger } from '../utils/logger';
import { Role } from '../types';

interface AuthContextType {
    currentUser: AuthenticatedUser | null;
    token: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
    roles: Role[];
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, roles }) => {
    const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Restaura la sesión desde localStorage al cargar
     */
    const restoreSession = async () => {
        try {
            logger.info('Attempting to restore session');

            const result = await authService.restoreSession(roles);

            if (result.success && result.user) {
                setCurrentUser(result.user);
                setToken(authService.loadSession()?.token || null);
                logger.info('Session restored successfully');
            } else {
                logger.debug('No valid session to restore');
            }
        } catch (error) {
            logger.error('Failed to restore session', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Inicia sesión usando AuthService
     */
    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const result = await authService.login(username, password, roles);

            if (result.success && result.user) {
                setCurrentUser(result.user);
                setToken(authService.loadSession()?.token || null);
                return true;
            }

            return false;
        } catch (error) {
            logger.error('Login failed', error);
            return false;
        }
    };

    /**
     * Cierra sesión usando AuthService
     */
    const logout = async () => {
        try {
            const currentToken = authService.loadSession()?.token;
            if (currentToken) {
                await authService.logout(currentToken);
            }
        } catch (error) {
            logger.error('Logout failed', error);
        } finally {
            setCurrentUser(null);
            setToken(null);
        }
    };

    // Restaurar sesión al montar
    useEffect(() => {
        restoreSession();
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
