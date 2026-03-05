/**
 * @file EmployeeFormModal.tsx
 * @description Modal para crear o editar empleados y sus turnos.
 */
import React, { useState, useEffect } from 'react';
import { DAYS_OF_WEEK } from '../../../constants';
import { Employee, Role } from '../types/hr.types';
import Modal from '../../../components/ui/Modal';

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

export interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employee: Employee) => void;
    employee: Employee | null;
    roles: Role[];
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ isOpen, onClose, onSave, employee, roles }) => {
    const [formData, setFormData] = useState<Partial<Employee> & { password?: string }>({});
    const isEditing = employee !== null;

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                const { password, ...employeeData } = employee;
                setFormData({ ...employeeData, password: '' });
            } else {
                setFormData({
                    name: '',
                    username: '',
                    password: '',
                    roleId: roles.length > 0 ? roles[0].id : '',
                    phone: '',
                    salary: 0,
                    shifts: DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: 'Libre' }), {}),
                    equipment: { uniform: true, epp: false }
                });
            }
        }
    }, [isOpen, employee, isEditing, roles]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'number') setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        else setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleShiftChange = (day: string, value: string) => {
        setFormData(prev => ({ ...prev, shifts: { ...prev.shifts, [day]: value } }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.username || (!isEditing && !formData.password)) return alert('Nombre, usuario y contraseÃ±a son obligatorios.');

        const dataToSave: any = {
            name: formData.name,
            username: formData.username,
            roleId: formData.roleId || roles[0].id,
            phone: formData.phone || '',
            salary: formData.salary || 0,
            shifts: formData.shifts || {},
            equipment: formData.equipment || { uniform: false, epp: false },
        };

        // Solo incluir ID si estamos editando
        if (isEditing && employee?.id) {
            dataToSave.id = employee.id;
        }

        if (formData.password) {
            dataToSave.password = formData.password;
        } else if (isEditing && employee?.password) {
            dataToSave.password = employee.password;
        }

        onSave(dataToSave);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Empleado' : 'AÃ±adir Empleado'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required placeholder="Nombre Completo" className={inputClass} />
                    <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="TelÃ©fono" className={inputClass} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="username" value={formData.username || ''} onChange={handleChange} required placeholder="Usuario" className={inputClass} />
                    <input type="password" name="password" value={formData.password || ''} onChange={handleChange} placeholder={isEditing ? 'Nueva contraseÃ±a (opcional)' : 'ContraseÃ±a'} required={!isEditing} className={inputClass} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select name="roleId" value={formData.roleId} onChange={handleChange} className={inputClass}>
                        {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
                    <input type="number" step="0.01" name="salary" value={formData.salary || ''} onChange={handleChange} placeholder="Salario ($)" className={inputClass} />
                </div>
                <div>
                    <label className="block text-sm font-medium dark:text-gray-300 mb-2">Turnos Semanales</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {DAYS_OF_WEEK.map(day => (
                            <div key={day} className="bg-gray-50 p-2 rounded dark:bg-dark-700/30 border border-gray-100 dark:border-dark-600">
                                <label className="block text-xs font-bold text-gray-500 mb-1">{day.substring(0, 3)}</label>
                                <select value={formData.shifts?.[day] || 'Libre'} onChange={(e) => handleShiftChange(day, e.target.value)} className="w-full text-xs rounded border-gray-200 bg-white dark:bg-dark-600 dark:border-dark-500 dark:text-white p-1">
                                    <option>AM</option><option>PM</option><option>AM-PM</option><option>Libre</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end pt-4 gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-200 font-medium">Cancelar</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">{isEditing ? 'Guardar' : 'Crear'}</button>
                </div>
            </form>
        </Modal>
    );
};
