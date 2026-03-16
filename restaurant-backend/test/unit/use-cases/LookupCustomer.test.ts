
import { describe, it, expect, vi } from 'vitest';
import { LookupCustomer } from '../../../src/application/use-cases/LookupCustomer';
import { ICustomerRepository } from '../../../src/domain/repositories/ICustomerRepository';

describe('LookupCustomer Use Case', () => {
    const mockCustomer = {
        id: '123',
        name: 'Willy Tech',
        identification: '1712345678',
        email: 'willy@tech.dev',
        address: 'Quito, Ecuador',
        phone: '0999999999',
        loyaltyPoints: 0,
        lastVisit: new Date()
    };

    const mockCustomerRepository = {
        findByIdentification: vi.fn(),
        create: vi.fn(),
        findById: vi.fn(),
        findAll: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    } as unknown as ICustomerRepository;

    const lookupCustomer = new LookupCustomer(mockCustomerRepository);

    it('should return a customer when found by identification', async () => {
        vi.mocked(mockCustomerRepository.findByIdentification).mockResolvedValue(mockCustomer);

        const result = await lookupCustomer.execute('1712345678');

        expect(mockCustomerRepository.findByIdentification).toHaveBeenCalledWith('1712345678');
        expect(result).toEqual(mockCustomer);
    });

    it('should return null when customer is not found', async () => {
        vi.mocked(mockCustomerRepository.findByIdentification).mockResolvedValue(null);

        const result = await lookupCustomer.execute('0000000000');

        expect(result).toBeNull();
    });
});
