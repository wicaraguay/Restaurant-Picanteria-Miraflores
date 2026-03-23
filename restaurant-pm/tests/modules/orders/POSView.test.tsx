import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import POSView from '@/modules/orders/components/POSView';
import { MenuItem } from '@/modules/menu/types/menu.types';
import { OrderStatus } from '@/modules/orders/types/order.types';

const mockMenuItems: MenuItem[] = [
    { id: '1', name: 'Arroz con Pollo', price: 10, category: 'Carnes', available: true, description: 'Test', imageUrl: '' },
    { id: '2', name: 'Coca Cola', price: 2, category: 'Bebidas', available: true, description: 'Test', imageUrl: '' },
    { id: '3', name: 'Ceviche', price: 15, category: 'Mariscos', available: false, description: 'Test', imageUrl: '' },
];

describe('POSView Component', () => {
    const mockOnSave = vi.fn();
    const mockOnCancel = vi.fn();

    it('renders search and categories', () => {
        render(<POSView menuItems={mockMenuItems} onSave={mockOnSave} onCancel={mockOnCancel} />);
        expect(screen.getByPlaceholderText(/¿Qué desea el cliente hoy?/i)).toBeDefined();
        // Use getAllByText and check for at least one (button and label)
        expect(screen.getAllByText('Carnes').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Bebidas').length).toBeGreaterThan(0);
    });

    it('filters items by search query', () => {
        render(<POSView menuItems={mockMenuItems} onSave={mockOnSave} onCancel={mockOnCancel} />);
        const searchInput = screen.getByPlaceholderText(/¿Qué desea el cliente hoy?/i);
        
        fireEvent.change(searchInput, { target: { value: 'Arroz' } });
        expect(screen.getByText('Arroz con Pollo')).toBeDefined();
        expect(screen.queryByText('Coca Cola')).toBeNull();
    });

    it('adds items to cart and updates total', () => {
        render(<POSView menuItems={mockMenuItems} onSave={mockOnSave} onCancel={mockOnCancel} />);
        const productBtn = screen.getByText('Arroz con Pollo');
        
        fireEvent.click(productBtn);
        expect(screen.getByText('TOTAL FINAL')).toBeDefined();
        // Use getAllByText as price appears in multiple places
        expect(screen.getAllByText('$10.00').length).toBeGreaterThan(0);
    });

    it('updates item quantity in cart', () => {
        render(<POSView menuItems={mockMenuItems} onSave={mockOnSave} onCancel={mockOnCancel} />);
        fireEvent.click(screen.getByText('Arroz con Pollo'));
        
        const plusBtn = screen.getByTestId('btn-plus-0');
        fireEvent.click(plusBtn);
        
        expect(screen.getAllByText('$20.00').length).toBeGreaterThan(0);
    });

    it('validates customer name before confirming', () => {
        window.alert = vi.fn();
        render(<POSView menuItems={mockMenuItems} onSave={mockOnSave} onCancel={mockOnCancel} />);
        fireEvent.click(screen.getByText('Arroz con Pollo'));
        fireEvent.click(screen.getByTestId('confirm-order-btn'));
        
        expect(window.alert).toHaveBeenCalledWith('Por favor ingrese el nombre del cliente o número de mesa');
        expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('calls onSave with correct data when confirmed', async () => {
        render(<POSView menuItems={mockMenuItems} onSave={mockOnSave} onCancel={mockOnCancel} />);
        fireEvent.click(screen.getByText('Arroz con Pollo'));
        
        const nameInput = screen.getByPlaceholderText(/NOMBRE DEL CLIENTE/i);
        fireEvent.change(nameInput, { target: { value: 'MESA 5' } });
        
        fireEvent.click(screen.getByTestId('confirm-order-btn'));
        
        expect(mockOnSave).toHaveBeenCalled();
        const savedOrder = mockOnSave.mock.calls[0][0];
        expect(savedOrder.customerName).toBe('MESA 5');
        expect(savedOrder.items).toHaveLength(1);
        expect(savedOrder.items[0].name).toBe('Arroz con Pollo');
    });
});
