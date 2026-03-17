import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants';
import { ViewType } from '../../types';
import { LogOutIcon } from '../ui/Icons';

interface MobileBottomNavProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  navItems: typeof NAV_ITEMS;
  onLogout: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentView, onViewChange, navItems, onLogout }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex overflow-x-auto no-scrollbar items-center z-40 lg:hidden dark:bg-dark-800 dark:border-dark-700 px-2 snap-x">
      {navItems.map((item) => (
        <NavLink
          key={item.id}
          to={`/admin/${item.view}`}
          className={({ isActive }) => `
            relative flex flex-col items-center justify-center min-w-[72px] h-full transition-colors duration-200 ease-in-out focus:outline-none shrink-0 snap-center
            ${isActive
              ? 'text-primary-light'
              : 'text-gray-500 hover:text-primary-light dark:text-gray-400 dark:hover:text-primary-light'
            }
          `}
          aria-current="page"
        >
          {({ isActive }) => (
            <>
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] mt-1 font-medium">{item.shortLabel}</span>
              {isActive && (
                <div className="absolute bottom-1 w-1.5 h-1.5 bg-primary-light rounded-full"></div>
              )}
            </>
          )}
        </NavLink>
      ))}
      {/* Logout Button */}
      <button
        onClick={onLogout}
        className="relative flex flex-col items-center justify-center min-w-[72px] h-full transition-colors duration-200 ease-in-out focus:outline-none text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500 shrink-0 snap-center"
        title="Cerrar Sesión"
      >
        <LogOutIcon className="w-6 h-6" />
        <span className="text-[10px] mt-1 font-medium">Salir</span>
      </button>
    </nav>
  );
};

export default MobileBottomNav;
