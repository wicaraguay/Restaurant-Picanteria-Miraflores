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

// ==========================================
// CONFIGURACIÓN DE CLOUDINARY
// ==========================================
// 1. Ve a https://cloudinary.com/ y crea una cuenta gratis.
// 2. Ve a Settings > Upload > Upload presets y crea uno nuevo (Mode: Unsigned).
// 3. Pega tus credenciales aquí abajo:

const CLOUDINARY_CLOUD_NAME = 'dxxf1gy0f';
const CLOUDINARY_UPLOAD_PRESET = 'picanteria-miraflores';

const uploadToCloudinary = async (file: File): Promise<string> => {
    // Validación básica: asegurarse que no estén vacíos (pero permitir los valores del usuario)
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        throw new Error('CONFIG_MISSING');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Error al subir imagen a Cloudinary');
    }

    const data = await response.json();
    return data.secure_url;
};

interface MenuFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: MenuItem) => void;
    item: MenuItem | null;
}

const MenuFormModal: React.FC<MenuFormModalProps> = ({ isOpen, onClose, onSave, item }) => {
    const [formData, setFormData] = useState<Partial<MenuItem>>({});
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const isEditing = item !== null;

    React.useEffect(() => {
        if (isOpen) {
            setFormData(isEditing ? { ...item } : { name: '', category: '', price: 0, description: '', available: true, imageUrl: '' });
            setImageFile(null);
            setIsUploading(false);
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
            setImageFile(file);
            // Mostrar previsualización local mientras se sube
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.category || formData.price === undefined) return alert('Nombre, Categoría y Precio son obligatorios.');

        console.log('--- INICIO GUARDADO ---');
        console.log('Tiene archivo nuevo?', !!imageFile);

        setIsUploading(true);
        let finalImageUrl = formData.imageUrl || '';

        try {
            if (imageFile) {
                try {
                    console.log('Subiendo a Cloudinary...');
                    finalImageUrl = await uploadToCloudinary(imageFile);
                    console.log('Subida exitosa. URL:', finalImageUrl);
                } catch (error: any) {
                    console.error('Error Cloudinary:', error);
                    setIsUploading(false);
                    if (error.message === 'CONFIG_MISSING') {
                        alert('¡FALTAN LAS CREDENCIALES DE CLOUDINARY!\n\nPor favor, abre el archivo "components/MenuManagement.tsx" y coloca tu Cloud Name y Upload Preset en las líneas 16 y 17.');
                    } else {
                        alert('Error al subir la imagen: ' + error.message);
                    }
                    return;
                }
            } else {
                console.log('No hay archivo nuevo, usando URL existente:', finalImageUrl ? finalImageUrl.substring(0, 50) + '...' : 'Ninguna');
            }

            const itemToSave: MenuItem = {
                id: item?.id || Date.now().toString(),
                name: formData.name,
                category: formData.category,
                price: formData.price,
                description: formData.description || '',
                available: formData.available || false,
                imageUrl: finalImageUrl,
            };

            console.log('Guardando item con imagen:', itemToSave.imageUrl ? itemToSave.imageUrl.substring(0, 50) + '...' : 'Ninguna');
            await onSave(itemToSave); // Added await to catch if onSave fails
            onClose();
        } catch (error) {
            logger.error('Error in form submission', error);
            alert('Ocurrió un error inesperado.');
        } finally {
            setIsUploading(false);
        }
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
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-200 font-medium" disabled={isUploading}>Cancelar</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium flex items-center" disabled={isUploading}>
                        {isUploading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isEditing ? 'Guardando...' : 'Creando...'}
                            </>
                        ) : (
                            isEditing ? 'Guardar' : 'Crear'
                        )}
                    </button>
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
                savedItem = await api.menu.update(itemToSave.id, itemToSave);

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

                savedItem = await api.menu.create(newItemData);

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
                await api.menu.delete(id);
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