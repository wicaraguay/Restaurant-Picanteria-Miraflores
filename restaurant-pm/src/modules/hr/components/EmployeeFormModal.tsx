/**
 * @file EmployeeFormModal.tsx
 * @description Modal para crear o editar empleados y sus turnos.
 */
import React, { useState, useEffect } from 'react';
import { DAYS_OF_WEEK } from '../../../constants';
import { Employee, Role } from '../types/hr.types';
import Modal from '../../../components/ui/Modal';
import { UserIcon, PhoneIcon, WalletIcon, ShieldCheckIcon, CalendarIcon, IdentificationIcon, EyeIcon, EyeOffIcon } from '../../../components/ui/Icons';
import * as validators from '../utils/hrValidators';

const inputClass = "w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 text-gray-900 text-sm font-bold focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-dark-700 dark:bg-dark-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500 dark:focus:bg-dark-900 dark:focus:ring-blue-500/10";
const labelClass = "block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1";
const errorClass = "text-[10px] font-bold text-red-500 mt-1 ml-1 animate-pulse";
const sectionTitleClass = "flex items-center gap-2 text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.1em] mb-4 pb-2 border-b border-gray-100 dark:border-dark-700";

export interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employee: Employee) => void;
    employee: Employee | null;
    roles: Role[];
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ isOpen, onClose, onSave, employee, roles }) => {
    const [formData, setFormData] = useState<Partial<Employee> & { password?: string }>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    const isEditing = employee !== null;

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            if (isEditing) {
                const { password, ...employeeData } = employee;
                setFormData({ ...employeeData, password: '' });
            } else {
                setFormData({
                    name: '',
                    identification: '',
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
        const val = type === 'number' ? parseFloat(value) || 0 : value;
        setFormData(prev => ({ ...prev, [name]: val }));
        
        // Clear error when typing
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleShiftChange = (day: string, value: string) => {
        setFormData(prev => ({ ...prev, shifts: { ...prev.shifts, [day]: value } }));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        const idVal = validators.validateEmployeeId(formData.identification || '');
        if (!idVal.isValid) newErrors.identification = idVal.error!;

        const nameVal = validators.validateFullName(formData.name || '');
        if (!nameVal.isValid) newErrors.name = nameVal.error!;

        const userVal = validators.validateUsername(formData.username || '');
        if (!userVal.isValid) newErrors.username = userVal.error!;

        if (!isEditing) {
            const passVal = validators.validatePassword(formData.password || '');
            if (!passVal.isValid) newErrors.password = passVal.error!;
        }

        const phoneVal = validators.validatePhone(formData.phone || '');
        if (!phoneVal.isValid) newErrors.phone = phoneVal.error!;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        const dataToSave: any = {
            name: formData.name,
            identification: formData.identification,
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
            <form onSubmit={handleSubmit} className="space-y-8 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">
                
                {/* SECCIÓN: Información Personal */}
                <div className="bg-white/50 dark:bg-dark-800/50 backdrop-blur-sm p-6 rounded-3xl border border-gray-100 dark:border-dark-700/50">
                    <h3 className={sectionTitleClass}>
                        <UserIcon className="w-4 h-4 text-blue-600" /> Información Personal
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>Nombre Completo</label>
                            <input type="text" name="name" value={formData.name || ''} onChange={handleChange} placeholder="Ej: Juan Pérez" className={`${inputClass} ${errors.name ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} />
                            {errors.name && <p className={errorClass} data-testid="error-name">{errors.name}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Identificación (Cédula)</label>
                            <div className="relative">
                                <IdentificationIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" name="identification" value={formData.identification || ''} onChange={handleChange} placeholder="0000000000" className={`${inputClass} pl-11 ${errors.identification ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} />
                            </div>
                            {errors.identification && <p className={errorClass} data-testid="error-identification">{errors.identification}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Teléfono / Celular</label>
                            <div className="relative">
                                <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="Ej: 0999999999" className={`${inputClass} pl-11 ${errors.phone ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} />
                            </div>
                            {errors.phone && <p className={errorClass} data-testid="error-phone">{errors.phone}</p>}
                        </div>
                    </div>
                </div>

                {/* SECCIÓN: Acceso al Sistema */}
                <div className="bg-white/50 dark:bg-dark-800/50 backdrop-blur-sm p-6 rounded-3xl border border-gray-100 dark:border-dark-700/50">
                    <h3 className={sectionTitleClass}>
                        <ShieldCheckIcon className="w-4 h-4 text-green-600" /> Acceso y Rol
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>Usuario</label>
                            <input type="text" name="username" value={formData.username || ''} onChange={handleChange} placeholder="Ej: jperez" className={`${inputClass} ${errors.username ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} />
                            {errors.username && <p className={errorClass} data-testid="error-username">{errors.username}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Contraseña</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    name="password" 
                                    value={formData.password || ''} 
                                    onChange={handleChange} 
                                    placeholder={isEditing ? '•••••••• (Opcional)' : 'Mín. 6 caracteres'} 
                                    className={`${inputClass} pr-12 ${errors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} 
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                >
                                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.password && <p className={errorClass} data-testid="error-password">{errors.password}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Rol Asignado</label>
                            <select name="roleId" value={formData.roleId} onChange={handleChange} className={inputClass}>
                                {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN: Salario y Horarios */}
                <div className="bg-white/50 dark:bg-dark-800/50 backdrop-blur-sm p-6 rounded-3xl border border-gray-100 dark:border-dark-700/50">
                    <h3 className={sectionTitleClass}>
                        <WalletIcon className="w-4 h-4 text-orange-600" /> Remuneración y Turnos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className={labelClass}>Salario Mensual ($)</label>
                            <input type="number" step="0.01" name="salary" value={formData.salary || ''} onChange={handleChange} placeholder="0.00" className={inputClass} />
                        </div>
                    </div>

                    <label className={labelClass}><CalendarIcon className="w-3 h-3 inline mr-1" /> Horario Semanal</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {DAYS_OF_WEEK.map(day => (
                            <div key={day} className="bg-white dark:bg-dark-900 p-2.5 rounded-2xl border border-gray-100 dark:border-dark-700 text-center">
                                <label className="block text-[8px] font-black text-gray-400 dark:text-gray-600 mb-2 uppercase tracking-widest">{day.substring(0, 3)}</label>
                                <select 
                                    value={formData.shifts?.[day] || 'Libre'} 
                                    onChange={(e) => handleShiftChange(day, e.target.value)} 
                                    className="w-full text-[9px] font-black uppercase rounded-lg border-transparent bg-gray-50 dark:bg-dark-800 dark:text-white p-1 focus:ring-0 focus:border-blue-500 transition-colors cursor-pointer"
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
