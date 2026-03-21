import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateInvoice } from '../../../src/application/use-cases/GenerateInvoice';
import { OrderStatus } from '../../../src/domain/entities/Order';

describe('GenerateInvoice Customer Learning Repro', () => {
    let generateInvoice: GenerateInvoice;
    let mockConfigRepo: any;
    let mockBillRepo: any;
    let mockOrderRepo: any;
    let mockSRIService: any;
    let mockPDFService: any;
    let mockEmailService: any;
    let mockBillingService: any;
    let mockCustomerRepo: any;

    beforeEach(() => {
        mockConfigRepo = {
            get: vi.fn().mockResolvedValue({ businessName: 'Test', ruc: '123' }),
            getNextSequential: vi.fn().mockResolvedValue(1)
        };
        mockBillRepo = { upsert: vi.fn().mockResolvedValue({}) };
        mockOrderRepo = { update: vi.fn().mockResolvedValue({}) };
        mockSRIService = {
            generateInvoiceXML: vi.fn().mockReturnValue('<xml></xml>'),
            signXML: vi.fn().mockResolvedValue('<signed></signed>'),
            sendToSRI: vi.fn().mockResolvedValue({ estado: 'RECIBIDA' }),
            waitForAuthorization: vi.fn().mockResolvedValue({ estado: 'AUTORIZADO' })
        };
        mockPDFService = { generateInvoicePDF: vi.fn().mockResolvedValue(Buffer.from('pdf')) };
        mockEmailService = { sendInvoiceEmail: vi.fn().mockResolvedValue({}) };
        mockBillingService = {
            validateEmail: vi.fn(),
            calculateDetails: vi.fn().mockReturnValue([]),
            getCurrentDateEcuador: vi.fn().mockReturnValue('17/03/2026'),
            getIdentificacionType: vi.fn().mockReturnValue('05'),
            getLogoUrl: vi.fn().mockReturnValue('logo.png'),
            validateRealTimeTransmission: vi.fn(),
            validateConsumidorFinal: vi.fn()
        };
        mockCustomerRepo = {
            findByIdentification: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        };

        generateInvoice = new GenerateInvoice(
            mockConfigRepo,
            mockBillRepo,
            mockOrderRepo,
            mockSRIService,
            mockPDFService,
            mockEmailService,
            mockBillingService,
            mockCustomerRepo
        );
    });

    it('should attempt to create a customer if it does not exist', async () => {
        const client = { identification: '1234567890', name: 'New Client', email: '' };
        const order = { id: 'order-1', items: [] };

        mockCustomerRepo.findByIdentification.mockResolvedValue(null);
        mockCustomerRepo.create.mockResolvedValue({ id: 'cust-1', ...client });

        await generateInvoice.execute({ order, client });

        expect(mockCustomerRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            identification: '1234567890',
            email: undefined,
            phone: undefined
        }));
    });
});
