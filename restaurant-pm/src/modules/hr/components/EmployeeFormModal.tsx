/**
 * @file EmployeeFormModal.tsx
 * @description Modal para crear o editar empleados y sus turnos.
 */
import React, { useState, useEffect } from 'react';
import { DAYS_OF_WEEK } from '../../../constants';
import { Employee, Role } from '../types/hr.types';
import Modal from '../../../components/ui/Modal';

const inputClass = "w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 text-gray-900 text-sm font-bold focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-dark-700 dark:bg-dark-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500 dark:focus:bg-dark-900 dark:focus:ring-blue-500/10";
const labelClass = "block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1";

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'number') setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
        else setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleShiftChange = (day: string, value: string) => {
        setFormData(prev => ({ ...prev, shifts: { ...prev.shifts, [day]: value } }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.username || (!isEditing && !formData.password)) return alert('Nombre, usuario y contraseña son obligatorios.');

        const dataToSave: any = {
            name: formData.name,
            username: formData.username,
            roleId: formData.roleId || roles[0].id,
            phone: formData.phone || '',
            salary: formData.salary || 0,
            shifts: formData.shifts || {},
            equipment: formData.equipment || { uniform: false, epp: false },
        };

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
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'EDITAR EMPLEADO' : 'AÑADIR EMPLEADO'}>
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClass}>Nombre Completo</label>
                        <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required placeholder="Ej: Juan Pérez" className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Teléfono / Celular</label>
                        <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="Ej: 0999999999" className={inputClass} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClass}>Nombre de Usuario</label>
                        <input type="text" name="username" value={formData.username || ''} onChange={handleChange} required placeholder="Ej: jperez" className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Contraseña</label>
                        <input type="password" name="password" value={formData.password || ''} onChange={handleChange} placeholder={isEditing ? 'Nueva (opcional)' : 'Mín. 6 caracteres'} required={!isEditing} className={inputClass} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClass}>Rol Asignado</label>
                        <select name="roleId" value={formData.roleId} onChange={handleChange} className={inputClass}>
                            {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Salario Mensual ($)</label>
                        <input type="number" step="0.01" name="salary" value={formData.salary || ''} onChange={handleChange} placeholder="0.00" className={inputClass} />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Turnos de la Semana</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                        {DAYS_OF_WEEK.map(day => (
                            <div key={day} className="bg-gray-50/50 dark:bg-dark-900 p-3 rounded-2xl border border-gray-100 dark:border-dark-700">
                                <label className="block text-[8px] font-black text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-widest text-center">{day.substring(0, 3)}</label>
                                <select 
                                    value={formData.shifts?.[day] || 'Libre'} 
                                    onChange={(e) => handleShiftChange(day, e.target.value)} 
                                    className="w-full text-[10px] font-black uppercase rounded-lg border-gray-100 bg-white dark:bg-dark-800 dark:border-dark-600 dark:text-white p-1.5 focus:ring-0 focus:border-blue-500 transition-colors cursor-pointer"
                                >
                                    <option>AM</option>
                                    <option>PM</option>
                                    <option>AM-PM</option>
                                    <option>Libre</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end pt-8 gap-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-8 py-4 rounded-2xl bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-dark-700 dark:text-gray-400 font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        className="px-10 py-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        {isEditing ? 'Actualizar' : 'Crear Empleado'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
