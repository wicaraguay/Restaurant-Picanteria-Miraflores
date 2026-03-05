/**
 * @file ToggleSwitch.tsx
 * @description Componente de interruptor (toggle) reutilizable.
 * Estilizado para encajar con el diseño general de la aplicación.
 */
import React from 'react';

interface ToggleSwitchProps {
    checked: boolean;
    onChange: () => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange }) => (
    <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-dark-600'
            }`}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
                }`}
        />
    </button>
);

export default ToggleSwitch;
