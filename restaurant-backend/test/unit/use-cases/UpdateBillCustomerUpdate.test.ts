import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateBill } from '../../../src/application/use-cases/UpdateBill';
import { BillingService } from '../../../src/application/services/BillingService';

describe('UpdateBill Customer Update', () => {
    let updateBill: UpdateBill;
    let mockBillRepo: any;
    let mockBillingService: any;
    let mockCustomerRepo: any;

    beforeEach(() => {
        mockBillRepo = {
            findById: vi.fn().mockResolvedValue({
                id: 'bill-1',
                customerName: 'Old Name',
                customerIdentification: '1234567890',
                sriStatus: 'DEVUELTA',
                items: [],
                subtotal: 10,
                tax: 1.5,
                total: 11.5
            }),
            upsert: vi.fn().mockImplementation(data => Promise.resolve(data))
        };
        
        mockCustomerRepo = {
            findByIdentification: vi.fn().mockResolvedValue({ id: 'cust-1', name: 'Old Name', identification: '1234567890' }),
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({})
        };

        // Use a semi-real BillingService (mocking the other methods)
        mockBillingService = new BillingService(mockCustomerRepo as any);
        mockBillingService.calculateDetails = vi.fn().mockReturnValue([]);

        updateBill = new UpdateBill(mockBillRepo, mockBillingService);
    });

    it('should update customer data when bill is updated with new info', async () => {
        const updateData = {
            name: 'New Name',
            identification: '1234567890',
            email: 'new@email.com'
        };

        await updateBill.execute('bill-1', updateData);

        // VERIFY: Did it call billingService.autoLearnCustomer (via mockCustomerRepo.update)?
        expect(mockCustomerRepo.update).toHaveBeenCalledWith('cust-1', expect.objectContaining({
            name: 'New Name',
            email: 'new@email.com'
        }));
    });
});
