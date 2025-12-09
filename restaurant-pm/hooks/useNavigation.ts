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

import { useState, useMemo } from 'react';
import { ViewType, Role, Employee } from '../types';
import { NAV_ITEMS } from '../constants';

/**
 * Hook para manejo de navegación
 */
export function useNavigation(currentUser: (Employee & { role: Role }) | null) {
    const [currentView, setCurrentView] = useState<ViewType>('dashboard');

    /**
     * Filtra items de navegación según permisos del usuario
     */
    const navItems = useMemo(() => {
        if (!currentUser) return [];

        return NAV_ITEMS.filter(item =>
            currentUser.role.permissions[item.view] === true
        );
    }, [currentUser]);

    /**
     * Verifica si el usuario tiene acceso a una vista
     */
    const hasAccessTo = (view: ViewType): boolean => {
        if (!currentUser) return false;
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

    return {
        currentView,
        setCurrentView,
        navItems,
        hasAccessTo,
        navigateTo,
        getCurrentViewLabel
    };
}
