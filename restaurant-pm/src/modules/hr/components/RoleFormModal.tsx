/**
 * @file RoleFormModal.tsx
 * @description Modal para crear o editar roles y permisos del sistema.
 */
import React, { useState, useEffect } from 'react';
import { ViewType } from '../../../types';
import { Role } from '../types/hr.types';
import { NAV_ITEMS } from '../../../constants';
import Modal from '../../../components/ui/Modal';

const inputClass = "w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 text-gray-900 text-sm font-bold focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-dark-700 dark:bg-dark-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500 dark:focus:bg-dark-900 dark:focus:ring-blue-500/10";
const labelClass = "block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1";
const errorClass = "text-[10px] font-bold text-red-500 mt-1 ml-1 animate-pulse";

export interface RoleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (role: Role) => void;
    role: Role | null;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({ isOpen, onClose, onSave, role }) => {
    const [formData, setFormData] = useState<Partial<Role>>({});
    const [error, setError] = useState<string | null>(null);
    const isEditing = role !== null;

    useEffect(() => {
        if (isOpen) {
            setError(null);
            setFormData(isEditing ? { ...role } : { name: '', permissions: {} });
        }
    }, [isOpen, role, isEditing]);

    const handlePermissionChange = (view: ViewType, isChecked: boolean) => {
        setFormData(prev => ({ ...prev, permissions: { ...prev.permissions, [view]: isChecked } }));
    };

    const handleSave = () => {
        if (!formData.name?.trim()) {
            setError('El nombre del rol es obligatorio.');
            return;
        }

        const roleToSave: any = {
            name: formData.name.trim(),
            permissions: formData.permissions || {},
        };

        if (isEditing && role?.id) {
            roleToSave.id = role.id;
        }

        onSave(roleToSave);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'EDITAR ROL' : 'AÑADIR ROL'}>
            <div className="space-y-6">
                <div>
                    <label className={labelClass}>Nombre del Rol</label>
                    <input 
                        type="text" 
                        value={formData.name || ''} 
                        onChange={(e) => {
                            setFormData(p => ({ ...p, name: e.target.value }));
                            if (error) setError(null);
                        }} 
                        disabled={isEditing && role?.name === 'Administrador'} 
                        required 
                        placeholder="Ej: Administrador, Cocinero, Mesero" 
                        className={`${inputClass} ${error ? 'border-red-400 focus:border-red-500' : ''}`} 
                    />
                    {error && <p className={errorClass}>{error}</p>}
                </div>

                <div>
                    <label className={labelClass}>Permisos de Acceso</label>
                    <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto px-1 custom-scrollbar">
                        {NAV_ITEMS.map(item => (
                            <div 
                                key={item.id} 
                                className="flex items-center p-4 border rounded-2xl bg-gray-50/50 dark:bg-dark-900 dark:border-dark-700/50 hover:bg-white dark:hover:bg-dark-800 hover:border-blue-500/30 transition-all cursor-pointer group"
                                onClick={() => handlePermissionChange(item.view, !formData.permissions?.[item.view])}
                            >
                                <input 
                                    type="checkbox" 
                                    id={`perm-${item.view}`} 
                                    checked={formData.permissions?.[item.view] || false} 
                                    onChange={(e) => handlePermissionChange(item.view, e.target.checked)} 
                                    className="h-5 w-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500 transition-all cursor-pointer" 
                                />
                                <label 
                                    htmlFor={`perm-${item.view}`} 
                                    className="ml-3 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 cursor-pointer w-full select-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                                >
                                    {item.label}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-4 gap-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-8 py-4 rounded-2xl bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-dark-700 dark:text-gray-400 font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSave} 
                        className="px-10 py-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        {isEditing ? 'Actualizar' : 'Crear Rol'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
