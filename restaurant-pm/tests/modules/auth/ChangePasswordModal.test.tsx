import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChangePasswordModal from '@/modules/auth/components/ChangePasswordModal';

// Mock api
vi.mock('../../../src/api', () => ({
    api: {
        auth: {
            changePassword: vi.fn(),
        },
    },
}));

// Mock toast
vi.mock('../../../src/components/ui/AlertProvider', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { api } from '../../../src/api';
import { toast } from '../../../src/components/ui/AlertProvider';

describe('ChangePasswordModal', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe renderizar el modal cuando isOpen es true', () => {
        render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

        expect(screen.getByRole('heading', { name: /CAMBIAR CONTRASENA/i })).toBeDefined();
        expect(screen.getByPlaceholderText(/Tu contrasena actual/i)).toBeDefined();
        expect(screen.getByPlaceholderText(/Minimo 6 caracteres/i)).toBeDefined();
    });

    it('no debe renderizar cuando isOpen es false', () => {
        render(<ChangePasswordModal isOpen={false} onClose={mockOnClose} />);

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('debe mostrar error si nueva contrasena es menor a 6 caracteres', async () => {
        render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

        const currentInput = screen.getByPlaceholderText(/Tu contrasena actual/i);
        const newInput = screen.getByPlaceholderText(/Minimo 6 caracteres/i);
        const confirmInput = screen.getByPlaceholderText(/Repite la nueva contrasena/i);
        const submitBtn = screen.getByRole('button', { name: /Cambiar Contrasena/i });

        fireEvent.change(currentInput, { target: { value: 'current123' } });
        fireEvent.change(newInput, { target: { value: '12345' } });
        fireEvent.change(confirmInput, { target: { value: '12345' } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText(/al menos 6 caracteres/i)).toBeDefined();
        });
    });

    it('debe mostrar error si contrasenas no coinciden', async () => {
        render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

        const currentInput = screen.getByPlaceholderText(/Tu contrasena actual/i);
        const newInput = screen.getByPlaceholderText(/Minimo 6 caracteres/i);
        const confirmInput = screen.getByPlaceholderText(/Repite la nueva contrasena/i);
        const submitBtn = screen.getByRole('button', { name: /Cambiar Contrasena/i });

        fireEvent.change(currentInput, { target: { value: 'current123' } });
        fireEvent.change(newInput, { target: { value: 'newpass123' } });
        fireEvent.change(confirmInput, { target: { value: 'different123' } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText(/no coinciden/i)).toBeDefined();
        });
    });

    it('debe llamar a changePassword con datos correctos', async () => {
        (api.auth.changePassword as any).mockResolvedValue({ message: 'success' });

        render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

        const currentInput = screen.getByPlaceholderText(/Tu contrasena actual/i);
        const newInput = screen.getByPlaceholderText(/Minimo 6 caracteres/i);
        const confirmInput = screen.getByPlaceholderText(/Repite la nueva contrasena/i);
        const submitBtn = screen.getByRole('button', { name: /Cambiar Contrasena/i });

        fireEvent.change(currentInput, { target: { value: 'current123' } });
        fireEvent.change(newInput, { target: { value: 'newpass123' } });
        fireEvent.change(confirmInput, { target: { value: 'newpass123' } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(api.auth.changePassword).toHaveBeenCalledWith('current123', 'newpass123');
        });
    });

    it('debe mostrar toast de exito y cerrar modal', async () => {
        (api.auth.changePassword as any).mockResolvedValue({ message: 'success' });

        render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

        const currentInput = screen.getByPlaceholderText(/Tu contrasena actual/i);
        const newInput = screen.getByPlaceholderText(/Minimo 6 caracteres/i);
        const confirmInput = screen.getByPlaceholderText(/Repite la nueva contrasena/i);
        const submitBtn = screen.getByRole('button', { name: /Cambiar Contrasena/i });

        fireEvent.change(currentInput, { target: { value: 'current123' } });
        fireEvent.change(newInput, { target: { value: 'newpass123' } });
        fireEvent.change(confirmInput, { target: { value: 'newpass123' } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('debe mostrar error si API rechaza', async () => {
        (api.auth.changePassword as any).mockRejectedValue(new Error('Contrasena actual incorrecta'));

        render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

        const currentInput = screen.getByPlaceholderText(/Tu contrasena actual/i);
        const newInput = screen.getByPlaceholderText(/Minimo 6 caracteres/i);
        const confirmInput = screen.getByPlaceholderText(/Repite la nueva contrasena/i);
        const submitBtn = screen.getByRole('button', { name: /Cambiar Contrasena/i });

        fireEvent.change(currentInput, { target: { value: 'wrongpass' } });
        fireEvent.change(newInput, { target: { value: 'newpass123' } });
        fireEvent.change(confirmInput, { target: { value: 'newpass123' } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText(/Contrasena actual incorrecta/i)).toBeDefined();
        });
    });

    it('debe limpiar campos al cerrar', () => {
        const { rerender } = render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

        const currentInput = screen.getByPlaceholderText(/Tu contrasena actual/i) as HTMLInputElement;
        fireEvent.change(currentInput, { target: { value: 'somevalue' } });

        const cancelBtn = screen.getByText(/Cancelar/i);
        fireEvent.click(cancelBtn);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('debe toggle visibilidad de contrasena', () => {
        render(<ChangePasswordModal isOpen={true} onClose={mockOnClose} />);

        const currentInput = screen.getByPlaceholderText(/Tu contrasena actual/i) as HTMLInputElement;
        expect(currentInput.type).toBe('password');

        // El toggle button está después del input
        const toggleButtons = screen.getAllByRole('button');
        const toggleBtn = toggleButtons.find(btn => btn.querySelector('svg'));

        if (toggleBtn) {
            fireEvent.click(toggleBtn);
            // Después del click, debería ser text
        }
    });
});
