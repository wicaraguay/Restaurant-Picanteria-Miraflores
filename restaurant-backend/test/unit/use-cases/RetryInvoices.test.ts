
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetryInvoices } from '../../../src/application/use-cases/RetryInvoices';

describe('RetryInvoices Use Case', () => {
    let mockBillRepo: any;
    let mockCheckInvoiceStatus: any;
    let retryInvoices: RetryInvoices;

    beforeEach(() => {
        mockBillRepo = {
            findPaginated: vi.fn().mockResolvedValue({
                data: [],
                pagination: { total: 0 }
            })
        };
        mockCheckInvoiceStatus = {
            execute: vi.fn().mockResolvedValue({
                success: true,
                authorization: { estado: 'AUTORIZADO' }
            })
        };

        retryInvoices = new RetryInvoices(mockBillRepo, mockCheckInvoiceStatus);
        
        // Mock process.env
        process.env.SRI_ENV = '1';
    });

    it('should do nothing if no bills are found to retry', async () => {
        const result = await retryInvoices.execute();
        
        expect(mockBillRepo.findPaginated).toHaveBeenCalled();
        expect(result.processed).toBe(0);
        expect(mockCheckInvoiceStatus.execute).not.toHaveBeenCalled();
    });

    it('should retry found bills and track results', async () => {
        const billsToRetry = [
            { id: 'bill1', accessKey: 'key1', documentNumber: '001-001-1' },
            { id: 'bill2', accessKey: 'key2', documentNumber: '001-001-2' }
        ];
        
        mockBillRepo.findPaginated.mockResolvedValue({
            data: billsToRetry,
            pagination: { total: 2 }
        });

        const result = await retryInvoices.execute();
        
        expect(mockCheckInvoiceStatus.execute).toHaveBeenCalledTimes(2);
        expect(mockCheckInvoiceStatus.execute).toHaveBeenCalledWith('key1', false);
        expect(mockCheckInvoiceStatus.execute).toHaveBeenCalledWith('key2', false);
        expect(result.processed).toBe(2);
        expect(result.successes).toBe(2);
    });

    it('should handle missing accessKey and continue', async () => {
        const billsToRetry = [
            { id: 'bill1', accessKey: undefined, documentNumber: '001-001-1' },
            { id: 'bill2', accessKey: 'key2', documentNumber: '001-001-2' }
        ];
        
        mockBillRepo.findPaginated.mockResolvedValue({
            data: billsToRetry,
            pagination: { total: 2 }
        });

        const result = await retryInvoices.execute();
        
        expect(mockCheckInvoiceStatus.execute).toHaveBeenCalledTimes(1);
        expect(result.processed).toBe(2);
        expect(result.successes).toBe(1);
        expect(result.errors).toBe(1);
    });

    it('should handle errors in CheckInvoiceStatus and continue', async () => {
        const billsToRetry = [
            { id: 'bill1', accessKey: 'key1', documentNumber: '001-001-1' },
            { id: 'bill2', accessKey: 'key2', documentNumber: '001-001-2' }
        ];
        
        mockBillRepo.findPaginated.mockResolvedValue({
            data: billsToRetry,
            pagination: { total: 2 }
        });

        mockCheckInvoiceStatus.execute
            .mockRejectedValueOnce(new Error('SRI Timeout'))
            .mockResolvedValueOnce({
                success: true,
                authorization: { estado: 'AUTORIZADO' }
            });

        const result = await retryInvoices.execute();
        
        expect(mockCheckInvoiceStatus.execute).toHaveBeenCalledTimes(2);
        expect(result.processed).toBe(2);
        expect(result.successes).toBe(1);
        expect(result.errors).toBe(1);
    });
});
