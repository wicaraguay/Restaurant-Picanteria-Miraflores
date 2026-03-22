import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteOrder } from '../../../src/application/use-cases/DeleteOrder';
import { OrderStatus } from '../../../src/domain/entities/Order';
import { ForbiddenError, NotFoundError } from '../../../src/domain/errors/CustomErrors';

describe('DeleteOrder Use Case', () => {
    let deleteOrder: DeleteOrder;
    let mockOrderRepository: any;
    let mockRoleRepository: any;

    beforeEach(() => {
        mockOrderRepository = {
            findById: vi.fn(),
            delete: vi.fn(),
        };
        mockRoleRepository = {
            findById: vi.fn(),
        };
        deleteOrder = new DeleteOrder(mockOrderRepository, mockRoleRepository);
    });

    it('should delete a new order for any role', async () => {
        const orderId = 'order-1';
        mockOrderRepository.findById.mockResolvedValue({
            id: orderId,
            status: OrderStatus.New
        });
        mockOrderRepository.delete.mockResolvedValue(true);

        await deleteOrder.execute(orderId, 'role-mesero-id');

        expect(mockOrderRepository.delete).toHaveBeenCalledWith(orderId);
    });

    it('should delete a completed order if user role name is Administrador', async () => {
        const orderId = 'order-2';
        const roleId = 'admin-role-id';
        mockOrderRepository.findById.mockResolvedValue({
            id: orderId,
            status: OrderStatus.Completed
        });
        mockRoleRepository.findById.mockResolvedValue({
            id: roleId,
            name: 'Administrador'
        });
        mockOrderRepository.delete.mockResolvedValue(true);

        await deleteOrder.execute(orderId, roleId);

        expect(mockOrderRepository.delete).toHaveBeenCalledWith(orderId);
    });

    it('should throw ForbiddenError if a non-admin role name tries to delete a completed order', async () => {
        const orderId = 'order-3';
        const roleId = 'waiter-role-id';
        mockOrderRepository.findById.mockResolvedValue({
            id: orderId,
            status: OrderStatus.Completed
        });
        mockRoleRepository.findById.mockResolvedValue({
            id: roleId,
            name: 'Mesero'
        });

        await expect(deleteOrder.execute(orderId, roleId))
            .rejects.toThrow(ForbiddenError);
        
        expect(mockOrderRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError if roleId is missing and order is completed', async () => {
        const orderId = 'order-4';
        mockOrderRepository.findById.mockResolvedValue({
            id: orderId,
            status: OrderStatus.Completed
        });

        await expect(deleteOrder.execute(orderId, undefined))
            .rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError if order does not exist', async () => {
        mockOrderRepository.findById.mockResolvedValue(null);

        await expect(deleteOrder.execute('non-existent', 'any-role'))
            .rejects.toThrow(NotFoundError);
    });
});
