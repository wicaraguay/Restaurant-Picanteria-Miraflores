
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateInvoice } from '../../../src/application/use-cases/GenerateInvoice';
import { BillingService } from '../../../src/application/services/BillingService';
import { ValidationError } from '../../../src/domain/errors/CustomErrors';

describe('GenerateInvoice - Consumidor Final (SRI 2026)', () => {
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
            get: vi.fn().mockResolvedValue({ 
                billing: { environment: '1', establishment: '001', emissionPoint: '001' },
                ruc: '1712345678001',
                address: 'Quito'
            }), 
            getNextSequential: vi.fn().mockResolvedValue(1)
        };
        mockBillRepo = { upsert: vi.fn().mockResolvedValue({}) };
        mockOrderRepo = { update: vi.fn() };
        mockSRIService = { 
            generateInvoiceXML: vi.fn().mockReturnValue('<xml></xml>'),
            signXML: vi.fn().mockResolvedValue('signed-xml'), 
            sendToSRI: vi.fn().mockResolvedValue({ estado: 'RECIBIDA' }), 
            waitForAuthorization: vi.fn().mockResolvedValue({ estado: 'AUTORIZADO' }) 
        };
        mockPDFService = { generateInvoicePDF: vi.fn() };
        mockEmailService = { sendInvoiceEmail: vi.fn() };
        mockBillingService = new BillingService();
        mockCustomerRepo = { findByIdentification: vi.fn(), create: vi.fn(), update: vi.fn() };

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

    it('should throw ValidationError if Consumidor Final total is >= $50', async () => {
        const largeOrder = {
            id: 'order123',
            items: [{ name: 'Expensive Item', quantity: 1, total: 60 }] // Total $60
        };
        const cfClient = { identification: '9999999999999', name: 'Some Name' };

        await expect(generateInvoice.execute({ order: largeOrder, client: cfClient } as any))
            .rejects.toThrow(ValidationError);
        
        await expect(generateInvoice.execute({ order: largeOrder, client: cfClient } as any))
            .rejects.toThrow(/Límite de Consumidor Final excedido/);
    });

    it('should allow Consumidor Final if total is < $50', async () => {
        const smallOrder = {
            id: 'order123',
            items: [{ name: 'Cheap Item', quantity: 1, total: 40 }] // Total $40
        };
        const cfClient = { identification: '9999999999999', name: 'Some Name' };

        const result = await generateInvoice.execute({ order: smallOrder, client: cfClient } as any);
        
        expect(result.success).toBe(true);
        // Verify that the name was forced to CONSUMIDOR FINAL in the XML generation
        expect(mockSRIService.generateInvoiceXML).toHaveBeenCalledWith(
            expect.objectContaining({
                info: expect.objectContaining({
                    razonSocialComprador: 'CONSUMIDOR FINAL'
                })
            })
        );
    });

    it('should force "CONSUMIDOR FINAL" name even if user provided a different one', async () => {
        const smallOrder = {
            id: 'order123',
            items: [{ name: 'Cheap Item', quantity: 1, total: 10 }]
        };
        const cfClient = { identification: '9999999999999', name: 'John Doe' };

        await generateInvoice.execute({ order: smallOrder, client: cfClient } as any);
        
        expect(mockSRIService.generateInvoiceXML).toHaveBeenCalledWith(
            expect.objectContaining({
                info: expect.objectContaining({
                    razonSocialComprador: 'CONSUMIDOR FINAL'
                })
            })
        );
    });

    it('should NOT force name for identified customers', async () => {
        const order = {
            id: 'order123',
            items: [{ name: 'Item', quantity: 1, total: 10 }]
        };
        const realClient = { identification: '1712345678', name: 'Willy Tech' };

        await generateInvoice.execute({ order: order, client: realClient } as any);
        
        expect(mockSRIService.generateInvoiceXML).toHaveBeenCalledWith(
            expect.objectContaining({
                info: expect.objectContaining({
                    razonSocialComprador: 'Willy Tech'
                })
            })
        );
    });
});
