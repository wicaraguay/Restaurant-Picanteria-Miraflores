import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ForgotPassword from '@/modules/auth/components/ForgotPassword';

// Mock api
vi.mock('../../../src/api', () => ({
    api: {
        auth: {
            forgotPassword: vi.fn(),
        },
    },
}));

// Mock RestaurantConfigContext
vi.mock('../../../src/contexts/RestaurantConfigContext', () => ({
    useRestaurantConfig: () => ({
        config: {
            name: 'Test Restaurant',
            logo: null,
        },
    }),
}));

import { api } from '../../../src/api';

const renderComponent = () => {
    return render(
        <BrowserRouter>
            <ForgotPassword />
        </BrowserRouter>
    );
};

describe('ForgotPassword', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe renderizar el formulario de recuperacion', () => {
        renderComponent();

        expect(screen.getByText(/Recuperar Contrasena/i)).toBeDefined();
        expect(screen.getByPlaceholderText(/tu@email.com/i)).toBeDefined();
        expect(screen.getByText(/Enviar instrucciones/i)).toBeDefined();
    });

    it('debe mostrar enlace para volver al login', () => {
        renderComponent();

        expect(screen.getByText(/Volver al inicio de sesion/i)).toBeDefined();
    });

    it('debe enviar solicitud con email ingresado', async () => {
        (api.auth.forgotPassword as any).mockResolvedValue({ message: 'Email sent' });

        renderComponent();

        const emailInput = screen.getByPlaceholderText(/tu@email.com/i);
        const submitButton = screen.getByText(/Enviar instrucciones/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(api.auth.forgotPassword).toHaveBeenCalledWith('test@example.com');
        });
    });

    it('debe mostrar mensaje de exito despues de enviar', async () => {
        (api.auth.forgotPassword as any).mockResolvedValue({ message: 'Email sent' });

        renderComponent();

        const emailInput = screen.getByPlaceholderText(/tu@email.com/i);
        const submitButton = screen.getByText(/Enviar instrucciones/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Correo enviado/i)).toBeDefined();
        });
    });

    it('debe mostrar error si la solicitud falla', async () => {
        (api.auth.forgotPassword as any).mockRejectedValue(new Error('Network error'));

        renderComponent();

        const emailInput = screen.getByPlaceholderText(/tu@email.com/i);
        const submitButton = screen.getByText(/Enviar instrucciones/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Network error/i)).toBeDefined();
        });
    });

    it('debe requerir email valido', () => {
        renderComponent();

        const emailInput = screen.getByPlaceholderText(/tu@email.com/i);
        expect(emailInput).toHaveProperty('type', 'email');
        expect(emailInput).toHaveProperty('required', true);
    });
});
