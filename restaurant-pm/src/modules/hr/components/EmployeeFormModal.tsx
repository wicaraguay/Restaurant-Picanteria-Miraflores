/**
 * @file EmployeeFormModal.tsx
 * @description Modal para crear o editar empleados y sus turnos.
 * Mismo patrón que Clientes/Menú/Categorías: autofocus, detección instantánea
 * de duplicados (cédula y usuario), validación al salir del campo, panel de
 * contexto al editar y guardado solo cuando hay cambios.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { DAYS_OF_WEEK } from '../../../constants';
import { Employee, Role } from '../types/hr.types';
import Modal from '../../../components/ui/Modal';
import { UserIcon, PhoneIcon, WalletIcon, ShieldCheckIcon, CalendarIcon, IdentificationIcon, EyeIcon, EyeOffIcon } from '../../../components/ui/Icons';
import * as validators from '../utils/hrValidators';

const inputClass = "w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 text-gray-900 text-sm font-bold focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all dark:border-dark-700 dark:bg-dark-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500 dark:focus:bg-dark-900 dark:focus:ring-blue-500/10";
const labelClass = "block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2 ml-1";
const errorClass = "text-[10px] font-bold text-red-500 mt-1 ml-1 animate-pulse";
const sectionTitleClass = "flex items-center gap-2 text-xs font-black text-gray-900 dark:text-white uppercase tracking-[0.1em] mb-4 pb-2 border-b border-gray-100 dark:border-dark-700";
const optionalTag = <span className="normal-case font-bold text-gray-300 dark:text-gray-600">· opcional</span>;

/** Convierte el texto del salario a número, aceptando coma o punto como separador decimal. */
const parseSalary = (v: unknown): number => parseFloat(String(v ?? '').replace(',', '.')) || 0;

export interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employee: Employee) => void;
    employee: Employee | null;
    roles: Role[];
    /** Empleados actuales — permite detectar cédulas/usuarios duplicados al instante. */
    employees?: Employee[];
    /** Cuando la cédula o usuario digitado ya pertenece a otro empleado, permite saltar a editarlo. */
    onEditExisting?: (employee: Employee) => void;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ isOpen, onClose, onSave, employee, roles, employees, onEditExisting }) => {
    const [formData, setFormData] = useState<Partial<Employee> & { password?: string }>({});
    const [initialSnapshot, setInitialSnapshot] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    const isEditing = employee !== null;

    // Snapshot comparable — para saber si el empleado cambió algo
    const snapshot = (data: Partial<Employee> & { password?: string }): string => JSON.stringify({
        name: data.name || '',
        email: data.email || '',
        identification: data.identification || '',
        username: data.username || '',
        roleId: data.roleId || '',
        phone: data.phone || '',
        salary: String(data.salary ?? ''),
        shifts: data.shifts || {},
        password: data.password || ''
    });

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setShowPassword(false);
            let initial: Partial<Employee> & { password?: string };
            if (isEditing) {
                const { password, ...employeeData } = employee;
                initial = { ...employeeData, password: '' };
            } else {
                initial = {
                    name: '',
                    email: '',
                    identification: '',
                    username: '',
                    password: '',
                    roleId: roles.length > 0 ? roles[0].id : '',
                    phone: '',
                    salary: undefined,
                    shifts: DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: 'Libre' }), {}),
                    equipment: { uniform: true, epp: false }
                };
            }
            setFormData(initial);
            setInitialSnapshot(snapshot(initial));
        }
    }, [isOpen, employee, isEditing, roles]);

    const isDirty = snapshot(formData) !== initialSnapshot;

    // Empleado duplicado: misma cédula o mismo usuario en otro id — búsqueda local instantánea
    const duplicate = useMemo(() => {
        if (!employees?.length) return null;
        const ident = (formData.identification || '').trim();
        const user = (formData.username || '').trim().toLowerCase();
        if (ident.length === 10) {
            const byId = employees.find(e => e.id !== employee?.id && e.identification === ident);
            if (byId) return { employee: byId, field: 'cédula' as const };
        }
        if (user.length >= 4) {
            const byUser = employees.find(e => e.id !== employee?.id && (e.username || '').toLowerCase() === user);
            if (byUser) return { employee: byUser, field: 'usuario' as const };
        }
        return null;
    }, [formData.identification, formData.username, employees, employee]);

    const validateField = (field: string, data: Partial<Employee> & { password?: string }): string | null => {
        switch (field) {
            case 'name': {
                const v = validators.validateFullName(data.name || '');
                return v.isValid ? null : v.error!;
            }
            case 'identification': {
                const v = validators.validateEmployeeId(data.identification || '');
                return v.isValid ? null : v.error!;
            }
            case 'username': {
                const v = validators.validateUsername(data.username || '');
                return v.isValid ? null : v.error!;
            }
            case 'password': {
                // Al crear es obligatoria; al editar solo se valida si se digitó una nueva
                if (isEditing && !data.password) return null;
                const v = validators.validatePassword(data.password || '');
                return v.isValid ? null : v.error!;
            }
            case 'phone': {
                const v = validators.validatePhone(data.phone || '');
                return v.isValid ? null : v.error!;
            }
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

    const setField = (name: string, value: unknown) => {
        const next = { ...formData, [name]: value };
        setFormData(next as typeof formData);
        // Si el campo tenía error y quedó corregido, limpiarlo al instante
        if (errors[name] && !validateField(name, next as typeof formData)) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'identification' || name === 'phone') {
            // Solo dígitos, máx. 10 — con teclado numérico en el celular
            setField(name, value.replace(/\D/g, '').slice(0, 10));
        } else if (name === 'salary') {
            // Texto controlado: dígitos + UN separador decimal (coma o punto), máx. 2
            // decimales — misma solución que el precio del menú (type="number" borra
            // estados intermedios como "0," con teclados en español)
            if (/^\d*([.,]\d{0,2})?$/.test(value)) {
                setField(name, value as unknown as number);
            }
        } else {
            setField(name, value);
        }
    };

    const handleShiftChange = (day: string, value: string) => {
        setFormData(prev => ({ ...prev, shifts: { ...prev.shifts, [day]: value } }));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        (['identification', 'name', 'username', 'password', 'phone'] as const).forEach(field => {
            const error = validateField(field, formData);
            if (error) newErrors[field] = error;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || duplicate) return;

        const dataToSave: any = {
            name: formData.name,
            email: formData.email || '',
            identification: formData.identification,
            username: formData.username,
            roleId: formData.roleId || roles[0].id,
            phone: formData.phone || '',
            salary: parseSalary(formData.salary),
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

    const roleName = (id?: string) => roles.find(r => r.id === id)?.name || 'Sin rol';
    const submitDisabled = !!duplicate || (isEditing && !isDirty);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'EDITAR EMPLEADO' : 'AÑADIR EMPLEADO'}>
            <form autoComplete="off" onSubmit={handleSubmit} className="space-y-8 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">

                {/* Panel de contexto: QUÉ empleado se está editando */}
                {isEditing && employee && (
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-900">
                        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shrink-0">
                            {(employee.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="font-black text-gray-900 dark:text-white uppercase tracking-tighter truncate">{employee.name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">
                                {roleName(employee.roleId)} · @{employee.username}
                            </p>
                        </div>
                    </div>
                )}

                {/* Aviso de duplicado: cédula o usuario ya registrados */}
                {duplicate && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase leading-snug">
                            Esa {duplicate.field} ya pertenece a: <span className="font-black">{duplicate.employee.name}</span>
                        </p>
                        {onEditExisting && (
                            <button
                                type="button"
                                onClick={() => onEditExisting(duplicate.employee)}
                                className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all active:scale-95"
                            >
                                Editar
                            </button>
                        )}
                    </div>
                )}

                {/* SECCIÓN: Información Personal */}
                <div className="bg-white/50 dark:bg-dark-800/50 backdrop-blur-sm p-6 rounded-3xl border border-gray-100 dark:border-dark-700/50">
                    <h3 className={sectionTitleClass}>
                        <UserIcon className="w-4 h-4 text-blue-600" /> Información Personal
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClass}>Nombre Completo</label>
                            <input type="text" name="name" autoFocus value={formData.name || ''} onChange={handleChange} onBlur={() => handleBlur('name')} placeholder="Ej: Juan Pérez" className={`${inputClass} ${errors.name ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} />
                            {errors.name && <p className={errorClass} data-testid="error-name">{errors.name}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Identificación (Cédula)</label>
                            <div className="relative">
                                <IdentificationIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="text" inputMode="numeric" name="identification" value={formData.identification || ''} onChange={handleChange} onBlur={() => handleBlur('identification')} placeholder="0000000000" className={`${inputClass} pl-11 ${errors.identification ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} />
                            </div>
                            {errors.identification && <p className={errorClass} data-testid="error-identification">{errors.identification}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Teléfono / Celular {optionalTag}</label>
                            <div className="relative">
                                <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input type="tel" inputMode="numeric" name="phone" value={formData.phone || ''} onChange={handleChange} onBlur={() => handleBlur('phone')} placeholder="Ej: 0999999999" className={`${inputClass} pl-11 ${errors.phone ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} />
                            </div>
                            {errors.phone && <p className={errorClass} data-testid="error-phone">{errors.phone}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Email {optionalTag}</label>
                            <input type="email" name="email" value={formData.email || ''} onChange={handleChange} placeholder="empleado@email.com" className={inputClass} />
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 ml-1">Para recuperar contraseña</p>
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
                            <input type="text" name="username" autoComplete="off" value={formData.username || ''} onChange={handleChange} onBlur={() => handleBlur('username')} placeholder="Ej: jperez" className={`${inputClass} ${errors.username ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`} />
                            {errors.username && <p className={errorClass} data-testid="error-username">{errors.username}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Contraseña {isEditing && optionalTag}</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    autoComplete="new-password"
                                    value={formData.password || ''}
                                    onChange={handleChange}
                                    onBlur={() => handleBlur('password')}
                                    placeholder={isEditing ? '•••••••• (solo si deseas cambiarla)' : 'Mín. 6 caracteres'}
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
                            <label className={labelClass}>Salario Mensual {optionalTag}</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm pointer-events-none">$</span>
                                <input type="text" inputMode="decimal" name="salary" value={formData.salary ?? ''} onChange={handleChange} placeholder="0.00" className={`${inputClass} pl-8`} />
                            </div>
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
                        className={`px-10 py-4 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 ${submitDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                        disabled={submitDisabled}
                        title={isEditing && !isDirty ? 'No hay cambios por guardar' : undefined}
                    >
                        {isEditing ? (isDirty ? 'Actualizar' : 'Sin cambios') : 'Crear Empleado'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
