import React from 'react';
import { NAV_ITEMS } from '../constants';
import { ViewType } from '../types';
import { SunIcon, MoonIcon, LogOutIcon } from './Icons';
import { useRestaurantConfig } from '../contexts/RestaurantConfigContext';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  navItems: typeof NAV_ITEMS;
  onLogout: () => void;
}

const ThemeToggle: React.FC<{ theme: 'light' | 'dark'; setTheme: (theme: 'light' | 'dark') => void; }> = ({ theme, setTheme }) => {
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
    </button>
  );
};


const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, theme, setTheme, navItems, onLogout }) => {
  const { config } = useRestaurantConfig();
  const currentYear = new Date().getFullYear();

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-gray-800 text-white flex-col z-30 hidden lg:flex dark:bg-dark-900 border-r dark:border-dark-700">
      <div className="p-4 border-b border-gray-700 dark:border-dark-700">
        {config.logo ? (
          <div className="flex items-center space-x-3">
            <img src={config.logo} alt={config.name} className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-2xl font-bold">{config.name}</h1>
              <p className="text-sm text-gray-400">Panel de Control</p>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{config.name}</h1>
            <p className="text-sm text-gray-400">Panel de Control</p>
          </>
        )}
      </div>
      <nav className="flex-1 p-2">
        <ul>
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.view)}
                className={`w-full flex items-center p-3 my-1 rounded-md text-left transition-colors
                  ${currentView === item.view
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700 dark:hover:bg-dark-700'
                  }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-2">
        <button
          onClick={onLogout}
          className="w-full flex items-center p-3 my-1 rounded-md text-left transition-colors text-gray-300 hover:bg-red-500 hover:text-white dark:hover:bg-red-600"
          aria-label="Cerrar sesión"
        >
          <LogOutIcon className="w-5 h-5 mr-3" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
      <div className="p-4 border-t border-gray-700 dark:border-dark-700 flex justify-between items-center">
        <p className="text-sm">© {currentYear} {config.name}</p>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </aside>
  );
};

export default Sidebar;