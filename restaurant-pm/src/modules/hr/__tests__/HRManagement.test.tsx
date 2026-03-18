import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HRManagement from '../components/HRManagement';
import { Employee, Role } from '../types/hr.types';
import { api } from '../../../api';

// Mock simple de la API
vi.mock('../../../api', () => ({
    api: {
        employees: {
            getAll: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        roles: {
            getAll: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        }
    }
}));

const mockEmployees: Employee[] = [
    {
        id: '1',
        name: 'JUAN PEREZ',
        username: 'jperez',
        roleId: 'r1',
        phone: '123',
        salary: 100,
        shifts: { 'Lunes': 'AM' },
        equipment: { uniform: true, epp: false }
    }
];

const mockRoles: Role[] = [
    { id: 'r1', name: 'ADMINISTRADOR', permissions: {} }
];

describe('HRManagement Component', () => {
    const setEmployees = vi.fn();
    const setRoles = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (api.employees.getAll as any).mockResolvedValue(mockEmployees);
        (api.roles.getAll as any).mockResolvedValue(mockRoles);
    });

    it('debe renderizar el título y el botón de añadir', async () => {
        render(<HRManagement employees={mockEmployees} setEmployees={setEmployees} roles={mockRoles} setRoles={setRoles} />);
        
        expect(screen.getByText('Recursos Humanos')).toBeDefined();
        expect(screen.getByText('Añadir Empleado')).toBeDefined();
    });

    it('debe mostrar el equipo de trabajo y los roles', async () => {
        render(<HRManagement employees={mockEmployees} setEmployees={setEmployees} roles={mockRoles} setRoles={setRoles} />);
        
        // Verificamos que no estemos en estado vacío
        expect(screen.queryByText(/No hay empleados registrados/i)).toBeNull();
        
        expect(screen.getByText(/Equipo de Trabajo/i)).toBeDefined();
        expect(screen.getByText(/Roles y Permisos/i)).toBeDefined();
        
        // Usamos waitFor para buscar el nombre
        await waitFor(() => {
            const names = screen.queryAllByText(/JUAN/i);
            expect(names.length).toBeGreaterThan(0);
            
            const roles = screen.queryAllByText(/ADMINISTRADOR/i);
            expect(roles.length).toBeGreaterThan(0);
        }, { timeout: 3000 });
    });

    it('debe abrir el modal de empleado al hacer clic en añadir', async () => {
        render(<HRManagement employees={mockEmployees} setEmployees={setEmployees} roles={mockRoles} setRoles={setRoles} />);
        
        const addBtn = await screen.findByText(/añadir empleado/i);
        fireEvent.click(addBtn);
        
        expect(await screen.findByText(/AÑADIR EMPLEADO/i, { selector: 'h2' })).toBeDefined();
    });
});
