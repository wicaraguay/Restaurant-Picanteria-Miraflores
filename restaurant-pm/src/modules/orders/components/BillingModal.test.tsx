import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BillingModal } from './BillingModal';
import { OrderStatus } from '../types/order.types';

const mockConfig: any = {
    name: 'TEST RESTAURANT',
    ruc: '1234567890001',
    address: 'Test Address',
    billing: {
        establishment: '001',
        emissionPoint: '001',
        currentSequenceFactura: 10
    }
};

const mockOrder: any = {
    id: 'order-123',
    customerName: 'Test Customer',
    items: [
        { name: 'Item 1', quantity: 2, price: 5.0 }
    ],
    status: OrderStatus.Ready,
    createdAt: new Date().toISOString()
};

const mockBillingData = {
    identification: '',
    name: '',
    email: '',
    address: '',
    phone: '',
    paymentMethod: '01'
};

describe('BillingModal Component', () => {
    const mockOnClose = vi.fn();
    const mockSetBillingData = vi.fn();
    const mockOnProcess = vi.fn();
    const mockOnManualComplete = vi.fn();

    it('renders all billing fields correctly', () => {
        render(
            <BillingModal
                isOpen={true}
                onClose={mockOnClose}
                config={mockConfig}
                billingOrder={mockOrder}
                billingData={mockBillingData}
                setBillingData={mockSetBillingData}
                searchingIdentity={false}
                onProcess={mockOnProcess}
                onManualComplete={mockOnManualComplete}
            />
        );

        expect(screen.getByPlaceholderText('RUC / Cédula')).toBeDefined();
        expect(screen.getByPlaceholderText('Nombre del cliente')).toBeDefined();
        expect(screen.getByPlaceholderText('cliente@email.com')).toBeDefined();
        expect(screen.getByPlaceholderText('0999999999')).toBeDefined();
        expect(screen.getByPlaceholderText('Av. Amazonas y Colón')).toBeDefined();
        expect(screen.getByRole('combobox')).toBeDefined();
    });

    it('updates fields on change', () => {
        render(
            <BillingModal
                isOpen={true}
                onClose={mockOnClose}
                config={mockConfig}
                billingOrder={mockOrder}
                billingData={mockBillingData}
                setBillingData={mockSetBillingData}
                searchingIdentity={false}
                onProcess={mockOnProcess}
                onManualComplete={mockOnManualComplete}
            />
        );

        const phoneInput = screen.getByPlaceholderText('0999999999');
        fireEvent.change(phoneInput, { target: { value: '0987654321' } });
        expect(mockSetBillingData).toHaveBeenCalled();
        
        const addressInput = screen.getByPlaceholderText('Av. Amazonas y Colón');
        fireEvent.change(addressInput, { target: { value: 'Calle Nueva' } });
        expect(mockSetBillingData).toHaveBeenCalled();
    });

    it('sets Consumidor Final data when button is clicked', () => {
        render(
            <BillingModal
                isOpen={true}
                onClose={mockOnClose}
                config={mockConfig}
                billingOrder={mockOrder}
                billingData={mockBillingData}
                setBillingData={mockSetBillingData}
                searchingIdentity={false}
                onProcess={mockOnProcess}
                onManualComplete={mockOnManualComplete}
            />
        );

        const cfButton = screen.getByText(/Usar "Consumidor Final"/i);
        fireEvent.click(cfButton);

        expect(mockSetBillingData).toHaveBeenCalledWith({
            identification: '9999999999999',
            name: 'CONSUMIDOR FINAL',
            email: 'consumidor@final.com',
            address: 'S/N',
            phone: '9999999999',
            paymentMethod: '01'
        });
    });

    it('previews entered data in the invoice view', () => {
        const dataWithValues = {
            ...mockBillingData,
            name: 'JUAN PEREZ',
            phone: '0991234567',
            address: 'ALBORADA 5'
        };

        render(
            <BillingModal
                isOpen={true}
                onClose={mockOnClose}
                config={mockConfig}
                billingOrder={mockOrder}
                billingData={dataWithValues}
                setBillingData={mockSetBillingData}
                searchingIdentity={false}
                onProcess={mockOnProcess}
                onManualComplete={mockOnManualComplete}
            />
        );

        // Preview section checks
        expect(screen.getAllByText(/JUAN PEREZ/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/0991234567/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/ALBORADA 5/i).length).toBeGreaterThan(0);
    });
});
