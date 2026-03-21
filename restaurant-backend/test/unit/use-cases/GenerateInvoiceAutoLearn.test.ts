
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

describe('GenerateInvoice Auto-Learning', () => {
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
            getNextSequential: vi.fn().mockResolvedValue(2)
        };
        mockBillRepo = { upsert: vi.fn().mockResolvedValue({ id: 'bill123' }) };
        mockOrderRepo = { findById: vi.fn().mockResolvedValue({ id: 'order123', items: [], total: 100 }), update: vi.fn() };
        mockSRIService = { 
            generateInvoiceXML: vi.fn().mockReturnValue('<xml></xml>'),
            signXML: vi.fn().mockResolvedValue('signed-xml'), 
            sendToSRI: vi.fn().mockResolvedValue({ estado: 'RECIBIDA' }), 
            waitForAuthorization: vi.fn().mockResolvedValue({ estado: 'AUTORIZADO', fechaAutorizacion: '2023-12-25' }) 
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

    const validRequest = {
        order: { id: 'order123', items: [], total: 100 },
        client: {
            identification: '1712345678',
            name: 'Willy Tech',
            email: 'willy@tech.dev',
            address: 'Quito',
            phone: '0999999999'
        }
    };

    it('should create a NEW customer if they do not exist', async () => {
        mockCustomerRepo.findByIdentification.mockResolvedValue(null);

        await generateInvoice.execute(validRequest as any);

        expect(mockCustomerRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            identification: '1712345678',
            name: 'Willy Tech'
        }));
        expect(mockCustomerRepo.update).not.toHaveBeenCalled();
    });

    it('should UPDATE existing customer if they already exist', async () => {
        mockCustomerRepo.findByIdentification.mockResolvedValue({ id: 'cust123', identification: '1712345678' });

        await generateInvoice.execute(validRequest as any);

        expect(mockCustomerRepo.update).toHaveBeenCalledWith('cust123', expect.objectContaining({
            name: 'Willy Tech'
        }));
        expect(mockCustomerRepo.create).not.toHaveBeenCalled();
    });

    it('should NOT learn if it is Consumidor Final', async () => {
        const cfRequest = {
            ...validRequest,
            order: { ...validRequest.order, total: 40 },
            client: { ...validRequest.client, identification: '9999999999999', name: 'CONSUMIDOR FINAL' }
        };

        await generateInvoice.execute(cfRequest as any);

        expect(mockCustomerRepo.findByIdentification).not.toHaveBeenCalled();
        expect(mockCustomerRepo.create).not.toHaveBeenCalled();
        expect(mockCustomerRepo.update).not.toHaveBeenCalled();
    });
});
