import React, { useState, useMemo } from 'react';
import { MenuItem, SetState } from '../types';
import Modal from './Modal';
import { PlusIcon, EditIcon, TrashIcon } from './Icons';
import { api } from '../api';
import { logger } from '../utils/logger';

interface MenuManagementProps {
    menuItems: MenuItem[];
    setMenuItems: SetState<MenuItem[]>;
}

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

const Card = ({ title, children, actions }: { title: string, children?: React.ReactNode, actions?: React.ReactNode }) => (
    <div className="bg-white dark:bg-dark-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700">
        <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-light-background">{title}</h2>
            {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
        {children}
    </div>
);

const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 dark:bg-dark-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600"></div>
    </label>
);

interface MenuFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: MenuItem) => void;
    item: MenuItem | null;
}

const MenuFormModal: React.FC<MenuFormModalProps> = ({ isOpen, onClose, onSave, item }) => {
    const [formData, setFormData] = useState<Partial<MenuItem>>({});
    const isEditing = item !== null;

    React.useEffect(() => {
        if (isOpen) {
            setFormData(isEditing ? { ...item } : { name: '', category: '', price: 0, description: '', available: true, imageUrl: '' });
        }
    }, [isOpen, item, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        else setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.category || formData.price === undefined) return alert('Nombre, Categoría y Precio son obligatorios.');

        const itemToSave: MenuItem = {
            id: item?.id || Date.now().toString(),
            name: formData.name,
            category: formData.category,
            price: formData.price,
            description: formData.description || '',
            available: formData.available || false,
            imageUrl: formData.imageUrl || '',
        };
        onSave(itemToSave);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Plato' : 'Añadir Plato'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required placeholder="Nombre del Plato" className={inputClass} />
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="category" value={formData.category || ''} onChange={handleChange} required placeholder="Categoría" className={inputClass} />
                    <input type="number" step="0.01" name="price" value={formData.price || ''} onChange={handleChange} required placeholder="Precio ($)" className={inputClass} />
                </div>
                <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} placeholder="Descripción" className={inputClass}></textarea>

                <div className="border border-dashed border-gray-300 rounded-lg p-4 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300 cursor-pointer" />
                    {formData.imageUrl && <img src={formData.imageUrl} alt="preview" loading="eager" className="mt-4 w-full h-32 object-cover rounded-lg shadow-sm border border-gray-200 dark:border-gray-700" />}
                </div>

                <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100 dark:bg-dark-700 dark:border-dark-600">
                    <input type="checkbox" name="available" id="available" checked={formData.available || false} onChange={handleChange} className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500" />
                    <label htmlFor="available" className="ml-2 font-medium text-gray-700 dark:text-gray-200 text-sm">Disponible para ordenar</label>
                </div>

                <div className="flex justify-end pt-4 gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-200 font-medium">Cancelar</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">{isEditing ? 'Guardar' : 'Crear'}</button>
                </div>
            </form>
        </Modal>
    );
};

const MenuManagement: React.FC<MenuManagementProps> = ({ menuItems, setMenuItems }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

    const handleOpenModal = (item: MenuItem | null = null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleSaveItem = (itemToSave: MenuItem) => {
        setMenuItems(prev => {
            const exists = prev.some(item => item.id === itemToSave.id);
            if (exists) {
                return prev.map(item => item.id === itemToSave.id ? itemToSave : item);
            }
            return [...prev, itemToSave];
        });
    };

    const handleDeleteItem = (id: string) => {
        if (window.confirm('¿Seguro que quieres eliminar este plato?')) {
            setMenuItems(prev => prev.filter(item => item.id !== id));
        }
    };

    const handleToggleAvailability = async (itemToToggle: MenuItem) => {
        const updatedItem = { ...itemToToggle, available: !itemToToggle.available };

        // Actualizar UI inmediatamente (optimistic update)
        setMenuItems(prev => prev.map(item => item.id === itemToToggle.id ? updatedItem : item));

        // Persistir en el backend
        try {
            logger.info('Updating menu item availability', { id: itemToToggle.id, available: updatedItem.available });
            await api.menu.update(itemToToggle.id, updatedItem);
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
                                                <img src={item.imageUrl || 'https://via.placeholder.com/80'} alt={item.name} loading="eager" className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover shadow-sm bg-gray-100 border border-gray-100 dark:border-gray-700" />
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