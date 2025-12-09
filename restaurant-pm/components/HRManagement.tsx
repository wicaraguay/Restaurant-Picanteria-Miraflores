import React, { useState, useEffect } from 'react';
import { DAYS_OF_WEEK, NAV_ITEMS } from '../constants';
import { Employee, Training, LegalDocument, SetState, Role, ViewType } from '../types';
import Modal from './Modal';
import { PlusIcon, EditIcon, TrashIcon } from './Icons';

interface HRManagementProps {
    employees: Employee[];
    setEmployees: SetState<Employee[]>;
    roles: Role[];
    setRoles: SetState<Role[]>;
}

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

const Card = ({ title, children, actions }: { title: string, children?: React.ReactNode, actions?: React.ReactNode }) => (
    <div className="bg-white dark:bg-dark-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700">
        <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-light-background">{title}</h2>
             {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
        {children}
    </div>
);

// Employee Form Modal
interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (employee: Employee) => void;
    employee: Employee | null;
    roles: Role[];
}

const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ isOpen, onClose, onSave, employee, roles }) => {
    const [formData, setFormData] = useState<Partial<Employee> & { password?: string }>({});
    const isEditing = employee !== null;

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                const { password, ...employeeData } = employee;
                setFormData({ ...employeeData, password: '' });
            } else {
                setFormData({
                    name: '', username: '', password: '', roleId: roles[0]?.id || '', phone: '', salary: 0,
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
        if (!formData.name || !formData.username || (!isEditing && !formData.password)) return alert('Nombre, usuario y contraseña son obligatorios.');
        
        const dataToSave: Employee = {
            id: employee?.id || Date.now().toString(),
            name: formData.name,
            username: formData.username,
            roleId: formData.roleId || roles[0].id,
            phone: formData.phone || '',
            salary: formData.salary || 0,
            shifts: formData.shifts || {},
            equipment: formData.equipment || { uniform: false, epp: false },
        };
        
        if (formData.password) {
            dataToSave.password = formData.password;
        } else if (isEditing) {
            dataToSave.password = employee.password;
        }

        onSave(dataToSave);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Empleado' : 'Añadir Empleado'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required placeholder="Nombre Completo" className={inputClass} />
                    <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="Teléfono" className={inputClass} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="username" value={formData.username || ''} onChange={handleChange} required placeholder="Usuario" className={inputClass} />
                    <input type="password" name="password" value={formData.password || ''} onChange={handleChange} placeholder={isEditing ? 'Nueva contraseña (opcional)' : 'Contraseña'} required={!isEditing} className={inputClass} />
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
                                <label className="block text-xs font-bold text-gray-500 mb-1">{day.substring(0,3)}</label>
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

// Role Form Modal (Simplified for brevity, same visual improvements apply)
interface RoleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (role: Role) => void;
    role: Role | null;
}

const RoleFormModal: React.FC<RoleFormModalProps> = ({ isOpen, onClose, onSave, role }) => {
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
            const roleToSave: Role = {
                id: role?.id || Date.now().toString(),
                name: formData.name,
                permissions: formData.permissions || {},
            };
            onSave(roleToSave);
            onClose();
        } else alert('El nombre del rol es obligatorio.');
    };
    
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? `Editar Rol` : 'Añadir Rol'}>
            <div className="space-y-4">
                 <input type="text" value={formData.name || ''} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} disabled={isEditing && role?.name === 'Administrador'} required placeholder="Nombre del Rol" className={inputClass} />
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


const HRManagement: React.FC<HRManagementProps> = ({ employees, setEmployees, roles, setRoles }) => {
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    const handleOpenEmployeeModal = (employee: Employee | null) => {
        setEditingEmployee(employee);
        setIsEmployeeModalOpen(true);
    };
    
    const handleOpenRoleModal = (role: Role | null) => {
        setEditingRole(role);
        setIsRoleModalOpen(true);
    };

    const handleSaveEmployee = (employeeToSave: Employee) => {
        setEmployees(prev => {
            const exists = prev.some(e => e.id === employeeToSave.id);
            if (exists) {
                return prev.map(e => e.id === employeeToSave.id ? employeeToSave : e);
            }
            return [...prev, employeeToSave];
        });
    };
    
    const handleDeleteEmployee = (employeeId: string) => {
        if (window.confirm('¿Seguro que quieres eliminar a este empleado?')) {
            setEmployees(prev => prev.filter(e => e.id !== employeeId));
        }
    };
    
    const handleSaveRole = (roleToSave: Role) => {
        setRoles(prev => {
            const exists = prev.some(r => r.id === roleToSave.id);
            if (exists) {
                return prev.map(r => r.id === roleToSave.id ? roleToSave : r);
            }
            return [...prev, roleToSave];
        });
    };
    
    const handleDeleteRole = (roleId: string) => {
        const roleToDelete = roles.find(r => r.id === roleId);
        if (!roleToDelete) return;
        if (roleToDelete.name === 'Administrador') return alert('El rol de Administrador no se puede eliminar.');
        if (employees.some(e => e.roleId === roleId)) return alert('No se puede eliminar un rol asignado a un empleado.');

        if (window.confirm(`¿Seguro que quieres eliminar el rol "${roleToDelete.name}"?`)) {
            setRoles(prev => prev.filter(r => r.id !== roleId));
        }
    };

    const getShiftClasses = (shift: string) => {
        switch (shift) {
            case 'AM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
            case 'PM': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300';
            case 'AM-PM': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            case 'Libre': return 'bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-gray-400';
            default: return 'bg-gray-50 text-gray-500';
        }
    };
    
    const getCurrentDay = () => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        return days[new Date().getDay()];
    };
    const currentDayName = getCurrentDay();

    const renderContent = () => (
         <div className="space-y-6">
            <Card title="Equipo de Trabajo" actions={<button onClick={() => handleOpenEmployeeModal(null)} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm rounded-lg transition-colors shadow-sm"><PlusIcon className="w-4 h-4 mr-1"/> Añadir</button>}>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-gray-50 dark:bg-dark-700 text-gray-600 dark:text-gray-300">
                            <tr>
                                <th className="px-4 py-3">Empleado</th><th className="px-4 py-3">Rol</th>
                                {DAYS_OF_WEEK.map(day => <th key={day} className={`px-2 py-3 text-center ${day === currentDayName ? 'bg-blue-50 dark:bg-blue-900/20 font-bold text-blue-700 dark:text-blue-300' : ''}`}>{day.substring(0,3)}</th>)}
                                <th className="px-4 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(e => {
                                const roleName = roles.find(r => r.id === e.roleId)?.name || 'Sin Rol';
                                return (
                                    <tr key={e.id} className="bg-white border-b dark:bg-dark-800 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                                        <th className="px-4 py-4 font-medium dark:text-white">
                                            <div>{e.name}</div><div className="font-mono text-xs text-gray-500">{e.username}</div>
                                        </th>
                                        <td className="px-4 py-4">{roleName}</td>
                                        {DAYS_OF_WEEK.map(day => (
                                            <td key={day} className={`px-2 py-4 text-center ${day === currentDayName ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                                <span className={`px-2 py-1 text-xs font-bold rounded ${getShiftClasses(e.shifts[day])}`}>{e.shifts[day]}</span>
                                            </td>
                                        ))}
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button onClick={() => handleOpenEmployeeModal(e)} className="text-blue-600 hover:text-blue-800 p-1"><EditIcon className="w-5 h-5"/></button>
                                                <button onClick={() => handleDeleteEmployee(e.id)} className="text-red-600 hover:text-red-800 p-1"><TrashIcon className="w-5 h-5"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                    {employees.map(e => {
                         const roleName = roles.find(r => r.id === e.roleId)?.name || 'Sin Rol';
                         const todayShift = e.shifts[currentDayName];
                         return (
                             <div key={e.id} className="p-4 rounded-lg bg-gray-50 dark:bg-dark-700/50 border border-gray-100 dark:border-dark-600 relative">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{e.name}</h3>
                                        <p className="text-sm text-gray-500">{roleName}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => handleOpenEmployeeModal(e)} className="text-blue-600 bg-blue-100 p-2 rounded-lg dark:bg-blue-900/30"><EditIcon className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteEmployee(e.id)} className="text-red-600 bg-red-100 p-2 rounded-lg dark:bg-red-900/30"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                                
                                <div className="mt-3 flex items-center justify-between bg-white dark:bg-dark-800 p-3 rounded-md border border-gray-100 dark:border-dark-600">
                                    <span className="text-sm text-gray-500">Turno de Hoy ({currentDayName}):</span>
                                    <span className={`px-3 py-1 text-xs font-bold rounded ${getShiftClasses(todayShift)}`}>
                                        {todayShift}
                                    </span>
                                </div>
                             </div>
                         )
                    })}
                </div>
            </Card>

            <Card title="Roles y Permisos" actions={<button onClick={() => handleOpenRoleModal(null)} className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-dark-700 dark:text-white dark:hover:bg-dark-600 px-3 py-2 text-sm rounded-lg transition-colors"><PlusIcon className="w-4 h-4 mr-1"/> Gestionar</button>}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roles.map(role => (
                        <div key={role.id} className="p-3 rounded-lg border border-gray-100 dark:border-dark-700 flex justify-between items-center bg-gray-50 dark:bg-dark-700/50">
                            <p className="font-medium text-gray-800 dark:text-light-background">{role.name}</p>
                            <div className="flex items-center space-x-1">
                                <button onClick={() => handleOpenRoleModal(role)} className="text-blue-600 p-1.5 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20"><EditIcon className="w-4 h-4"/></button>
                                <button onClick={() => handleDeleteRole(role.id)} className="text-red-600 p-1.5 hover:bg-red-50 rounded dark:hover:bg-red-900/20" disabled={role.name === 'Administrador'}><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );

    return (
        <div>
            <EmployeeFormModal isOpen={isEmployeeModalOpen} onClose={() => setIsEmployeeModalOpen(false)} onSave={handleSaveEmployee} employee={editingEmployee} roles={roles}/>
            <RoleFormModal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} onSave={handleSaveRole} role={editingRole}/>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-light-background mb-6 hidden lg:block">Recursos Humanos</h1>
            {renderContent()}
        </div>
    );
};

export default HRManagement;