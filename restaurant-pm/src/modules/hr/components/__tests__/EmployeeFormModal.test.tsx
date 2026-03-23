import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeeFormModal } from '../EmployeeFormModal';

// Mock de validadores
vi.mock('../utils/hrValidators', () => ({
    validateEmployeeId: vi.fn((id) => id.length === 10 ? { isValid: true } : { isValid: false, error: 'Cédula inválida' }),
    validateFullName: vi.fn((name) => name.length >= 3 ? { isValid: true } : { isValid: false, error: 'Nombre corto' }),
    validateUsername: vi.fn((user) => user.length >= 4 ? { isValid: true } : { isValid: false, error: 'Usuario corto' }),
    validatePassword: vi.fn((pass) => pass.length >= 6 ? { isValid: true } : { isValid: false, error: 'Pass corta' }),
    validatePhone: vi.fn(() => ({ isValid: true }))
}));

const mockRoles = [
    { id: '1', name: 'Administrador', permissions: {} },
    { id: '2', name: 'Mesero', permissions: {} }
];

describe('EmployeeFormModal', () => {
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe renderizar correctamente cuando está abierto', () => {
        render(
            <EmployeeFormModal 
                isOpen={true} 
                onClose={mockOnClose} 
                onSave={mockOnSave} 
                employee={null} 
                roles={mockRoles} 
            />
        );
        expect(screen.getByText(/AÑADIR EMPLEADO/i)).toBeDefined();
        expect(screen.getByText(/Información Personal/i)).toBeDefined();
    });

    it('debe mostrar errores de validación si los campos están vacíos al intentar guardar', async () => {
        render(
            <EmployeeFormModal 
                isOpen={true} 
                onClose={mockOnClose} 
                onSave={mockOnSave} 
                employee={null} 
                roles={mockRoles} 
            />
        );

        const submitBtn = screen.getByText(/Crear Empleado/i);
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByTestId('error-name')).toBeDefined();
            expect(screen.getByTestId('error-identification')).toBeDefined();
            expect(screen.getByTestId('error-username')).toBeDefined();
            expect(screen.getByTestId('error-password')).toBeDefined();
        });
        
        expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('debe llamar a onSave con los datos correctos cuando el formulario es válido', async () => {
        render(
            <EmployeeFormModal 
                isOpen={true} 
                onClose={mockOnClose} 
                onSave={mockOnSave} 
                employee={null} 
                roles={mockRoles} 
            />
        );

        fireEvent.change(screen.getByPlaceholderText('Ej: Juan Pérez'), { target: { value: 'Juan Pérez' } });
        fireEvent.change(screen.getByPlaceholderText('0000000000'), { target: { value: '1722222222' } });
        fireEvent.change(screen.getByPlaceholderText('Ej: jperez'), { target: { value: 'jperez' } });
        fireEvent.change(screen.getByPlaceholderText('Mín. 6 caracteres'), { target: { value: 'password123' } });

        const submitBtn = screen.getByText('Crear Empleado');
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Juan Pérez',
                identification: '1722222222',
                username: 'jperez'
            }));
        });
    });

    it('debe cerrar el modal al hacer clic en cancelar', () => {
        render(
            <EmployeeFormModal 
                isOpen={true} 
                onClose={mockOnClose} 
                onSave={mockOnSave} 
                employee={null} 
                roles={mockRoles} 
            />
        );

        fireEvent.click(screen.getByText('Cancelar'));
        expect(mockOnClose).toHaveBeenCalled();
    });
});
