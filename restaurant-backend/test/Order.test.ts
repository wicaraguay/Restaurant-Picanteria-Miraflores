
import { describe, it, expect } from 'vitest';
import { Order } from '../src/domain/entities/Order';

describe('Order Entity', () => {
    it('should create an order instance', () => {
        const order: Order = {
            id: '123',
            customerName: 'Test Customer',
            items: [],
            type: 'En Local',
            status: 'pendiente',
            createdAt: new Date(),
            billed: false,
            orderNumber: '001'
        };

        expect(order).toBeDefined();
        expect(order.id).toBe('123');
        expect(order.items).toEqual([]);
    });
});
