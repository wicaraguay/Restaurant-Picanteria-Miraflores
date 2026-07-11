/**
 * @file MenuFormModal.tsx
 * @description Modal para crear o editar platos del menú.
 * Flujo optimizado para el empleado: autofocus, detección instantánea de platos
 * duplicados (contra el menú ya cargado, sin red), validación al salir de cada
 * campo, panel de contexto al editar y guardado solo cuando hay cambios.
 * Incluye soporte para subida de imágenes a Cloudinary.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem } from '../types/menu.types';
import Modal from '../../../components/ui/Modal';
import { uploadToCloudinary, optimizeImage } from '../../../utils/cloudinary';
import { sriItemCode } from '../../../utils/sriItemCode';
import { logger } from '../../../utils/logger';
import { Validators } from '../../../utils/validators';
import { toast } from '../../../components/ui/AlertProvider';
import { api } from '../../../api';
import { Category } from '../../categories/types/category.types';

const inputClass = "w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-900 text-sm font-medium focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-gray-700 dark:bg-dark-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500 dark:focus:bg-dark-900 dark:focus:ring-blue-500/10";
const labelClass = "text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 block ml-1";
const errorClass = "text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase";
const optionalTag = <span className="normal-case font-bold text-gray-300 dark:text-gray-600">· opcional</span>;

/** Convierte el texto del precio a número, aceptando coma o punto como separador decimal. */
const parsePrice = (v: unknown): number => parseFloat(String(v ?? '').replace(',', '.')) || 0;

/** Nombre normalizado para comparar duplicados: sin espacios extra ni mayúsculas. */
const normalizeName = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

export interface MenuFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: MenuItem) => void;
    item: MenuItem | null;
    /** Menú actual — permite detectar platos duplicados al instante, sin red. */
    menuItems?: MenuItem[];
    /** Cuando el nombre digitado ya pertenece a otro plato, permite saltar a editarlo. */
    onEditExisting?: (item: MenuItem) => void;
}

export const MenuFormModal: React.FC<MenuFormModalProps> = ({ isOpen, onClose, onSave, item, menuItems, onEditExisting }) => {
    const [formData, setFormData] = useState<Partial<MenuItem>>({});
    const [initialSnapshot, setInitialSnapshot] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const isEditing = item !== null;

    // Snapshot comparable del formulario — para saber si el empleado cambió algo
    const snapshot = (data: Partial<MenuItem>): string => JSON.stringify({
        name: data.name || '',
        categoryId: data.categoryId || '',
        category: data.category || '',
        price: String(data.price ?? ''),
        description: data.description || '',
        available: !!data.available,
        imageUrl: data.imageUrl || '',
        taxRate: Number(data.taxRate ?? 15)
    });

    // Load categories when modal opens
    useEffect(() => {
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen]);

    const loadCategories = async () => {
        setLoadingCategories(true);
        try {
            const data = await api.categories.getAll();
            setCategories(data);
        } catch (error) {
            logger.error('Error loading categories', error);
            // Fallback: allow text input if categories fail to load
        } finally {
            setLoadingCategories(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            const initial = isEditing ? { ...item } : { name: '', category: '', categoryId: '', price: undefined, description: '', available: true, imageUrl: '', taxRate: 15 };
            setFormData(initial);
            setInitialSnapshot(snapshot(initial));
            setImageFile(null);
            setIsUploading(false);
            setErrors({});
        }
    }, [isOpen, item, isEditing]);

    const isDirty = snapshot(formData) !== initialSnapshot || imageFile !== null;

    // Plato duplicado: mismo nombre normalizado en otro id. Búsqueda local
    // instantánea — el menú ya está en memoria.
    const duplicate = useMemo(() => {
        const name = normalizeName(formData.name || '');
        if (!name || !menuItems?.length) return null;
        return menuItems.find(m => m.id !== item?.id && normalizeName(m.name) === name) || null;
    }, [formData.name, menuItems, item]);

    const validateField = (field: string, data: Partial<MenuItem>): string | null => {
        switch (field) {
            case 'name':
                return Validators.required(data.name, 'Nombre').valid ? null : 'Nombre es requerido';
            case 'category':
                return Validators.required(data.category, 'Categoría').valid ? null : 'Categoría es requerida';
            case 'price':
                return Validators.positiveNumber(parsePrice(data.price), 'Precio').valid ? null : 'Precio debe ser mayor a 0';
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

    const clearErrorIfFixed = (field: string, data: Partial<MenuItem>) => {
        if (errors[field] && !validateField(field, data)) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (name === 'categoryId') {
            // When category is selected, update both categoryId and category (name)
            const selectedCategory = categories.find(c => c.id === value);
            const next = { categoryId: value, category: selectedCategory?.name || formData.category || '' };
            setFormData(prev => ({ ...prev, ...next }));
            clearErrorIfFixed('category', { ...formData, ...next });
        } else if (name === 'price') {
            // Precio como TEXTO controlado: solo dígitos y UN separador decimal
            // (coma o punto — los teclados en español usan coma), máx. 2 decimales.
            // Con type="number" el navegador reporta "" en estados intermedios como
            // "0," o "0." y React borraba lo tecleado al re-renderizar.
            if (/^\d*([.,]\d{0,2})?$/.test(value)) {
                setFormData(prev => ({ ...prev, price: value as unknown as number }));
                clearErrorIfFixed('price', { ...formData, price: value as unknown as number });
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
            clearErrorIfFixed(name, { ...formData, [name]: value });
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
        (['name', 'category', 'price'] as const).forEach(field => {
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

            const itemToSave: MenuItem = {
                id: item?.id || Date.now().toString(),
                name: (formData.name || '').trim(),
                category: (formData.category || '').trim(),
                categoryId: formData.categoryId,
                price: parsePrice(formData.price),
                description: formData.description || '',
                available: formData.available || false,
                imageUrl: finalImageUrl,
                taxRate: Number(formData.taxRate ?? 15),
            };

            await onSave(itemToSave);
            onClose();
        } catch (error) {
            logger.error('Error in form submission', error);
            toast.error('No se pudo guardar el plato. Intenta nuevamente.', 'Error');
        } finally {
            setIsUploading(false);
        }
    };

    const submitDisabled = isUploading || !!duplicate || (isEditing && !isDirty);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Plato' : 'Añadir Plato'}>
            <form autoComplete="off" onSubmit={handleSubmit} className="space-y-5 py-2">
                {/* Panel de contexto: QUÉ plato se está editando */}
                {isEditing && item && (
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-900">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-800 flex items-center justify-center shrink-0">
                            {item.imageUrl ? (
                                <img src={optimizeImage(item.imageUrl, 100)} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xl">🍽️</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="font-black text-gray-900 dark:text-white uppercase tracking-tighter truncate">{item.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                ${item.price.toFixed(2)} · SRI <span className="font-mono normal-case">{sriItemCode(item)}</span>
                            </p>
                        </div>
                    </div>
                )}

                <div>
                    <label className={labelClass}>Nombre del Plato</label>
                    <input type="text" name="name" autoFocus value={formData.name || ''} onChange={handleChange} onBlur={() => handleBlur('name')} required placeholder="Ej: Ceviche Mixto" className={`${inputClass} ${errors.name ? 'border-red-500 ring-4 ring-red-500/10' : ''}`} />
                    {errors.name && <p className={errorClass}>{errors.name}</p>}

                    {duplicate && (
                        <div className="mt-2 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
                            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase leading-snug">
                                Ya existe: <span className="font-black">{duplicate.name}</span> (${duplicate.price.toFixed(2)})
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className={labelClass}>Categoría</label>
                        {categories.length > 0 ? (
                            <select
                                name="categoryId"
                                value={formData.categoryId || ''}
                                onChange={handleChange}
                                onBlur={() => handleBlur('category')}
                                required
                                className={`${inputClass} ${errors.category ? 'border-red-500 ring-4 ring-red-500/10' : ''}`}
                                disabled={loadingCategories}
                            >
                                <option value="">Seleccionar categoría...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name} {cat.productType === 'retail' ? '(Retail)' : ''}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                name="category"
                                value={formData.category || ''}
                                onChange={handleChange}
                                onBlur={() => handleBlur('category')}
                                required
                                placeholder={loadingCategories ? 'Cargando...' : 'Ej: Entradas'}
                                className={`${inputClass} ${errors.category ? 'border-red-500 ring-4 ring-red-500/10' : ''}`}
                                disabled={loadingCategories}
                            />
                        )}
                        {errors.category && <p className={errorClass}>{errors.category}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>Precio</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm pointer-events-none">$</span>
                            <input type="text" inputMode="decimal" name="price" value={formData.price ?? ''} onChange={handleChange} onBlur={() => handleBlur('price')} required placeholder="0.00" className={`${inputClass} pl-8 ${errors.price ? 'border-red-500 ring-4 ring-red-500/10' : ''}`} />
                        </div>
                        {errors.price && <p className={errorClass}>{errors.price}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>IVA del Producto</label>
                        <select name="taxRate" value={formData.taxRate ?? 15} onChange={handleChange} className={inputClass}>
                            <option value={15}>15% IVA</option>
                            <option value={12}>12% IVA</option>
                            <option value={5}>5% IVA</option>
                            <option value={0}>0% IVA (Exento)</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <div className="w-full flex items-center p-4 bg-gray-50 dark:bg-dark-900/50 rounded-2xl border border-gray-100 dark:border-dark-800 transition-all hover:border-blue-500/30">
                            <input type="checkbox" name="available" id="available" checked={formData.available || false} onChange={handleChange} className="h-6 w-6 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500 dark:bg-dark-800 dark:border-dark-700 transition-all cursor-pointer" />
                            <label htmlFor="available" className="ml-3 font-black text-gray-700 dark:text-gray-200 text-[10px] uppercase tracking-widest cursor-pointer">Disponible</label>
                        </div>
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Descripción {optionalTag}</label>
                    <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} placeholder="Describe los ingredientes y el sabor..." className={inputClass}></textarea>
                </div>

                <div>
                    <label className={labelClass}>Imagen del Plato {optionalTag}</label>
                    <div className="relative group overflow-hidden border-2 border-dashed border-gray-200 dark:border-dark-700 rounded-3xl p-6 transition-all hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                        <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
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

                <div className="flex justify-end pt-6 gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-3 rounded-2xl bg-gray-100 dark:bg-dark-800 text-gray-500 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-dark-700 transition-all active:scale-95" disabled={isUploading}>Cancelar</button>
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
                            isEditing ? (isDirty ? 'Actualizar Plato' : 'Sin cambios') : 'Crear Plato'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
