/**
 * @file EmployeeCard.tsx
 * @description Componente de presentación para mostrar la ficha de un empleado.
 * Incluye visualización de turnos, rol y acciones rápidas con estilo premium.
 * Este archivo pertenece al módulo de recursos humanos (hr).
 */
import React from 'react';
import { Employee } from '../types/hr.types';
import { EditIcon, TrashIcon, UserIcon } from '../../../components/ui/Icons';
import { DAYS_OF_WEEK } from '../../../constants';

interface EmployeeCardProps {
    employee: Employee;
    roleName: string;
    currentDayName: string;
    onEdit: () => void;
    onDelete: () => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, roleName, currentDayName, onEdit, onDelete }) => {
    const todayShift = employee.shifts[currentDayName];

    const getShiftColor = (shift: string) => {
        switch (shift) {
            case 'AM': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700/50';
            case 'PM': return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700/50';
            case 'AM-PM': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700/50';
            case 'Libre': return 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-dark-700 dark:text-gray-500 dark:border-dark-600';
            default: return 'bg-gray-50 text-gray-400 border-gray-100';
        }
    };

    return (
        <div className="bg-white dark:bg-dark-800 rounded-3xl shadow-lg border border-gray-100 dark:border-dark-700 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
            <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <UserIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-0.5">
                                {roleName}
                            </span>
                            <h3 className="font-black text-gray-900 dark:text-white text-lg leading-tight tracking-tighter uppercase">
                                {employee.name}
                            </h3>
                            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                                @{employee.username}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Turno de Hoy */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-900/50 rounded-2xl border border-gray-100 dark:border-dark-700/50">
                        <span className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-widest">
                            Turno Hoy ({currentDayName.substring(0, 3)})
                        </span>
                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-xl border ${getShiftColor(todayShift)}`}>
                            {todayShift}
                        </span>
                    </div>

                    {/* Vista Semanal Compacta */}
                    <div className="grid grid-cols-7 gap-1 px-1">
                        {DAYS_OF_WEEK.map(day => (
                            <div key={day} className="flex flex-col items-center gap-1" title={`${day}: ${employee.shifts[day]}`}>
                                <span className={`text-[8px] font-black uppercase tracking-tighter ${day === currentDayName ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'}`}>
                                    {day.substring(0, 1)}
                                </span>
                                <div className={`w-full h-1.5 rounded-full ${
                                    employee.shifts[day] === 'Libre' ? 'bg-gray-100 dark:bg-dark-700' : 
                                    employee.shifts[day] === 'AM-PM' ? 'bg-green-500' :
                                    employee.shifts[day] === 'AM' ? 'bg-yellow-500' : 'bg-indigo-500'
                                }`}></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-auto px-6 py-4 border-t border-gray-100 dark:border-dark-700/50 flex items-center justify-between bg-gray-50/30 dark:bg-dark-900/20">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Salario</span>
                    <span className="font-black text-gray-900 dark:text-white tracking-tighter">${employee.salary?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onEdit}
                        data-testid="edit-employee-btn"
                        className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl transition-all hover:bg-blue-600 hover:text-white active:scale-95"
                    >
                        <EditIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={onDelete}
                        data-testid="delete-employee-btn"
                        className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl transition-all hover:bg-red-600 hover:text-white active:scale-95"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
