import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BillingModal } from './BillingModal';
import { OrderStatus } from '../types/order.types';

// Mock UI Components
vi.mock('../../../components/ui/Modal', () => ({
    default: ({ children, isOpen, title }: any) => isOpen ? (
        <div data-testid="modal">
            <h1>{title}</h1>
            {children}
        </div>
    ) : null
}));

vi.mock('../../../components/ui/Icons', () => ({
    UserIcon: () => <span data-testid="icon-user" />,
    MailIcon: () => <span />,
    PhoneIcon: () => <span />,
    MapPinIcon: () => <span />,
    IdentificationIcon: () => <span />,
    CreditCardIcon: () => <span />,
    FileTextIcon: () => <span />,
    UsersIcon: () => <span />,
    PrinterIcon: () => <span />,
    CheckCircleIcon: () => <span />,
    ChevronDownIcon: () => <span />,
    ClipboardListIcon: () => <span />
}));

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

        expect(screen.getByLabelText(/RUC \/ Cédula \/ Pasaporte/i)).toBeDefined();
        expect(screen.getByLabelText(/Nombre completo \/ Razón Social/i)).toBeDefined();
        expect(screen.getByLabelText(/Correo Electrónico/i)).toBeDefined();
        expect(screen.getByLabelText(/Teléfono Móvil/i)).toBeDefined();
        expect(screen.getByLabelText(/Dirección de Domicilio/i)).toBeDefined();
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

        const phoneInput = screen.getByLabelText(/Teléfono Móvil/i);
        fireEvent.change(phoneInput, { target: { value: '0987654321' } });
        expect(mockSetBillingData).toHaveBeenCalled();

        const addressInput = screen.getByLabelText(/Dirección de Domicilio/i);
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

        const cfButton = screen.getByRole('button', { name: /CONSUMIDOR FINAL/i });
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
        // In the form (inputs)
        expect(screen.getByDisplayValue(/JUAN PEREZ/i)).toBeDefined();
        
        // In the summary (text elements) using data-testid
        expect(screen.getByTestId('preview-name').textContent).toContain('JUAN PEREZ');
        expect(screen.getByTestId('preview-subtotal')).toBeDefined();
        expect(screen.getByTestId('preview-iva')).toBeDefined();
        expect(screen.getByTestId('preview-total').textContent).toContain('10.00');
    });
});
