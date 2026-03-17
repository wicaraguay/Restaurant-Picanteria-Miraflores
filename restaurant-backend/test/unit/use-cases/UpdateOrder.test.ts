import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { UpdateOrder } from '../../../src/application/use-cases/UpdateOrder';
import { Order, OrderStatus } from '../../../src/domain/entities/Order';
import { NotFoundError } from '../../../src/domain/errors/CustomErrors';
import { IOrderRepository } from '../../../src/domain/repositories/IOrderRepository';

describe('UpdateOrder Use Case', () => {
    let updateOrder: UpdateOrder;
    let mockOrderRepository: Mocked<IOrderRepository>;

    beforeEach(() => {
        mockOrderRepository = {
            findById: vi.fn(),
            update: vi.fn(),
            findAll: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
            findPaginated: vi.fn(),
            getDashboardStats: vi.fn(),
        } as any;
        updateOrder = new UpdateOrder(mockOrderRepository);
    });

    it('should revert status to New and clear readyAt when adding unprepared items to a Ready order', async () => {
        const orderId = 'order-ready';
        const initialDate = new Date();
        const readyOrder: Partial<Order> = {
            id: orderId,
            status: OrderStatus.Ready,
            readyAt: initialDate,
            items: [{ name: 'Pizza', quantity: 1, prepared: true }]
        };
        
        mockOrderRepository.findById.mockResolvedValue(readyOrder as Order);
        mockOrderRepository.update.mockImplementation(async (id, updates) => ({ ...readyOrder, ...updates } as Order));

        const updates: Partial<Order> = {
            items: [
                { name: 'Pizza', quantity: 1, prepared: true },
                { name: 'Cerveza', quantity: 1, prepared: false } // New item
            ]
        };

        const result = await updateOrder.execute(orderId, updates);

        expect(result.status).toBe(OrderStatus.New);
        expect(result.readyAt).toBeNull();
        expect(mockOrderRepository.update).toHaveBeenCalledWith(orderId, expect.objectContaining({
            status: OrderStatus.New,
            readyAt: null
        }));
    });

    it('should keep Ready status if all items are already prepared', async () => {
        const orderId = 'order-ready-2';
        const readyOrder: Partial<Order> = {
            id: orderId,
            status: OrderStatus.Ready,
            items: [{ name: 'Pizza', quantity: 1, prepared: true }]
        };
        
        mockOrderRepository.findById.mockResolvedValue(readyOrder as Order);
        mockOrderRepository.update.mockImplementation(async (id, updates) => ({ ...readyOrder, ...updates } as Order));

        const updates: Partial<Order> = {
            items: [
                { name: 'Pizza', quantity: 1, prepared: true },
                { name: 'Agua', quantity: 1, prepared: true }
            ]
        };

        const result = await updateOrder.execute(orderId, updates);

        expect(result.status).toBe(OrderStatus.Ready);
        expect(mockOrderRepository.update).toHaveBeenCalledWith(orderId, updates);
    });

    it('should throw NotFoundError if order does not exist', async () => {
        mockOrderRepository.findById.mockResolvedValue(null);

        await expect(updateOrder.execute('ghost', {}))
            .rejects.toThrow(NotFoundError);
    });
});
