/**
 * @file useTheme.ts
 * @description Hook personalizado para manejo de tema (light/dark)
 * 
 * @purpose
 * Centraliza la lógica de manejo de tema de la aplicación.
 * Persiste preferencia en localStorage.
 * Sincroniza con clase CSS del documento.
 * 
 * @connections
 * - Usa: useLocalStorage (hooks/useLocalStorage)
 * - Usado por: AdminApp, Sidebar
 * 
 * @layer Hooks - Custom Hook
 */

import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type Theme = 'light' | 'dark';

/**
 * Hook para manejo de tema
 */
export function useTheme() {
    const [theme, setTheme] = useLocalStorage<Theme>('restaurant_pm_theme', 'light');

    /**
     * Sincroniza tema con clase CSS del documento
     */
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    /**
     * Alterna entre light y dark
     */
    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return {
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark'
    };
}
