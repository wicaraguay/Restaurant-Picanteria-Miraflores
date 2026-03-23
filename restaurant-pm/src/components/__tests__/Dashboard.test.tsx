import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';
import { OrderStatus, Order } from '../../modules/orders/types/order.types';
import { Reservation } from '../../modules/customers/types/customer.types';

const mockOrders: Order[] = [
    {
        id: '1',
        customerName: 'JUAN PEREZ',
        items: [],
        type: 'En Local',
        status: OrderStatus.New,
        createdAt: new Date().toISOString(),
        orderNumber: '000001'
    },
    {
        id: '2',
        customerName: 'MARIA LOPEZ',
        items: [],
        type: 'Delivery',
        status: OrderStatus.Ready,
        createdAt: new Date().toISOString(),
        orderNumber: '000002'
    }
];

const mockReservations: Reservation[] = [
    {
        id: 'r1',
        name: 'PEDRO PICAPIEDRA',
        time: '14:00',
        partySize: 4,
        status: 'Pendiente'
    }
];

describe('Dashboard Component', () => {
    it('debe renderizar los contadores de pedidos activos y reservas', () => {
        render(<Dashboard orders={mockOrders} reservations={mockReservations} />);
        
        // Active orders: both mockOrders are not Completed
        expect(screen.getByText('2')).toBeDefined();
        // Pending reservations: mockReservations has 1 Pending
        expect(screen.getByText('1')).toBeDefined();
    });

    it('debe mostrar el nombre del cliente en los últimos pedidos', () => {
        render(<Dashboard orders={mockOrders} reservations={mockReservations} />);
        expect(screen.getByText('JUAN PEREZ')).toBeDefined();
        expect(screen.getByText('MARIA LOPEZ')).toBeDefined();
    });

    it('debe mostrar el ID del pedido correctamente formatted', () => {
        render(<Dashboard orders={mockOrders} reservations={mockReservations} />);
        expect(screen.getByText('#000001')).toBeDefined();
        expect(screen.getByText('#000002')).toBeDefined();
    });
});
