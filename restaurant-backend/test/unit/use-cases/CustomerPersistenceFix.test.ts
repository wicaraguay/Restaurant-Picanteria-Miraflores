import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateInvoice } from '../../../src/application/use-cases/GenerateInvoice';
import { BillingService } from '../../../src/application/services/BillingService';
import { ICustomerRepository } from '../../../src/domain/repositories/ICustomerRepository';

describe('GenerateInvoice Customer Persistence (Reproduction)', () => {
    let generateInvoice: GenerateInvoice;
    let mockConfigRepo: any;
    let mockBillRepo: any;
    let mockOrderRepo: any;
    let mockSRIService: any;
    let mockPDFService: any;
    let mockEmailService: any;
    let mockBillingService: BillingService;
    let mockCustomerRepo: any;

    beforeEach(() => {
        mockConfigRepo = {
            get: vi.fn().mockResolvedValue({ businessName: 'Test', ruc: '123' }),
            getNextSequential: vi.fn().mockResolvedValue(1)
        };
        mockBillRepo = { upsert: vi.fn().mockResolvedValue({ id: 'bill-1' }) };
        mockOrderRepo = { update: vi.fn().mockResolvedValue({}) };
        mockSRIService = {
            generateInvoiceXML: vi.fn().mockReturnValue('<xml></xml>'),
            signXML: vi.fn().mockResolvedValue('<signed></signed>'),
            sendToSRI: vi.fn(), // We will mock this to throw
            waitForAuthorization: vi.fn()
        };
        mockPDFService = { generateInvoicePDF: vi.fn().mockResolvedValue(Buffer.from('pdf')) };
        mockEmailService = { sendInvoiceEmail: vi.fn().mockResolvedValue({}) };
        mockCustomerRepo = {
            findByIdentification: vi.fn(),
            create: vi.fn().mockResolvedValue({ id: 'cust-1' }),
            update: vi.fn().mockResolvedValue({})
        };
        mockBillingService = new BillingService(mockCustomerRepo as unknown as ICustomerRepository);
        
        // Mock specific methods needed for GenerateInvoice
        mockBillingService.validateEmail = vi.fn();
        mockBillingService.calculateDetails = vi.fn().mockReturnValue([]);
        mockBillingService.getCurrentDateEcuador = vi.fn().mockReturnValue('17/03/2026');
        mockBillingService.getIdentificacionType = vi.fn().mockReturnValue('05');
        mockBillingService.getLogoUrl = vi.fn().mockReturnValue('logo.png');
        mockBillingService.validateRealTimeTransmission = vi.fn();
        mockBillingService.validateConsumidorFinal = vi.fn();

        generateInvoice = new GenerateInvoice(
            mockConfigRepo,
            mockBillRepo,
            mockOrderRepo,
            mockSRIService,
            mockPDFService,
            mockEmailService,
            mockBillingService
        );
    });

    it('SHOULD save customer even if SRI fails (Failure Case)', async () => {
        const client = { identification: '1234567890', name: 'New Client', email: 'test@test.com' };
        const order = { id: 'order-1', items: [] };

        // Mock SRI failure (Throws an error)
        mockSRIService.sendToSRI.mockRejectedValue(new Error('SRI connection failed'));
        mockCustomerRepo.findByIdentification.mockResolvedValue(null);

        // Execute and expect it to throw
        await expect(generateInvoice.execute({ order, client })).rejects.toThrow('SRI connection failed');

        // VERIFY: Did it try to create the customer?
        // In the current implementation (BUG), this will FAIL because SRI error happens before customer creation.
        expect(mockCustomerRepo.create).toHaveBeenCalled();
    });
});
