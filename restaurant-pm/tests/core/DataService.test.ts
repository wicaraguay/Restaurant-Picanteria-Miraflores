
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataService } from '@/services/DataService';
import { api } from '@/api';

// Mock the API
vi.mock('@/api', () => ({
    api: {
        customers: {
            getAll: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn()
        }
    }
}));

describe('DataService Customers', () => {
    let dataService: DataService;

    beforeEach(() => {
        vi.clearAllMocks();
        // Clear singleton instance or reset state if needed
        dataService = DataService.getInstance();
        dataService.clearCache();
    });

    it('should fetch customers and cache them', async () => {
        const mockCustomers = [{ id: '1', name: 'Willy Tech' }];
        vi.mocked(api.customers.getAll).mockResolvedValue({ success: true, data: mockCustomers });

        const customers = await dataService.getCustomers();

        expect(api.customers.getAll).toHaveBeenCalledTimes(1);
        expect(customers).toEqual(mockCustomers);

        // Second call should hit cache
        await dataService.getCustomers();
        expect(api.customers.getAll).toHaveBeenCalledTimes(1);
    });

    it('should create a customer and invalidate cache', async () => {
        const newCustomer = { name: 'New Customer', email: 'test@test.com' };
        const createdCustomer = { ...newCustomer, id: '2' };
        vi.mocked(api.customers.create).mockResolvedValue(createdCustomer);
        
        // Populate cache
        vi.mocked(api.customers.getAll).mockResolvedValue({ success: true, data: [] });
        await dataService.getCustomers();
        expect(api.customers.getAll).toHaveBeenCalledTimes(1);

        const result = await dataService.createCustomer(newCustomer as any);

        expect(api.customers.create).toHaveBeenCalledWith(newCustomer);
        expect(result).toEqual(createdCustomer);

        // Should hit API again because cache was cleared
        await dataService.getCustomers();
        expect(api.customers.getAll).toHaveBeenCalledTimes(2);
    });

    it('should update a customer and invalidate cache', async () => {
        const updates = { name: 'Updated Name' };
        const updatedCustomer = { id: '1', name: 'Updated Name', email: 'willy@tech.dev' };
        vi.mocked(api.customers.update).mockResolvedValue(updatedCustomer);
        
        // Populate cache
        vi.mocked(api.customers.getAll).mockResolvedValue({ success: true, data: [] });
        await dataService.getCustomers();

        const result = await dataService.updateCustomer('1', updates);

        expect(api.customers.update).toHaveBeenCalledWith('1', updates);
        expect(result).toEqual(updatedCustomer);

        // Should hit API again
        await dataService.getCustomers();
        expect(api.customers.getAll).toHaveBeenCalledTimes(2);
    });

    it('should delete a customer and invalidate cache', async () => {
        vi.mocked(api.customers.delete).mockResolvedValue(undefined);
        
        // Populate cache
        vi.mocked(api.customers.getAll).mockResolvedValue({ success: true, data: [] });
        await dataService.getCustomers();

        await dataService.deleteCustomer('1');

        expect(api.customers.delete).toHaveBeenCalledWith('1');

        // Should hit API again
        await dataService.getCustomers();
        expect(api.customers.getAll).toHaveBeenCalledTimes(2);
    });
});
