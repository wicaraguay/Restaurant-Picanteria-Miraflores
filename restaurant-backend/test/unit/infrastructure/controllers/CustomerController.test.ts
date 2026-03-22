
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerController } from '../../../../src/infrastructure/controllers/CustomerController';
import { ResponseFormatter } from '../../../../src/infrastructure/utils/ResponseFormatter';

describe('CustomerController', () => {
    let customerController: CustomerController;
    let mockCreateCustomer: any;
    let mockGetCustomers: any;
    let mockLookupCustomer: any;
    let mockUpdateCustomer: any;
    let mockDeleteCustomer: any;

    beforeEach(() => {
        mockCreateCustomer = { execute: vi.fn() };
        mockGetCustomers = { executePaginated: vi.fn() };
        mockLookupCustomer = { execute: vi.fn() };
        mockUpdateCustomer = { execute: vi.fn() };
        mockDeleteCustomer = { execute: vi.fn() };

        customerController = new CustomerController(
            mockCreateCustomer,
            mockGetCustomers,
            mockLookupCustomer,
            mockUpdateCustomer,
            mockDeleteCustomer
        );
    });

    describe('lookup', () => {
        it('should return 200 with customer data when found', async () => {
            const mockCustomer = { id: '1', name: 'John Doe', identification: '1234567890' };
            mockLookupCustomer.execute.mockResolvedValue(mockCustomer);

            const req = { params: { identification: '1234567890' } } as any;
            const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any;
            const next = vi.fn();

            await customerController.lookup(req, res, next);

            expect(mockLookupCustomer.execute).toHaveBeenCalledWith('1234567890');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: mockCustomer
            }));
            expect(res.status).not.toHaveBeenCalledWith(404);
        });

        it('should return 200 with null when customer is not found', async () => {
            mockLookupCustomer.execute.mockResolvedValue(null);

            const req = { params: { identification: '9999999999' } } as any;
            const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any;
            const next = vi.fn();

            await customerController.lookup(req, res, next);

            expect(mockLookupCustomer.execute).toHaveBeenCalledWith('9999999999');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: null
            }));
            expect(res.status).not.toHaveBeenCalledWith(404);
        });

        it('should call next with error if use case throws', async () => {
            const error = new Error('Database error');
            mockLookupCustomer.execute.mockRejectedValue(error);

            const req = { params: { identification: '1234567890' } } as any;
            const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any;
            const next = vi.fn();

            await customerController.lookup(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });
});
