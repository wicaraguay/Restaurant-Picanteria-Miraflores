/**
 * MobileLayout — Estructura común de la app móvil: header + contenido + nav inferior.
 * Usa los tokens del sistema (primary azul, light/dark) para respetar la identidad
 * del proyecto. Contempla safe-areas de Android/iOS.
 */

import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { SunIcon, MoonIcon, SettingsIcon } from '../../components/ui/Icons';
import MobileNav from './MobileNav';

const MobileLayout: React.FC = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen flex flex-col bg-light-background dark:bg-dark-900 text-light-text dark:text-light-background">
            <header className="sticky top-0 z-20 bg-blue-600 text-white shadow-md">
                <div
                    className="flex items-center justify-between px-4 h-14"
                    style={{ marginTop: 'env(safe-area-inset-top)' }}
                >
                    <span className="font-black tracking-wide text-lg">Picantería</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
                            aria-label="Cambiar tema"
                        >
                            {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => navigate('/config')}
                            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition"
                            aria-label="Configuración"
                        >
                            <SettingsIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 pb-24">
                <Outlet />
            </main>

            <MobileNav />
        </div>
    );
};

export default MobileLayout;
