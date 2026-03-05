/**
 * @file RoleFormModal.tsx
 * @description Modal para crear o editar roles y permisos del sistema.
 */
import React, { useState, useEffect } from 'react';
import { ViewType } from '../../../types';
import { Role } from '../types/hr.types';
import { NAV_ITEMS } from '../../../constants';
import Modal from '../../../components/ui/Modal';

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

export interface RoleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (role: Role) => void;
    role: Role | null;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({ isOpen, onClose, onSave, role }) => {
    const [formData, setFormData] = useState<Partial<Role>>({});
    const isEditing = role !== null;

    useEffect(() => {
        if (isOpen) setFormData(isEditing ? { ...role } : { name: '', permissions: {} });
    }, [isOpen, role, isEditing]);

    const handlePermissionChange = (view: ViewType, isChecked: boolean) => {
        setFormData(prev => ({ ...prev, permissions: { ...prev.permissions, [view]: isChecked } }));
    };

    const handleSave = () => {
        if (formData.name) {
            const roleToSave: any = {
                name: formData.name,
                permissions: formData.permissions || {},
            };

            // Solo incluir ID si estamos editando
            if (isEditing && role?.id) {
                roleToSave.id = role.id;
            }

            onSave(roleToSave);
            onClose();
        } else alert('El nombre del rol es obligatorio.');
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? `Editar Rol` : 'AÃ±adir Rol'}>
            <div className="space-y-4">
                <input type="text" value={formData.name || ''} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} disabled={isEditing && role?.name === 'Administrador'} required placeholder="Nombre del Rol" className={inputClass} />
                <div>
                    <label className="block text-sm font-medium dark:text-gray-300 mb-2">Permisos de Acceso</label>
                    <div className="grid grid-cols-2 gap-3">
                        {NAV_ITEMS.map(item => (
                            <div key={item.id} className="flex items-center p-3 border rounded-lg bg-gray-50 dark:bg-dark-700/50 dark:border-dark-600 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
                                <input type="checkbox" id={`perm-${item.view}`} checked={formData.permissions?.[item.view] || false} onChange={(e) => handlePermissionChange(item.view, e.target.checked)} className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                <label htmlFor={`perm-${item.view}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer w-full select-none">{item.shortLabel}</label>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end pt-4 gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-200 font-medium">Cancelar</button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">Guardar</button>
                </div>
            </div>
        </Modal>
    );
};
