/**
 * @file CategoryFormModal.tsx
 * @description Modal para crear o editar categorías.
 * Mismo patrón que Clientes y Menú: autofocus, detección instantánea de
 * duplicados, validación al salir del campo, panel de contexto al editar y
 * guardado solo cuando hay cambios. El orden ya no se digita: las flechas de
 * la sección lo manejan y las categorías nuevas van al final automáticamente.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Category, ProductType } from '../types/category.types';
import Modal from '../../../components/ui/Modal';
import { uploadToCloudinary, optimizeImage } from '../../../utils/cloudinary';
import { logger } from '../../../utils/logger';
import { Validators } from '../../../utils/validators';
import { toast } from '../../../components/ui/AlertProvider';

const inputClass = "w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-900 text-sm font-medium focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-gray-700 dark:bg-dark-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500 dark:focus:bg-dark-900 dark:focus:ring-blue-500/10";
const labelClass = "text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 block ml-1";
const errorClass = "text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase";
const optionalTag = <span className="normal-case font-bold text-gray-300 dark:text-gray-600">· opcional</span>;

/** Nombre normalizado para comparar duplicados: sin espacios extra ni mayúsculas. */
const normalizeName = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

export interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (category: Category) => void;
    category: Category | null;
    /** Categorías actuales — permite detectar duplicados al instante, sin red. */
    categories?: Category[];
    /** Cuando el nombre digitado ya pertenece a otra categoría, permite saltar a editarla. */
    onEditExisting?: (category: Category) => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, onSave, category, categories, onEditExisting }) => {
    const [formData, setFormData] = useState<Partial<Category>>({});
    const [initialSnapshot, setInitialSnapshot] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const isEditing = category !== null;

    // Snapshot comparable — para saber si el empleado cambió algo
    const snapshot = (data: Partial<Category>): string => JSON.stringify({
        name: data.name || '',
        description: data.description || '',
        productType: data.productType || 'menu',
        visibleOnWebsite: data.visibleOnWebsite ?? true,
        available: data.available ?? true,
        imageUrl: data.imageUrl || ''
    });

    useEffect(() => {
        if (isOpen) {
            const initial = isEditing
                ? { ...category }
                : {
                    name: '',
                    description: '',
                    productType: 'menu' as ProductType,
                    visibleOnWebsite: true,
                    available: true,
                    imageUrl: '',
                    sortOrder: 0
                };
            setFormData(initial);
            setInitialSnapshot(snapshot(initial));
            setImageFile(null);
            setIsUploading(false);
            setErrors({});
        }
    }, [isOpen, category, isEditing]);

    const isDirty = snapshot(formData) !== initialSnapshot || imageFile !== null;

    // Categoría duplicada: mismo nombre normalizado en otro id — búsqueda local instantánea
    const duplicate = useMemo(() => {
        const name = normalizeName(formData.name || '');
        if (!name || !categories?.length) return null;
        return categories.find(c => c.id !== category?.id && normalizeName(c.name) === name) || null;
    }, [formData.name, categories, category]);

    const validateField = (field: string, data: Partial<Category>): string | null => {
        switch (field) {
            case 'name':
                return Validators.required(data.name, 'Nombre').valid ? null : 'Nombre es requerido';
            case 'productType':
                return Validators.required(data.productType, 'Tipo de Producto').valid ? null : 'Tipo de producto es requerido';
            default:
                return null;
        }
    };

    const handleBlur = (field: string) => {
        const error = validateField(field, formData);
        setErrors(prev => {
            const next = { ...prev };
            if (error) next[field] = error; else delete next[field];
            return next;
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: newValue }));

        // Si el campo tenía error y quedó corregido, limpiarlo al instante
        if (errors[name] && !validateField(name, { ...formData, [name]: newValue })) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        (['name', 'productType'] as const).forEach(field => {
            const error = validateField(field, formData);
            if (error) newErrors[field] = error;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || duplicate) return;

        setIsUploading(true);
        let finalImageUrl = formData.imageUrl || '';

        try {
            if (imageFile) {
                try {
                    finalImageUrl = await uploadToCloudinary(imageFile);
                } catch (error: any) {
                    logger.error('Error Cloudinary:', error);
                    setIsUploading(false);
                    if (error.message === 'CONFIG_MISSING') {
                        toast.error('Faltan las credenciales de Cloudinary. Verifica la configuración.', 'Error de Configuración');
                    } else {
                        toast.error('Error al subir la imagen: ' + error.message, 'Error de Imagen');
                    }
                    return;
                }
            }

            // Orden: al editar se conserva; al crear va al final (máximo actual + 1)
            const nextSortOrder = isEditing
                ? (category!.sortOrder ?? 0)
                : (categories?.length ? Math.max(...categories.map(c => c.sortOrder ?? 0)) + 1 : 0);

            const categoryToSave: Category = {
                id: category?.id || Date.now().toString(),
                name: formData.name!.trim(),
                description: formData.description || '',
                productType: formData.productType as ProductType,
                visibleOnWebsite: formData.visibleOnWebsite ?? true,
                available: formData.available ?? true,
                imageUrl: finalImageUrl,
                sortOrder: nextSortOrder,
            };

            await onSave(categoryToSave);
            onClose();
        } catch (error) {
            logger.error('Error in form submission', error);
            toast.error('No se pudo guardar la categoría. Intenta nuevamente.', 'Error');
        } finally {
            setIsUploading(false);
        }
    };

    const submitDisabled = isUploading || !!duplicate || (isEditing && !isDirty);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Categoría' : 'Añadir Categoría'}>
            <form autoComplete="off" onSubmit={handleSubmit} className="space-y-5 py-2">
                {/* Panel de contexto: QUÉ categoría se está editando */}
                {isEditing && category && (
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-900">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-800 flex items-center justify-center shrink-0">
                            {category.imageUrl ? (
                                <img src={optimizeImage(category.imageUrl, 100)} alt={category.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xl">📂</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="font-black text-gray-900 dark:text-white uppercase tracking-tighter truncate">{category.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {category.productType === 'menu' ? 'Menú' : 'Retail'}
                                {category.productCount !== undefined && ` · ${category.productCount} producto${category.productCount === 1 ? '' : 's'}`}
                            </p>
                        </div>
                    </div>
                )}

                <div>
                    <label className={labelClass}>Nombre de la Categoría</label>
                    <input
                        type="text"
                        name="name"
                        autoFocus
                        value={formData.name || ''}
                        onChange={handleChange}
                        onBlur={() => handleBlur('name')}
                        required
                        placeholder="Ej: Entradas"
                        className={`${inputClass} ${errors.name ? 'border-red-500 ring-4 ring-red-500/10' : ''}`}
                    />
                    {errors.name && <p className={errorClass}>{errors.name}</p>}

                    {duplicate && (
                        <div className="mt-2 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
                            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase leading-snug">
                                Ya existe: <span className="font-black">{duplicate.name}</span>
                            </p>
                            {onEditExisting && (
                                <button
                                    type="button"
                                    onClick={() => onEditExisting(duplicate)}
                                    className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all active:scale-95"
                                >
                                    Editar
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <label className={labelClass}>Tipo de Producto</label>
                    <select
                        name="productType"
                        value={formData.productType || 'menu'}
                        onChange={handleChange}
                        onBlur={() => handleBlur('productType')}
                        className={`${inputClass} ${errors.productType ? 'border-red-500 ring-4 ring-red-500/10' : ''}`}
                    >
                        <option value="menu">Menú</option>
                        <option value="retail">Retail</option>
                    </select>
                    {errors.productType && <p className={errorClass}>{errors.productType}</p>}
                </div>

                <div>
                    <label className={labelClass}>Descripción {optionalTag}</label>
                    <textarea
                        name="description"
                        value={formData.description || ''}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Describe la categoría..."
                        className={inputClass}
                    ></textarea>
                </div>

                <div>
                    <label className={labelClass}>Imagen de la Categoría {optionalTag}</label>
                    <div className="relative group overflow-hidden border-2 border-dashed border-gray-200 dark:border-dark-700 rounded-3xl p-6 transition-all hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center justify-center text-center">
                            {formData.imageUrl ? (
                                <img src={formData.imageUrl} alt="preview" className="w-full h-40 object-cover rounded-2xl shadow-md mb-2" />
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-3xl">📸</div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Haz clic o arrastra una imagen</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="flex items-center p-4 bg-gray-50 dark:bg-dark-900/50 rounded-2xl border border-gray-100 dark:border-dark-800 transition-all hover:border-blue-500/30">
                        <input
                            type="checkbox"
                            name="visibleOnWebsite"
                            id="visibleOnWebsite"
                            checked={formData.visibleOnWebsite ?? true}
                            onChange={handleChange}
                            className="h-6 w-6 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500 dark:bg-dark-800 dark:border-dark-700 transition-all cursor-pointer"
                        />
                        <label htmlFor="visibleOnWebsite" className="ml-3 font-black text-gray-700 dark:text-gray-200 text-[10px] uppercase tracking-widest cursor-pointer">Visible en la web</label>
                    </div>
                    <div className="flex items-center p-4 bg-gray-50 dark:bg-dark-900/50 rounded-2xl border border-gray-100 dark:border-dark-800 transition-all hover:border-blue-500/30">
                        <input
                            type="checkbox"
                            name="available"
                            id="available"
                            checked={formData.available ?? true}
                            onChange={handleChange}
                            className="h-6 w-6 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500 dark:bg-dark-800 dark:border-dark-700 transition-all cursor-pointer"
                        />
                        <label htmlFor="available" className="ml-3 font-black text-gray-700 dark:text-gray-200 text-[10px] uppercase tracking-widest cursor-pointer">Disponible</label>
                    </div>
                </div>

                <div className="flex justify-end pt-6 gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-2xl bg-gray-100 dark:bg-dark-800 text-gray-500 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-dark-700 transition-all active:scale-95"
                        disabled={isUploading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className={`px-8 py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2 ${submitDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                        disabled={submitDisabled}
                        title={isEditing && !isDirty ? 'No hay cambios por guardar' : undefined}
                    >
                        {isUploading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Procesando...
                            </>
                        ) : (
                            isEditing ? (isDirty ? 'Actualizar Categoría' : 'Sin cambios') : 'Crear Categoría'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
