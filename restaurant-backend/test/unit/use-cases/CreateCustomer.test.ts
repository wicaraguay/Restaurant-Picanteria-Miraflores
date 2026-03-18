import { describe, it, expect, vi } from 'vitest';
import { CreateCustomer } from '../../../src/application/use-cases/CreateCustomer';
import { ICustomerRepository } from '../../../src/domain/repositories/ICustomerRepository';
import { Customer } from '../../../src/domain/entities/Customer';

describe('CreateCustomer Use Case', () => {
    const mockCustomer: Customer = {
        name: 'TEST CUSTOMER',
        email: 'test@example.com',
        phone: '0999999999',
        identification: '1712345678',
        address: 'Test Address',
        loyaltyPoints: 0,
        lastVisit: new Date()
    } as any;

    const mockCustomerRepository = {
        create: vi.fn(),
    } as unknown as ICustomerRepository;

    const createCustomer = new CreateCustomer(mockCustomerRepository);

    it('should create a customer successfully', async () => {
        vi.mocked(mockCustomerRepository.create).mockResolvedValue({ ...mockCustomer, id: '123' });

        const result = await createCustomer.execute(mockCustomer);

        expect(mockCustomerRepository.create).toHaveBeenCalledWith(mockCustomer);
        expect(result).toHaveProperty('id', '123');
        expect(result.name).toBe('TEST CUSTOMER');
    });
});
