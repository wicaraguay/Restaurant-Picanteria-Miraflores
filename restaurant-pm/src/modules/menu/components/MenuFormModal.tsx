/**
 * @file MenuFormModal.tsx
 * @description Modal para crear o editar platos del menú.
 * Incluye soporte para subida de imágenes a Cloudinary y feedback visual mejorado.
 * Este archivo pertenece al módulo de menú (menu).
 */
import React, { useState } from 'react';
import { MenuItem } from '../types/menu.types';
import Modal from '../../../components/ui/Modal';
import { uploadToCloudinary } from '../../../utils/cloudinary';
import { logger } from '../../../utils/logger';
import { Validators } from '../../../utils/validators';
import { toast } from '../../../components/ui/AlertProvider';

const inputClass = "w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-900 text-sm font-medium focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-gray-700 dark:bg-dark-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500 dark:focus:bg-dark-900 dark:focus:ring-blue-500/10";

export interface MenuFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: MenuItem) => void;
    item: MenuItem | null;
}

export const MenuFormModal: React.FC<MenuFormModalProps> = ({ isOpen, onClose, onSave, item }) => {
    const [formData, setFormData] = useState<Partial<MenuItem>>({});
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const isEditing = item !== null;

    React.useEffect(() => {
        if (isOpen) {
            setFormData(isEditing ? { ...item } : { name: '', category: '', price: 0, description: '', available: true, imageUrl: '' });
            setImageFile(null);
            setIsUploading(false);
            setErrors({});
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
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        
        const nameVal = Validators.required(formData.name, 'Nombre');
        if (!nameVal.valid) newErrors.name = nameVal.error!;

        const categoryVal = Validators.required(formData.category, 'Categoría');
        if (!categoryVal.valid) newErrors.category = categoryVal.error!;

        const priceVal = Validators.positiveNumber(formData.price || 0, 'Precio');
        if (!priceVal.valid) newErrors.price = priceVal.error!;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

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
                name: formData.name,
                category: formData.category,
                price: formData.price,
                description: formData.description || '',
                available: formData.available || false,
                imageUrl: finalImageUrl,
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Plato' : 'Añadir Plato'}>
            <form onSubmit={handleSubmit} className="space-y-5 py-2">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 block ml-1">Nombre del Plato</label>
                    <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required placeholder="Ej: Ceviche Mixto" className={`${inputClass} ${errors.name ? 'border-red-500 ring-4 ring-red-500/10' : ''}`} />
                    {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 block ml-1">Categoría</label>
                        <input type="text" name="category" value={formData.category || ''} onChange={handleChange} required placeholder="Ej: Entradas" className={`${inputClass} ${errors.category ? 'border-red-500 ring-4 ring-red-500/10' : ''}`} />
                        {errors.category && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase">{errors.category}</p>}
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 block ml-1">Precio ($)</label>
                        <input type="number" step="0.01" name="price" value={formData.price || ''} onChange={handleChange} required placeholder="0.00" className={`${inputClass} ${errors.price ? 'border-red-500 ring-4 ring-red-500/10' : ''}`} />
                        {errors.price && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase">{errors.price}</p>}
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 block ml-1">Descripción</label>
                    <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} placeholder="Describe los ingredientes y el sabor..." className={inputClass}></textarea>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5 block ml-1">Imagen del Plato</label>
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

                <div className="flex items-center p-4 bg-gray-50 dark:bg-dark-900/50 rounded-2xl border border-gray-100 dark:border-dark-800 transition-all hover:border-blue-500/30">
                    <input type="checkbox" name="available" id="available" checked={formData.available || false} onChange={handleChange} className="h-6 w-6 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500 dark:bg-dark-800 dark:border-dark-700 transition-all cursor-pointer" />
                    <label htmlFor="available" className="ml-3 font-black text-gray-700 dark:text-gray-200 text-[10px] uppercase tracking-widest cursor-pointer">Disponible inmediatamente</label>
                </div>

                <div className="flex justify-end pt-6 gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-3 rounded-2xl bg-gray-100 dark:bg-dark-800 text-gray-500 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-dark-700 transition-all active:scale-95" disabled={isUploading}>Cancelar</button>
                    <button type="submit" className="px-8 py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2" disabled={isUploading}>
                        {isUploading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Procesando...
                            </>
                        ) : (
                            isEditing ? 'Actualizar Plato' : 'Crear Plato'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
