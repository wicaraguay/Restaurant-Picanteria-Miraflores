/**
 * @file useNavigation.ts
 * @description Hook personalizado para manejo de navegación
 * 
 * @purpose
 * Centraliza la lógica de navegación entre vistas.
 * Filtra items de navegación según permisos del usuario.
 * Proporciona helpers para navegación.
 * 
 * @connections
 * - Usa: types.ts (ViewType, Role, Employee)
 * - Usa: constants.ts (NAV_ITEMS)
 * - Usado por: AdminApp, Sidebar, MobileBottomNav
 * 
 * @layer Hooks - Custom Hook
 */

import { useState, useMemo, useEffect } from 'react';
import { ViewType, Role, Employee } from '../types';
import { AuthenticatedUser } from '../services/AuthService';
import { NAV_ITEMS } from '../constants';

/**
 * Hook para manejo de navegación
 */
export function useNavigation(currentUser: AuthenticatedUser | null) {
    const [currentView, setCurrentView] = useState<ViewType>('dashboard');

    /**
     * Filtra items de navegación según permisos del usuario
     */
    const navItems = useMemo(() => {
        if (!currentUser || !currentUser.role) {
            console.warn('User has no role defined:', currentUser);
            return [];
        }

        return NAV_ITEMS.filter(item =>
            currentUser.role.permissions && currentUser.role.permissions[item.view] === true
        );
    }, [currentUser]);

    /**
     * Verifica si el usuario tiene acceso a una vista
     */
    const hasAccessTo = (view: ViewType): boolean => {
        if (!currentUser || !currentUser.role || !currentUser.role.permissions) return false;
        return currentUser.role.permissions[view] === true;
    };

    /**
     * Navega a una vista si el usuario tiene permiso
     */
    const navigateTo = (view: ViewType): boolean => {
        if (!hasAccessTo(view)) {
            return false;
        }
        setCurrentView(view);
        return true;
    };

    /**
     * Obtiene el label de la vista actual
     */
    const getCurrentViewLabel = (): string => {
        const item = NAV_ITEMS.find(item => item.view === currentView);
        return item?.label || 'Dashboard';
    };

    /**
     * Efecto para redirigir si el usuario no tiene acceso a la vista actual
     * Esto soluciona el problema de ver el Dashboard sin permisos al iniciar sesión
     */
    // @ts-ignore - Import useEffect if not already imported, currently assumes it needs to be added to imports
    useEffect(() => {
        if (!currentUser || navItems.length === 0) return;

        // Verificar si la vista actual está en los items permitidos
        const isAllowed = navItems.some(item => item.view === currentView);

        if (!isAllowed) {
            // Si no está permitido, redirigir al primer item disponible
            const firstAllowedView = navItems[0].view;
            // console.log(`Redirecting from ${currentView} to ${firstAllowedView} due to lack of permission`);
            setCurrentView(firstAllowedView);
        }
    }, [currentUser, currentView, navItems]);

    return {
        currentView,
        setCurrentView,
        navItems,
        hasAccessTo,
        navigateTo,
        getCurrentViewLabel
    };
}
