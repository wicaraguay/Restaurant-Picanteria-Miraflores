/**
 * @file MenuItemCard.tsx
 * @description Componente de presentación para mostrar un plato del menú como una tarjeta premium.
 * Proporciona feedback visual mediante sombras, micro-animaciones y efectos táctiles.
 * Este archivo pertenece al módulo de menú (menu).
 */
import React from 'react';
import { MenuItem } from '../types/menu.types';
import { EditIcon, TrashIcon } from '../../../components/ui/Icons';
import ToggleSwitch from '../../../components/ui/ToggleSwitch';

interface MenuItemCardProps {
    item: MenuItem;
    onEdit: () => void;
    onDelete: () => void;
    onToggleAvailability: () => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onEdit, onDelete, onToggleAvailability }) => {
    return (
        <div className="bg-white dark:bg-dark-800 rounded-3xl shadow-lg border border-gray-100 dark:border-dark-700 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
            {/* Imagen del Plato */}
            <div className="relative h-48 sm:h-56 overflow-hidden">
                <img
                    src={item.imageUrl || 'https://via.placeholder.com/300x200?text=Sin+Imagen'}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 right-4">
                    <span className="font-black text-gray-900 dark:text-white bg-white/90 dark:bg-dark-900/90 backdrop-blur-sm px-3 py-1.5 rounded-2xl text-lg border border-white/20 shadow-lg">
                        ${item.price.toFixed(2)}
                    </span>
                </div>
                {!item.available && (
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-red-500 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-widest shadow-lg">
                            No Disponible
                        </span>
                    </div>
                )}
            </div>

            {/* Contenido de la Tarjeta */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="mb-2">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 block">
                        {item.category}
                    </span>
                    <h3 className="font-black text-gray-900 dark:text-white text-xl leading-tight tracking-tighter">
                        {item.name}
                    </h3>
                </div>
                
                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-6 flex-1">
                    {item.description || 'Sin descripción disponible para este delicioso plato.'}
                </p>

                {/* Acciones y Estado */}
                <div className="pt-4 border-t border-gray-100 dark:border-dark-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ToggleSwitch checked={item.available} onChange={onToggleAvailability} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${item.available ? 'text-green-600' : 'text-gray-400'}`}>
                            {item.available ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onEdit} 
                            className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl transition-all hover:bg-blue-600 hover:text-white active:scale-95"
                            title="Editar plato"
                        >
                            <EditIcon className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={onDelete} 
                            className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl transition-all hover:bg-red-600 hover:text-white active:scale-95"
                            title="Eliminar plato"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
