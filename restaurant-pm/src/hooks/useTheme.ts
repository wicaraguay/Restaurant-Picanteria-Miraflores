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
     * Sincroniza tema con clase CSS del documento y con la barra de estado
     * del sistema (PWA instalada): el meta theme-color pinta la barra superior
     * del teléfono — debe fundirse con el fondo de la app en cada tema.
     */
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');

        const themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', theme === 'dark' ? '#111827' : '#ffffff');
        }
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
