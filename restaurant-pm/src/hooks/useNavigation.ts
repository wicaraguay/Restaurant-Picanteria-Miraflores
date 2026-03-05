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

import { useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ViewType } from '../types';
import { AuthenticatedUser } from '../modules/auth';
import { NAV_ITEMS } from '../constants';

/**
 * Hook para manejo de navegación basado en la URL (React Router)
 */
export function useNavigation(currentUser: AuthenticatedUser | null) {
    const location = useLocation();
    const navigate = useNavigate();

    /**
     * Deriva la vista actual desde la ruta de la URL
     * Ejemplo: /admin/orders -> orders
     */
    const currentView = useMemo((): ViewType => {
        const pathParts = location.pathname.split('/');
        // Si estamos en /admin/vistas-hijas, la parte de interés es la última
        const viewFromPath = pathParts[pathParts.length - 1] as ViewType;

        // Validar si es una vista válida, si no, dashboard
        const isValidView = NAV_ITEMS.some(item => item.view === viewFromPath);
        return isValidView ? viewFromPath : 'dashboard';
    }, [location.pathname]);

    /**
     * Filtra items de navegación según permisos del usuario
     */
    const navItems = useMemo(() => {
        if (!currentUser || !currentUser.role) {
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
     * Navega a una vista si el usuario tiene permiso, actualizando la URL
     */
    const navigateTo = (view: ViewType): boolean => {
        if (!hasAccessTo(view)) {
            return false;
        }
        navigate(`/admin/${view}`);
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
     * Efecto para redirigir si el usuario no tiene acceso a la ruta actual
     */
    useEffect(() => {
        if (!currentUser || navItems.length === 0) return;

        const isAllowed = navItems.some(item => item.view === currentView);

        if (!isAllowed) {
            const firstAllowedView = navItems[0].view;
            navigate(`/admin/${firstAllowedView}`, { replace: true });
        }
    }, [currentUser, currentView, navItems, navigate]);

    return {
        currentView,
        setCurrentView: (view: ViewType) => navigateTo(view), // Mantener compatibilidad de interfaz
        navItems,
        hasAccessTo,
        navigateTo,
        getCurrentViewLabel
    };
}
