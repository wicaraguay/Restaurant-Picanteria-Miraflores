/**
 * MobileNav — Barra inferior de navegación de la app móvil (subset enfocado).
 * Solo lo que se usa en operación diaria: Pedidos, Cocina, Nuevo (POS), Facturar.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    HomeIcon,
    ClipboardListIcon,
    ChefHatIcon,
    PlusIcon,
    FileTextIcon,
} from '../../components/ui/Icons';

const ITEMS = [
    { to: 'inicio', label: 'Inicio', Icon: HomeIcon },
    { to: 'pedidos', label: 'Pedidos', Icon: ClipboardListIcon },
    { to: 'pos', label: 'Nuevo', Icon: PlusIcon },
    { to: 'cocina', label: 'Cocina', Icon: ChefHatIcon },
    { to: 'facturar', label: 'Facturar', Icon: FileTextIcon },
];

const MobileNav: React.FC = () => (
    <nav
        className="fixed bottom-0 left-0 right-0 h-16 z-40 flex items-center bg-light-surface dark:bg-dark-800 border-t border-light-border dark:border-dark-700"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
        {ITEMS.map(({ to, label, Icon }) => (
            <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                    `flex-1 h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                        isActive
                            ? 'text-blue-600'
                            : 'text-light-subtext dark:text-gray-400 hover:text-blue-600'
                    }`
                }
            >
                <Icon className="w-6 h-6" />
                <span>{label}</span>
            </NavLink>
        ))}
    </nav>
);

export default MobileNav;
