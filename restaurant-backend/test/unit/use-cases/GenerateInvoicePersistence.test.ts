
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateInvoice } from '../../../src/application/use-cases/GenerateInvoice';
import { SRIService } from '../../../src/infrastructure/services/SRIService';
import { PDFService } from '../../../src/infrastructure/services/PDFService';
import { BillingService } from '../../../src/application/services/BillingService';

vi.mock('../../../src/infrastructure/database/DatabaseConnection', () => ({
    dbConnection: {
        withTransaction: vi.fn((callback: any) => callback(null))
    }
}));

describe('GenerateInvoice Persistence', () => {
    let generateInvoice: GenerateInvoice;
    let mockConfigRepo: any;
    let mockBillRepo: any;
    let mockOrderRepo: any;
    let mockSRIService: any;
    let mockPDFService: any;
    let mockEmailService: any;
    let mockBillingService: any;

    beforeEach(() => {
        mockConfigRepo = {
            get: vi.fn().mockResolvedValue({
                billing: { environment: '1', establishment: '001', emissionPoint: '001', currentSequenceFactura: 1 },
                ruc: '1712345678001',
                address: 'Quito'
            }),
            update: vi.fn(),
            getEnvironment: vi.fn().mockResolvedValue("1"),
            getNextSequential: vi.fn().mockResolvedValue(1)
        };
        mockBillRepo = {
            upsert: vi.fn().mockResolvedValue({ id: 'bill123' }),
            findById: vi.fn().mockResolvedValue(null)
        };
        mockOrderRepo = { findById: vi.fn().mockResolvedValue({ id: 'order123', items: [], total: 100 }), update: vi.fn() };
        mockSRIService = {
            generateInvoiceXML: vi.fn().mockReturnValue('<xml></xml>'),
            signXML: vi.fn().mockResolvedValue('signed-xml'),
            sendToSRI: vi.fn().mockResolvedValue({ estado: 'RECIBIDA' }),
            waitForAuthorization: vi.fn().mockResolvedValue({ estado: 'AUTORIZADO', fechaAutorizacion: '2023-12-25' }),
            authorizeInvoice: vi.fn()
        };
        mockPDFService = { generateInvoicePDF: vi.fn().mockResolvedValue(Buffer.from('pdf')) };
        mockEmailService = { sendInvoiceEmail: vi.fn().mockResolvedValue(true) };
        mockBillingService = new BillingService();

        generateInvoice = new GenerateInvoice(
            mockConfigRepo,
            mockBillRepo,
            mockOrderRepo,
            mockSRIService as unknown as SRIService,
            mockPDFService as unknown as PDFService,
            mockEmailService,
            mockBillingService
        );
    });

    it('should persist customerEmail when generating invoice', async () => {
        const request = {
            order: { id: 'order123', items: [], total: 100 },
            client: {
                identification: '1712345678',
                name: 'Test Client',
                email: 'test@client.com',
                address: 'Test Address',
                phone: '0987654321',
                paymentMethod: '19'
            }
        };

        await generateInvoice.execute(request as any);

        expect(mockBillRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({
            customerEmail: 'test@client.com',
            customerAddress: 'Test Address'
        }));
    });

    it('should use payment method code in invoice info', async () => {
        const request = {
            order: { id: 'order123', items: [], total: 100 },
            client: {
                identification: '1712345678',
                name: 'Test Client',
                email: 'test@client.com',
                address: 'Test Address',
                phone: '0987654321'
            }
        };

        await generateInvoice.execute(request as any);

        // The invoice is generated with payment method, verified through XML generation
        expect(mockSRIService.generateInvoiceXML).toHaveBeenCalledWith(expect.objectContaining({
            info: expect.objectContaining({
                formaPago: '01' // Default payment method
            })
        }));
    });
});
