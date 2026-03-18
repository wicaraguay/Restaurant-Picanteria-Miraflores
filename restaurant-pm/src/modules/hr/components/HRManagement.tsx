/**
 * @file HRManagement.tsx
 * @description Componente principal de gestión de Recursos Humanos.
 * Permite gestionar empleados, roles, permisos y turnos de trabajo.
 */
import React, { useState, useEffect } from 'react';
import { DAYS_OF_WEEK, NAV_ITEMS } from '../../../constants';
import { SetState, ViewType } from '../../../types';
import { Employee, Role } from '../types/hr.types';
import { api } from '../../../api';
import { PlusIcon, EditIcon, TrashIcon } from '../../../components/ui/Icons';

// Componentes locales y globales
import Card from '../../../components/ui/Card';
import { EmployeeFormModal } from './EmployeeFormModal';
import { RoleFormModal } from './RoleFormModal';
import { EmployeeCard } from './EmployeeCard';

interface HRManagementProps {
    employees: Employee[];
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
    roles: Role[];
    setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
}

const HRManagement: React.FC<HRManagementProps> = ({ employees, setEmployees, roles, setRoles }) => {
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(false);

    // Cargar datos iniciales (empleados y roles)
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const [employeesData, rolesData] = await Promise.all([
                    api.employees.getAll(),
                    api.roles.getAll()
                ]);
                setEmployees(employeesData);
                setRoles(rolesData);
            } catch (error) {
                console.error('Error loading HR data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [setEmployees, setRoles]);

    const handleOpenEmployeeModal = (employee: Employee | null) => {
        if (roles.length === 0) {
            alert('Debes crear al menos un rol antes de agregar empleados.');
            return;
        }
        setEditingEmployee(employee);
        setIsEmployeeModalOpen(true);
    };

    const handleOpenRoleModal = (role: Role | null) => {
        setEditingRole(role);
        setIsRoleModalOpen(true);
    };

    const handleSaveEmployee = async (employeeToSave: any) => {
        try {
            setLoading(true);
            const isEditing = !!employeeToSave.id;

            if (isEditing) {
                const updated = await api.employees.update(employeeToSave.id, employeeToSave);
                setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
            } else {
                const created = await api.employees.create(employeeToSave);
                setEmployees(prev => [...prev, created]);
            }
        } catch (error: any) {
            console.error('Error saving employee:', error);
            alert(`Error al guardar empleado: ${error.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEmployee = async (employeeId: string) => {
        if (!window.confirm('¿Seguro que quieres eliminar a este empleado?')) return;

        try {
            setLoading(true);
            await api.employees.delete(employeeId);
            setEmployees(prev => prev.filter(e => e.id !== employeeId));
        } catch (error: any) {
            console.error('Error deleting employee:', error);
            alert(`Error al eliminar empleado: ${error.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRole = async (roleToSave: Role) => {
        try {
            setLoading(true);
            const isEditing = !!roleToSave.id;

            if (isEditing) {
                const updated = await api.roles.update(roleToSave.id, roleToSave);
                setRoles(prev => prev.map(r => r.id === updated.id ? updated : r));
            } else {
                const created = await api.roles.create(roleToSave);
                setRoles(prev => [...prev, created]);
            }
        } catch (error: any) {
            console.error('Error saving role:', error);
            alert(`Error al guardar rol: ${error.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        const roleToDelete = roles.find(r => r.id === roleId);
        if (!roleToDelete) return;
        if (roleToDelete.name === 'Administrador') return alert('El rol de Administrador no se puede eliminar.');
        if (employees.some(e => e.roleId === roleId)) return alert('No se puede eliminar un rol asignado a un empleado.');

        if (!window.confirm(`¿Seguro que quieres eliminar el rol "${roleToDelete.name}"?`)) return;

        try {
            setLoading(true);
            await api.roles.delete(roleId);
            setRoles(prev => prev.filter(r => r.id !== roleId));
        } catch (error: any) {
            console.error('Error deleting role:', error);
            alert(`Error al eliminar rol: ${error.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const currentDayName = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]; // Ajuste para que Lunes sea 0 y Domingo 6 si es necesario, pero DAYS_OF_WEEK asumo que es L-D.
    // Verificamos el primer día de DAYS_OF_WEEK
    const getActualDayName = () => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        return days[new Date().getDay()];
    };
    const actualDay = getActualDayName();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EmployeeFormModal isOpen={isEmployeeModalOpen} onClose={() => setIsEmployeeModalOpen(false)} onSave={handleSaveEmployee} employee={editingEmployee} roles={roles} />
            <RoleFormModal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} onSave={handleSaveRole} role={editingRole} />

            {/* Encabezado Principal */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase mb-1">
                        Recursos Humanos
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                        Gestiona tu equipo, asigna roles y organiza los turnos de trabajo.
                    </p>
                </div>
                <button 
                    onClick={() => handleOpenEmployeeModal(null)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 w-full sm:w-auto justify-center"
                >
                    <PlusIcon className="w-5 h-5" /> Añadir Empleado
                </button>
            </div>

            <div className="space-y-16">
                {/* Sección de Equipo */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest bg-gray-100 dark:bg-dark-700 px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-600">
                            Equipo de Trabajo
                        </h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-dark-600 to-transparent"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                        {employees.map(employee => {
                            const role = roles.find(r => r.id === employee.roleId);
                            return (
                                <EmployeeCard
                                    key={employee.id}
                                    employee={employee}
                                    roleName={role?.name || 'Sin Rol'}
                                    currentDayName={actualDay}
                                    onEdit={() => handleOpenEmployeeModal(employee)}
                                    onDelete={() => handleDeleteEmployee(employee.id)}
                                />
                            );
                        })}
                    </div>

                    {employees.length === 0 && !loading && (
                        <div className="text-center py-20 bg-white dark:bg-dark-800 rounded-3xl border-2 border-dashed border-gray-100 dark:border-dark-700">
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No hay empleados registrados</p>
                        </div>
                    )}
                </section>

                {/* Sección de Roles */}
                <section className="space-y-8">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest bg-gray-100 dark:bg-dark-700 px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-600">
                            Roles y Permisos
                        </h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-dark-600 to-transparent"></div>
                        <button 
                            onClick={() => handleOpenRoleModal(null)}
                            className="p-2 bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {roles.map(role => (
                            <div key={role.id} className="bg-white dark:bg-dark-800 p-5 rounded-2xl border border-gray-100 dark:border-dark-700 flex justify-between items-center shadow-sm hover:shadow-md transition-all">
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-widest truncate max-w-[150px]">
                                        {role.name}
                                    </h3>
                                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                                        {employees.filter(e => e.roleId === role.id).length} Empleados
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => handleOpenRoleModal(role)}
                                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <EditIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteRole(role.id)}
                                        disabled={role.name === 'Administrador' || employees.some(e => e.roleId === role.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-20 transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default HRManagement;
