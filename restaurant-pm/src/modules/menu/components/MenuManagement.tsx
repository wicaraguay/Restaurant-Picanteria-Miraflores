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

interface MenuManagementProps {
    menuItems: MenuItem[];
    setMenuItems: SetState<MenuItem[]>;
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
                // Update existing item
                logger.info('Updating menu item', { id: itemToSave.id, name: itemToSave.name });
                // We send the itemToSave, ensuring we don't send the ID if it's not needed by the backend update body, 
                // but usually PUT takes the ID in URL and body as payload.
                // Note: The backend route put('/:id') uses req.params.id and req.body.
                savedItem = await menuService.update(itemToSave.id, itemToSave);

                setMenuItems(prev => prev.map(item => item.id === itemToSave.id ? savedItem : item));
                logger.info('Menu item updated successfully');
            } else {
                // Create new item
                // Remove ID if it's a temp ID (optional, but backend usually assigns ID)
                // However, menuRoutes.ts:40 uses req.body as MenuItem. If backend ignores ID it's fine.
                // Let's assume backend assigns a new ID or uses the one provided if valid (usually Mongo assigns _id).
                // Ideally we shouldn't send the temp ID 'Date.now().toString()'.
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
        <div>
            <MenuFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveItem} item={editingItem} />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-light-background hidden lg:block">Gestión de Menú</h1>
                <button onClick={() => handleOpenModal()} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm rounded-lg shadow-sm transition-colors w-full lg:w-auto justify-center">
                    <PlusIcon className="w-5 h-5 mr-1" /> Añadir Plato
                </button>
            </div>

            <div className="space-y-6">
                {Object.keys(groupedMenu).sort().map(category => (
                    <div key={category}>
                        <Card title={category}>
                            <div className="divide-y divide-gray-100 dark:divide-dark-700">
                                {groupedMenu[category].map(item => (
                                    <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                                        <div className="flex flex-row items-start gap-4">
                                            <div className="flex-shrink-0">
                                                <img
                                                    src={item.imageUrl || 'https://via.placeholder.com/80'}
                                                    alt={item.name}
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover shadow-sm bg-gray-100 border border-gray-100 dark:border-gray-700 transition-opacity duration-300"
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg truncate pr-2">{item.name}</h3>
                                                    <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-dark-700 px-2 py-0.5 rounded text-sm border border-gray-200 dark:border-gray-600">${item.price.toFixed(2)}</span>
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.description || 'Sin descripción'}</p>

                                                <div className="flex items-center justify-between mt-3">
                                                    <div className="flex items-center">
                                                        <ToggleSwitch checked={item.available} onChange={() => handleToggleAvailability(item)} />
                                                        <span className={`ml-2 text-xs font-medium ${item.available ? 'text-green-600' : 'text-gray-400'}`}>{item.available ? 'Activo' : 'Inactivo'}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400"><EditIcon className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MenuManagement;
