
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckCreditNoteStatus } from '../../../src/application/use-cases/CheckCreditNoteStatus';
import { BillingService } from '../../../src/application/services/BillingService';

describe('Credit Note Retry Limit Logic (CheckCreditNoteStatus)', () => {
    let checkCreditNoteStatus: CheckCreditNoteStatus;
    let mockConfigRepo: any;
    let mockCreditNoteRepo: any;
    let mockBillRepo: any;
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
            })
        };
        
        mockCreditNoteRepo = {
            findByAccessKey: vi.fn(),
            findById: vi.fn(),
            update: vi.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
            findByBillId: vi.fn().mockResolvedValue([])
        };

        mockBillRepo = {
            findById: vi.fn().mockResolvedValue({
                id: 'bill123',
                documentNumber: '001-001-000000001',
                customerIdentification: '1234567890',
                items: [],
                total: 10
            }),
            upsert: vi.fn()
        };
        
        mockSRIService = {
            authorizeCreditNote: vi.fn().mockResolvedValue({ estado: 'EN PROCESO' }),
            waitForAuthorization: vi.fn().mockResolvedValue({ 
                estado: 'AUTORIZADO', 
                fechaAutorizacion: '2026-03-25 15:00:00' 
            }),
            generateCreditNoteXML: vi.fn().mockImplementation((nc, key) => {
                nc.info.claveAcceso = key || 'NEW_NC_KEY_GENERATED';
                return '<xml></xml>';
            }),
            signXML: vi.fn().mockResolvedValue('signed-xml'),
            sendCreditNoteToSRI: vi.fn().mockResolvedValue({ estado: 'RECIBIDA' })
        };
        
        mockPDFService = {
            generateCreditNotePDF: vi.fn().mockResolvedValue(Buffer.from('pdf'))
        };
        mockEmailService = {
            sendCreditNoteEmail: vi.fn().mockResolvedValue(true)
        };
        billingService = new BillingService();

        checkCreditNoteStatus = new CheckCreditNoteStatus(
            mockConfigRepo,
            mockCreditNoteRepo,
            mockBillRepo,
            mockSRIService as any,
            mockPDFService as any,
            mockEmailService as any,
            billingService
        );
    });

    it('should increment retryCount and use SAME key on first failed attempt of the SAME day (Attempt 1 -> 2)', async () => {
        const today = billingService.getCurrentDateEcuador().split('/').reverse().join('-');
        const baseNC = {
            id: 'nc123', 
            accessKey: 'OLD_NC_KEY_1', 
            documentNumber: '001-001-000000001', 
            retryCount: 1, 
            lastRetryDate: today,
            billId: 'bill123',
            items: [],
            date: new Date().toISOString(),
            subtotal: 10,
            tax: 1.5,
            total: 11.5,
            customerName: 'Test Client',
            customerIdentification: '1234567890',
            customerEmail: 'test@example.com'
        };
        
        mockCreditNoteRepo.findByAccessKey.mockResolvedValue(baseNC);
        mockCreditNoteRepo.findById.mockResolvedValue(baseNC);

        await checkCreditNoteStatus.execute('OLD_NC_KEY_1');

        // Verify it used the SAME key (Attempt 2)
        expect(mockSRIService.authorizeCreditNote).toHaveBeenCalledWith('OLD_NC_KEY_1', false);
        
        expect(mockCreditNoteRepo.update).toHaveBeenCalledWith('nc123', expect.objectContaining({
            retryCount: 2,
            lastRetryDate: today
        }));
    });

    it('should STOP and return error if daily limit (3) is reached on the SAME day', async () => {
        const today = billingService.getCurrentDateEcuador().split('/').reverse().join('-');
        const ncData = {
            id: 'nc123', 
            accessKey: 'OLD_NC_KEY_1', 
            documentNumber: '001-001-000000001', 
            retryCount: 3, 
            lastRetryDate: today,
            billId: 'bill123'
        };
        
        mockCreditNoteRepo.findByAccessKey.mockResolvedValueOnce(ncData);

        const result = await checkCreditNoteStatus.execute('OLD_NC_KEY_1');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Límite de 3 intentos diarios alcanzado');
        // Verify SRI was NOT called for authorization query
        expect(mockSRIService.authorizeCreditNote).not.toHaveBeenCalled();
    });

    it('should RESET counter and generate NEW key if last retry was on a PREVIOUS day', async () => {
        const today = billingService.getCurrentDateEcuador().split('/').reverse().join('-');
        const yesterday = '2023-01-01';
        const baseNC = {
            id: 'nc123', 
            accessKey: 'OLD_NC_KEY_1', 
            documentNumber: '001-001-000000001', 
            retryCount: 2, 
            lastRetryDate: yesterday,
            billId: 'bill123',
            items: [],
            date: new Date().toISOString(),
            subtotal: 10,
            tax: 1.5,
            total: 11.5,
            customerName: 'Test Client',
            customerIdentification: '1234567890',
            customerEmail: 'test@example.com'
        };
        
        mockCreditNoteRepo.findByAccessKey.mockResolvedValueOnce(baseNC);
        mockCreditNoteRepo.findById.mockResolvedValueOnce(baseNC);

        await checkCreditNoteStatus.execute('OLD_NC_KEY_1');

        // Verify it triggered NEW key generation (Attempt 1 of new day)
        expect(mockSRIService.generateCreditNoteXML).toHaveBeenCalledWith(expect.anything(), undefined);
        
        expect(mockCreditNoteRepo.update).toHaveBeenCalledWith('nc123', expect.objectContaining({
            retryCount: 1,
            lastRetryDate: today,
            accessKey: 'NEW_NC_KEY_GENERATED'
        }));
    });
});
