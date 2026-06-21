/**
 * @file CategoryManagement.tsx
 * @description Componente principal de gestión de categorías.
 * Permite visualizar, crear, editar, eliminar y reordenar categorías.
 */
import React, { useState, useEffect } from 'react';
import { Category, ProductType } from '../types/category.types';
import { PlusIcon, EditIcon, TrashIcon, EyeIcon, EyeOffIcon, ChevronDownIcon } from '../../../components/ui/Icons';
import { categoryService } from '../services/categoryService';
import { logger } from '../../../utils/logger';
import { toast } from '../../../components/ui/AlertProvider';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import Card from '../../../components/ui/Card';
import { CategoryFormModal } from './CategoryFormModal';

const CategoryManagement: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
    const [filterType, setFilterType] = useState<ProductType | 'all'>('all');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadCategories();
    }, [filterType]);

    const loadCategories = async () => {
        try {
            setIsLoading(true);
            const params = filterType !== 'all' ? { productType: filterType } : {};
            const data = await categoryService.getAll(params);
            setCategories(data.sort((a, b) => a.sortOrder - b.sortOrder));
            logger.info('Categories loaded successfully', { count: data.length, filter: filterType });
        } catch (error) {
            logger.error('Failed to load categories', error);
            toast.error('No se pudieron cargar las categorías.', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (category: Category | null = null) => {
        setEditingCategory(category);
        setIsModalOpen(true);
    };

    const handleSaveCategory = async (categoryToSave: Category) => {
        try {
            const exists = categories.some(cat => cat.id === categoryToSave.id);
            let savedCategory: Category;

            if (exists) {
                logger.info('Updating category', { id: categoryToSave.id, name: categoryToSave.name });
                savedCategory = await categoryService.update(categoryToSave.id, categoryToSave);
                setCategories(prev => prev.map(cat => cat.id === categoryToSave.id ? savedCategory : cat));
                toast.success('Categoría actualizada correctamente', 'Éxito');
                logger.info('Category updated successfully');
            } else {
                const { id, ...newCategoryData } = categoryToSave;
                logger.info('Creating new category', { name: newCategoryData.name });
                savedCategory = await categoryService.create(newCategoryData);
                setCategories(prev => [...prev, savedCategory].sort((a, b) => a.sortOrder - b.sortOrder));
                toast.success('Nueva categoría añadida', 'Éxito');
                logger.info('Category created successfully');
            }
        } catch (error: any) {
            logger.error('Failed to save category', error);
            const errorMessage = error?.response?.data?.message || 'No se pudo guardar la categoría. Intenta nuevamente.';
            toast.error(errorMessage, 'Error');
        }
    };

    const handleDeleteCategory = (id: string) => {
        setConfirmDelete({ isOpen: true, id });
    };

    const confirmDeleteCategory = async () => {
        if (!confirmDelete.id) return;
        try {
            logger.info('Deleting category', { id: confirmDelete.id });
            await categoryService.delete(confirmDelete.id);
            setCategories(prev => prev.filter(cat => cat.id !== confirmDelete.id));
            toast.success('Categoría eliminada', 'Éxito');
            logger.info('Category deleted successfully');
            setConfirmDelete({ isOpen: false, id: null });
        } catch (error: any) {
            logger.error('Failed to delete category', error);
            const errorMessage = error?.response?.data?.message || 'No se pudo eliminar la categoría.';
            toast.error(errorMessage, 'Error');
        }
    };

    const handleToggleVisibility = async (category: Category) => {
        const updatedCategory = { ...category, visibleOnWebsite: !category.visibleOnWebsite };

        // Actualizar UI inmediatamente (optimistic update)
        setCategories(prev => prev.map(cat => cat.id === category.id ? updatedCategory : cat));

        // Persistir en el backend
        try {
            logger.info('Updating category visibility', { id: category.id, visibleOnWebsite: updatedCategory.visibleOnWebsite });
            await categoryService.update(category.id, { visibleOnWebsite: updatedCategory.visibleOnWebsite });
            toast.info(`Categoría ${updatedCategory.visibleOnWebsite ? 'visible' : 'oculta'} en el sitio web`, 'Estado');
            logger.info('Category visibility updated successfully');
        } catch (error) {
            logger.error('Failed to update category visibility', error);
            // Revertir el cambio si falla
            setCategories(prev => prev.map(cat => cat.id === category.id ? category : cat));
            toast.error('No se pudo actualizar la visibilidad de la categoría.', 'Error');
        }
    };

    const handleToggleAvailability = async (category: Category) => {
        const updatedCategory = { ...category, available: !category.available };

        // Actualizar UI inmediatamente (optimistic update)
        setCategories(prev => prev.map(cat => cat.id === category.id ? updatedCategory : cat));

        // Persistir en el backend
        try {
            logger.info('Updating category availability', { id: category.id, available: updatedCategory.available });
            await categoryService.update(category.id, { available: updatedCategory.available });
            toast.info(`Categoría ${updatedCategory.available ? 'activada' : 'desactivada'}`, 'Estado');
            logger.info('Category availability updated successfully');
        } catch (error) {
            logger.error('Failed to update category availability', error);
            // Revertir el cambio si falla
            setCategories(prev => prev.map(cat => cat.id === category.id ? category : cat));
            toast.error('No se pudo actualizar el estado de la categoría.', 'Error');
        }
    };

    const handleReorder = async (categoryId: string, direction: 'up' | 'down') => {
        const currentIndex = categories.findIndex(cat => cat.id === categoryId);
        if (currentIndex === -1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= categories.length) return;

        // Crear nueva lista con el orden intercambiado
        const newCategories = [...categories];
        [newCategories[currentIndex], newCategories[newIndex]] = [newCategories[newIndex], newCategories[currentIndex]];

        // Actualizar sortOrder basado en la nueva posición
        const reorderedCategories = newCategories.map((cat, index) => ({ ...cat, sortOrder: index }));

        // Actualizar UI inmediatamente (optimistic update)
        setCategories(reorderedCategories);

        // Persistir en el backend
        try {
            logger.info('Reordering categories', { categoryId, direction });
            const orders = reorderedCategories.map(cat => ({ id: cat.id, sortOrder: cat.sortOrder }));
            await categoryService.reorder(orders);
            toast.info('Orden actualizado correctamente', 'Éxito');
            logger.info('Categories reordered successfully');
        } catch (error) {
            logger.error('Failed to reorder categories', error);
            // Revertir el cambio si falla
            setCategories(categories);
            toast.error('No se pudo actualizar el orden de las categorías.', 'Error');
        }
    };

    const getProductTypeBadge = (type: ProductType) => {
        return type === 'menu'
            ? <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest">Menú</span>
            : <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest">Retail</span>;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <CategoryFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveCategory}
                category={editingCategory}
            />

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null })}
                onConfirm={confirmDeleteCategory}
                title="Eliminar Categoría"
                message="¿Estás seguro de que deseas eliminar esta categoría? Esta acción no se puede deshacer y puede afectar los productos asociados."
                confirmText="Eliminar"
                type="danger"
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase mb-1">
                        Gestión de Categorías
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        Organiza y personaliza las categorías de productos de tu restaurante.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 w-full sm:w-auto justify-center"
                >
                    <PlusIcon className="w-5 h-5" /> Añadir Categoría
                </button>
            </div>

            <div className="mb-6 flex gap-3">
                <button
                    onClick={() => setFilterType('all')}
                    className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-100 dark:bg-dark-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-700'}`}
                >
                    Todas
                </button>
                <button
                    onClick={() => setFilterType('menu')}
                    className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${filterType === 'menu' ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-gray-100 dark:bg-dark-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-700'}`}
                >
                    Menú
                </button>
                <button
                    onClick={() => setFilterType('retail')}
                    className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${filterType === 'retail' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-100 dark:bg-dark-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-700'}`}
                >
                    Retail
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                </div>
            ) : categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 dark:bg-dark-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-dark-800">
                    <div className="text-6xl mb-4">📂</div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">No hay categorías</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Comienza añadiendo tu primera categoría.</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="mt-6 text-blue-600 dark:text-blue-400 font-black text-sm uppercase tracking-widest hover:underline"
                    >
                        Añadir Categoría Ahora
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categories.map((category, index) => (
                        <Card key={category.id}>
                            <div className="space-y-4">
                                {category.imageUrl && (
                                    <img
                                        src={category.imageUrl}
                                        alt={category.name}
                                        className="w-full h-40 object-cover rounded-xl shadow-md"
                                    />
                                )}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                                            {category.name}
                                        </h3>
                                        {category.description && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                {category.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleReorder(category.id, 'up')}
                                            disabled={index === 0}
                                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            title="Subir"
                                        >
                                            <ChevronDownIcon className="w-4 h-4 rotate-180" />
                                        </button>
                                        <button
                                            onClick={() => handleReorder(category.id, 'down')}
                                            disabled={index === categories.length - 1}
                                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                            title="Bajar"
                                        >
                                            <ChevronDownIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {getProductTypeBadge(category.productType)}
                                    <span className="px-3 py-1 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        Orden: {category.sortOrder}
                                    </span>
                                    {category.productCount !== undefined && (
                                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            {category.productCount} productos
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <button
                                        onClick={() => handleToggleVisibility(category)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                            category.visibleOnWebsite
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : 'bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400'
                                        }`}
                                        title={category.visibleOnWebsite ? 'Visible en web' : 'Oculto en web'}
                                    >
                                        {category.visibleOnWebsite ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
                                        Web
                                    </button>
                                    <button
                                        onClick={() => handleToggleAvailability(category)}
                                        className={`flex-1 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                            category.available
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                        }`}
                                    >
                                        {category.available ? 'Activa' : 'Inactiva'}
                                    </button>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => handleOpenModal(category)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                                    >
                                        <EditIcon className="w-4 h-4" /> Editar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCategory(category.id)}
                                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                                        title="Eliminar"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CategoryManagement;
