import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteOrder } from '../../../src/application/use-cases/DeleteOrder';
import { OrderStatus } from '../../../src/domain/entities/Order';
import { ForbiddenError, NotFoundError } from '../../../src/domain/errors/CustomErrors';

describe('DeleteOrder Use Case', () => {
    let deleteOrder: DeleteOrder;
    let mockOrderRepository: any;

    beforeEach(() => {
        mockOrderRepository = {
            findById: vi.fn(),
            delete: vi.fn(),
        };
        deleteOrder = new DeleteOrder(mockOrderRepository);
    });

    it('should delete a new order for any role', async () => {
        const orderId = 'order-1';
        mockOrderRepository.findById.mockResolvedValue({
            id: orderId,
            status: OrderStatus.New
        });
        mockOrderRepository.delete.mockResolvedValue(true);

        await deleteOrder.execute(orderId, '3'); // Role Mesero

        expect(mockOrderRepository.delete).toHaveBeenCalledWith(orderId);
    });

    it('should delete a completed order if user is Administrator (role 1)', async () => {
        const orderId = 'order-2';
        mockOrderRepository.findById.mockResolvedValue({
            id: orderId,
            status: OrderStatus.Completed
        });
        mockOrderRepository.delete.mockResolvedValue(true);

        await deleteOrder.execute(orderId, '1'); // Role Admin

        expect(mockOrderRepository.delete).toHaveBeenCalledWith(orderId);
    });

    it('should throw ForbiddenError if a non-admin tries to delete a completed order', async () => {
        const orderId = 'order-3';
        mockOrderRepository.findById.mockResolvedValue({
            id: orderId,
            status: OrderStatus.Completed
        });

        await expect(deleteOrder.execute(orderId, '2')) // Role Cajero
            .rejects.toThrow(ForbiddenError);
        
        expect(mockOrderRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if order does not exist', async () => {
        mockOrderRepository.findById.mockResolvedValue(null);

        await expect(deleteOrder.execute('non-existent', '1'))
            .rejects.toThrow(NotFoundError);
    });
});
