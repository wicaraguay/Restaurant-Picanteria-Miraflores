import { describe, it, expect, vi } from 'vitest';
import { UpdateCustomer } from '../../../src/application/use-cases/UpdateCustomer';
import { ICustomerRepository } from '../../../src/domain/repositories/ICustomerRepository';
import { Customer } from '../../../src/domain/entities/Customer';

describe('UpdateCustomer Use Case', () => {
    const mockCustomer: Customer = {
        id: '123',
        name: 'UPDATED CUSTOMER',
        email: 'updated@example.com',
        phone: '0988888888',
        identification: '1712345678',
        address: 'Updated Address',
        loyaltyPoints: 10,
        lastVisit: new Date()
    } as any;

    const mockCustomerRepository = {
        update: vi.fn(),
    } as unknown as ICustomerRepository;

    const updateCustomer = new UpdateCustomer(mockCustomerRepository);

    it('should update a customer successfully', async () => {
        vi.mocked(mockCustomerRepository.update).mockResolvedValue(mockCustomer);

        const result = await updateCustomer.execute('123', mockCustomer as any);

        expect(mockCustomerRepository.update).toHaveBeenCalledWith('123', mockCustomer);
        expect(result!.name).toBe('UPDATED CUSTOMER');
        expect(result!.id).toBe('123');
    });
});
