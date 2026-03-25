import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckInvoiceStatus } from '../../../src/application/use-cases/CheckInvoiceStatus';
import { BillingService } from '../../../src/application/services/BillingService';

describe('Retry Limit Logic (CheckInvoiceStatus)', () => {
    let checkInvoiceStatus: CheckInvoiceStatus;
    let mockConfigRepo: any;
    let mockBillRepo: any;
    let mockOrderRepo: any;
    let mockSRIService: any;
    let mockPDFService: any;
    let mockEmailService: any;
    let billingService: BillingService;

    beforeEach(() => {
        mockConfigRepo = {
            get: vi.fn().mockResolvedValue({
                businessName: 'Test Biz',
                ruc: '1712345678001',
                address: 'Quito'
            }),
            getNextSequential: vi.fn().mockResolvedValue(2)
        };
        
        mockBillRepo = {
            findByAccessKey: vi.fn().mockResolvedValue({
                id: 'bill123',
                accessKey: 'OLD_KEY_1',
                documentNumber: '001-001-000000001',
                items: [],
                customerIdentification: '9999999999999',
                retryCount: 0
            }),
            findById: vi.fn().mockImplementation((id) => Promise.resolve({
                id,
                accessKey: 'OLD_KEY_1',
                documentNumber: '001-001-000000001',
                items: [],
                customerIdentification: '9999999999999',
                retryCount: 0,
                total: 10,
                subtotal: 10
            })),
            upsert: vi.fn().mockImplementation((bill) => Promise.resolve(bill))
        };
        
        mockOrderRepo = {};
        
        mockSRIService = {
            waitForAuthorization: vi.fn().mockResolvedValue({ 
                estado: 'EN PROCESO', 
                mensajes: ['No se encuentra'],
                rawResponse: '<numeroComprobantes>0</numeroComprobantes>' 
            }),
            generateInvoiceXML: vi.fn().mockImplementation((inv, key) => {
                inv.info.claveAcceso = key || 'NEW_KEY_GENERATED';
                return '<xml></xml>';
            }),
            signXML: vi.fn().mockResolvedValue('signed-xml'),
            sendToSRI: vi.fn().mockResolvedValue({ estado: 'RECIBIDA' })
        };
        
        mockPDFService = {};
        mockEmailService = {};
        billingService = new BillingService();

        checkInvoiceStatus = new CheckInvoiceStatus(
            mockConfigRepo,
            mockBillRepo,
            mockOrderRepo as any,
            mockSRIService as any,
            mockPDFService as any,
            mockEmailService as any,
            billingService
        );
    });

    it('should increment retryCount and use SAME key on first failed attempt of the SAME day (Attempt 1 -> 2)', async () => {
        const today = billingService.getCurrentDateEcuador().split('/').reverse().join('-');
        
        mockBillRepo.findByAccessKey.mockResolvedValueOnce({
            id: 'bill123', 
            accessKey: 'OLD_KEY_1', 
            documentNumber: '001-001-000000001', 
            retryCount: 1, 
            lastRetryDate: today
        });
        mockBillRepo.findById.mockResolvedValueOnce({
            id: 'bill123', 
            accessKey: 'OLD_KEY_1', 
            documentNumber: '001-001-000000001', 
            retryCount: 1, 
            lastRetryDate: today, 
            items: []
        });

        await checkInvoiceStatus.execute('OLD_KEY_1', false);

        // Verify it used the SAME key (Attempt 2)
        expect(mockSRIService.generateInvoiceXML).toHaveBeenCalledWith(expect.anything(), 'OLD_KEY_1');
        
        expect(mockBillRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({
            retryCount: 2,
            lastRetryDate: today,
            accessKey: 'OLD_KEY_1'
        }));
    });

    it('should STOP and return error if daily limit (2) is reached on the SAME day', async () => {
        const today = billingService.getCurrentDateEcuador().split('/').reverse().join('-');
        const billData = {
            id: 'bill123', 
            accessKey: 'OLD_KEY_1', 
            documentNumber: '001-001-000000001', 
            retryCount: 2, 
            lastRetryDate: today,
            items: []
        };
        
        mockBillRepo.findByAccessKey.mockResolvedValueOnce(billData);
        mockBillRepo.findById.mockResolvedValueOnce(billData);

        const result = await checkInvoiceStatus.execute('OLD_KEY_1', false);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Límite de 2 intentos diarios alcanzado');
        // Verify SRI was NOT called for recovery
        expect(mockSRIService.sendToSRI).not.toHaveBeenCalled();
    });

    it('should RESET counter and generate NEW key if last retry was on a PREVIOUS day', async () => {
        const today = billingService.getCurrentDateEcuador().split('/').reverse().join('-');
        const yesterday = '2023-01-01'; // Definitely a different day
        
        mockBillRepo.findByAccessKey.mockResolvedValueOnce({
            id: 'bill123', 
            accessKey: 'OLD_KEY_1', 
            documentNumber: '001-001-000000001', 
            retryCount: 2, 
            lastRetryDate: yesterday
        });
        mockBillRepo.findById.mockResolvedValueOnce({
            id: 'bill123', 
            accessKey: 'OLD_KEY_1', 
            documentNumber: '001-001-000000001', 
            retryCount: 2, 
            lastRetryDate: yesterday, 
            items: []
        });

        await checkInvoiceStatus.execute('OLD_KEY_1', false);

        // Verify it triggered NEW key generation (Attempt 1 of new day)
        expect(mockSRIService.generateInvoiceXML).toHaveBeenCalledWith(expect.anything(), undefined);
        
        expect(mockBillRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({
            retryCount: 1,
            lastRetryDate: today,
            accessKey: 'NEW_KEY_GENERATED'
        }));
    });
});
