/**
 * @file Card.tsx
 * @description Componente contenedor genérico con título y acciones.
 * Utilizado para agrupar secciones lógicas en la interfaz.
 */
import React from 'react';

interface CardProps {
    title: string;
    children?: React.ReactNode;
    actions?: React.ReactNode;
    danger?: boolean;
}

export const Card: React.FC<CardProps> = ({ title, children, actions, danger = false }) => (
    <div className={`bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-lg shadow-md ${danger ? 'border border-red-500/50 ring-1 ring-red-500/10' : ''}`}>
        <div className="flex justify-between items-center mb-4">
            <h2 className={`text-xl font-semibold ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-light-background'}`}>{title}</h2>
            {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
        {children}
    </div>
);

export default Card;
