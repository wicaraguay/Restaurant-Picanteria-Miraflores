/**
 * @file MenuManagement.tsx
 * @description Componente principal de gestión del menú del restaurante.
 * Permite visualizar, crear, editar y eliminar platos, así como gestionar su disponibilidad.
 */
import React, { useState, useMemo } from 'react';
import { SetState } from '../../../types';
import { MenuItem } from '../types/menu.types';
import { PlusIcon, EditIcon, TrashIcon } from '../../../components/ui/Icons';
import { menuService } from '../services/MenuService';
import { logger } from '../../../utils/logger';

// Componentes locales y globales
import Card from '../../../components/ui/Card';
import ToggleSwitch from '../../../components/ui/ToggleSwitch';
import { MenuFormModal } from './MenuFormModal';
import { MenuItemCard } from './MenuItemCard';

interface MenuManagementProps {
    menuItems: MenuItem[];
    setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
}

const MenuManagement: React.FC<MenuManagementProps> = ({ menuItems, setMenuItems }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    const handleOpenModal = (item: MenuItem | null = null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleSaveItem = async (itemToSave: MenuItem) => {
        try {
            const exists = menuItems.some(item => item.id === itemToSave.id);
            let savedItem: MenuItem;

            if (exists) {
                logger.info('Updating menu item', { id: itemToSave.id, name: itemToSave.name });
                savedItem = await menuService.update(itemToSave.id, itemToSave);
                setMenuItems(prev => prev.map(item => item.id === itemToSave.id ? savedItem : item));
                logger.info('Menu item updated successfully');
            } else {
                const { id, ...newItemData } = itemToSave;
                logger.info('Creating new menu item', { name: newItemData.name });
                savedItem = await menuService.create(newItemData);
                setMenuItems(prev => [...prev, savedItem]);
                logger.info('Menu item created successfully');
            }
        } catch (error) {
            logger.error('Failed to save menu item', error);
            alert('Error al guardar el plato. Por favor, intenta de nuevo.');
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (window.confirm('¿Seguro que quieres eliminar este plato?')) {
            try {
                logger.info('Deleting menu item', { id });
                await menuService.delete(id);
                setMenuItems(prev => prev.filter(item => item.id !== id));
                logger.info('Menu item deleted successfully');
            } catch (error) {
                logger.error('Failed to delete menu item', error);
                alert('Error al eliminar el plato. Por favor, intenta de nuevo.');
            }
        }
    };

    const handleToggleAvailability = async (itemToToggle: MenuItem) => {
        const updatedItem = { ...itemToToggle, available: !itemToToggle.available };

        // Actualizar UI inmediatamente (optimistic update)
        setMenuItems(prev => prev.map(item => item.id === itemToToggle.id ? updatedItem : item));

        // Persistir en el backend
        try {
            logger.info('Updating menu item availability', { id: itemToToggle.id, available: updatedItem.available });
            await menuService.update(itemToToggle.id, updatedItem);
            logger.info('Menu item updated successfully');
        } catch (error) {
            logger.error('Failed to update menu item', error);
            // Revertir el cambio si falla
            setMenuItems(prev => prev.map(item => item.id === itemToToggle.id ? itemToToggle : item));
            alert('Error al actualizar el plato. Por favor, intenta de nuevo.');
        }
    };

    const groupedMenu = useMemo(() => {
        return menuItems.reduce((acc, item) => {
            (acc[item.category] = acc[item.category] || []).push(item);
            return acc;
        }, {} as Record<string, MenuItem[]>);
    }, [menuItems]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <MenuFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveItem} item={editingItem} />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase mb-1">
                        Gestión de Menú
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        Organiza y personaliza los deliciosos platos que ofrece tu restaurante.
                    </p>
                </div>
                <button 
                    onClick={() => handleOpenModal()} 
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 w-full sm:w-auto justify-center"
                >
                    <PlusIcon className="w-5 h-5" /> Añadir Nuevo Plato
                </button>
            </div>

            <div className="space-y-16">
                {Object.keys(groupedMenu).sort().map(category => (
                    <div key={category} className="space-y-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest bg-gray-100 dark:bg-dark-700 px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-600">
                                {category}
                            </h2>
                            <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-dark-600 to-transparent"></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                            {groupedMenu[category].map(item => (
                                <MenuItemCard 
                                    key={item.id} 
                                    item={item} 
                                    onEdit={() => handleOpenModal(item)} 
                                    onDelete={() => handleDeleteItem(item.id)} 
                                    onToggleAvailability={() => handleToggleAvailability(item)}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {menuItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 dark:bg-dark-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-dark-800">
                        <div className="text-6xl mb-4">🍽️</div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">No hay platos en el menú</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Comienza añadiendo tu primer plato especial.</p>
                        <button 
                            onClick={() => handleOpenModal()} 
                            className="mt-6 text-blue-600 dark:text-blue-400 font-black text-sm uppercase tracking-widest hover:underline"
                        >
                            Añadir Plato Ahora
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MenuManagement;
