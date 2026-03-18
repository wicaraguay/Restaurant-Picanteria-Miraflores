import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmployeeCard } from '../components/EmployeeCard';
import { Employee } from '../types/hr.types';

const mockEmployee: Employee = {
    id: '1',
    name: 'JUAN PEREZ',
    username: 'jperez',
    roleId: 'role-1',
    phone: '0987654321',
    salary: 1200,
    shifts: {
        'Lunes': 'AM',
        'Martes': 'PM',
        'Miercoles': 'AM-PM',
        'Jueves': 'Libre',
        'Viernes': 'AM',
        'Sabado': 'PM',
        'Domingo': 'Libre'
    },
    equipment: { uniform: true, epp: true }
};

describe('EmployeeCard Component', () => {
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    it('debe renderizar el nombre del empleado y el rol', () => {
        render(
            <EmployeeCard 
                employee={mockEmployee} 
                roleName="Administrador" 
                currentDayName="Lunes" 
                onEdit={mockOnEdit} 
                onDelete={mockOnDelete} 
            />
        );
        expect(screen.getByText('JUAN PEREZ')).toBeDefined();
        expect(screen.getByText('Administrador')).toBeDefined();
    });

    it('debe mostrar el turno de hoy correctamente', () => {
        render(
            <EmployeeCard 
                employee={mockEmployee} 
                roleName="Administrador" 
                currentDayName="Lunes" 
                onEdit={mockOnEdit} 
                onDelete={mockOnDelete} 
            />
        );
        expect(screen.getByText('AM')).toBeDefined();
    });

    it('debe llamar a onEdit al hacer clic en el botón de editar', () => {
        render(
            <EmployeeCard 
                employee={mockEmployee} 
                roleName="Administrador" 
                currentDayName="Lunes" 
                onEdit={mockOnEdit} 
                onDelete={mockOnDelete} 
            />
        );
        const editBtn = screen.getByTestId('edit-employee-btn');
        fireEvent.click(editBtn);
        expect(mockOnEdit).toHaveBeenCalled();
    });

    it('debe llamar a onDelete al hacer clic en el botón de eliminar', () => {
        render(
            <EmployeeCard 
                employee={mockEmployee} 
                roleName="Administrador" 
                currentDayName="Lunes" 
                onEdit={mockOnEdit} 
                onDelete={mockOnDelete} 
            />
        );
        const deleteBtn = screen.getByTestId('delete-employee-btn');
        fireEvent.click(deleteBtn);
        expect(mockOnDelete).toHaveBeenCalled();
    });
});
