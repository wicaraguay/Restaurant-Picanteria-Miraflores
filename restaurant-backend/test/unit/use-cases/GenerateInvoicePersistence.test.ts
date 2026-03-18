
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateInvoice } from '../../../src/application/use-cases/GenerateInvoice';
import { IRestaurantConfigRepository } from '../../../src/domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../../src/domain/repositories/IBillRepository';
import { IOrderRepository } from '../../../src/domain/repositories/IOrderRepository';
import { ICustomerRepository } from '../../../src/domain/repositories/ICustomerRepository';
import { SRIService } from '../../../src/infrastructure/services/SRIService';
import { PDFService } from '../../../src/infrastructure/services/PDFService';
import { IEmailService } from '../../../src/application/interfaces/IEmailService';
import { BillingService } from '../../../src/application/services/BillingService';

describe('GenerateInvoice Persistence', () => {
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
            get: vi.fn().mockResolvedValue({ 
                billing: { environment: '1', establishment: '001', emissionPoint: '001', currentSequenceFactura: 1 },
                ruc: '1712345678001',
                address: 'Quito'
            }), 
            update: vi.fn(),
            getNextSequential: vi.fn().mockResolvedValue(1)
        };
        mockBillRepo = { upsert: vi.fn().mockResolvedValue({ id: 'bill123' }) };
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
        mockCustomerRepo = { findByIdentification: vi.fn(), create: vi.fn(), update: vi.fn() };

        generateInvoice = new GenerateInvoice(
            mockConfigRepo,
            mockBillRepo,
            mockOrderRepo,
            mockSRIService as unknown as SRIService,
            mockPDFService as unknown as PDFService,
            mockEmailService,
            mockBillingService,
            mockCustomerRepo
        );
    });

    it('should persist customerPhone and paymentMethod when generating invoice', async () => {
        const request = {
            order: { id: 'order123', items: [], total: 100 },
            client: {
                identification: '1712345678',
                name: 'Test Client',
                email: 'test@client.com',
                address: 'Test Address',
                phone: '0987654321',
                paymentMethod: '19' // Credit Card
            }
        };

        await generateInvoice.execute(request as any);

        expect(mockBillRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({
            customerPhone: '0987654321',
            paymentMethod: '19',
            regime: 'General'
        }));
    });

    it('should use default payment method 01 if not provided', async () => {
        const request = {
            order: { id: 'order123', items: [], total: 100 },
            client: {
                identification: '1712345678',
                name: 'Test Client',
                email: 'test@client.com',
                address: 'Test Address',
                phone: '0987654321'
                // paymentMethod missing
            }
        };

        await generateInvoice.execute(request as any);

        expect(mockBillRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({
            paymentMethod: '01'
        }));
    });
});
