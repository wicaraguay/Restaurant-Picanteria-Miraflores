import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateInvoice } from '../../../src/application/use-cases/GenerateInvoice';
import { UpdateBill } from '../../../src/application/use-cases/UpdateBill';
import { SRIService } from '../../../src/infrastructure/services/SRIService';
import { PDFService } from '../../../src/infrastructure/services/PDFService';
import { BillingService } from '../../../src/application/services/BillingService';

describe('Advanced Billing Workflow', () => {
    let generateInvoice: GenerateInvoice;
    let updateBill: UpdateBill;
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
        // Mock Bill Repository to return different things for different stages
        mockBillRepo = { 
            upsert: vi.fn().mockImplementation((bill) => Promise.resolve({ ...bill, id: bill.id || 'bill123' })),
            findById: vi.fn().mockImplementation((id) => Promise.resolve({
                id,
                customerName: 'Old Name',
                customerIdentification: '9999999999',
                sriStatus: 'ERROR',
                items: [
                   { name: 'Old Item', quantity: 1, price: 10, total: 10 }
                ],
                total: 10,
                subtotal: 10,
                tax: 0,
                documentNumber: '001-001-000000001',
                date: '2023-01-01',
                orderId: 'order123'
            }))
        };
        mockOrderRepo = { 
            findById: vi.fn().mockResolvedValue({ id: 'order123', items: [], total: 10 }), 
            update: vi.fn() 
        };
        mockSRIService = { 
            generateInvoiceXML: vi.fn().mockReturnValue('<xml></xml>'),
            signXML: vi.fn().mockResolvedValue('signed-xml-content'), 
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

        updateBill = new UpdateBill(mockBillRepo, mockBillingService);
    });

    it('should transition through states BORRADOR -> VALIDADO -> AUTHORIZED and save xmlContent', async () => {
        const request = {
            order: { id: 'order123', items: [{ name: 'Item 1', quantity: 1, total: 100 }], total: 100 },
            client: {
                identification: '1712345678',
                name: 'Test Client',
                email: 'test@client.com',
                address: 'Test Address',
                phone: '0987654321',
                paymentMethod: '01'
            }
        };

        const result = await generateInvoice.execute(request as any);

        // Check if upsert was called for BORRADOR
        expect(mockBillRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({
            sriStatus: 'BORRADOR',
            documentNumber: expect.any(String)
        }));

        // Check if upsert was called for VALIDADO with xmlContent
        expect(mockBillRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({
            sriStatus: 'VALIDADO',
            xmlContent: 'signed-xml-content'
        }));

        // Check final result
        expect(result.authorization.estado).toBe('AUTORIZADO');
        expect(mockBillRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({
            sriStatus: 'AUTORIZADO'
        }));
    });

    it('should update items and re-calculate totals with UpdateBill', async () => {
        const updateData = {
            name: 'New Name',
            items: [
                { name: 'New Item 1', quantity: 2, total: 100 }, // Total 100 (incl taxes)
                { name: 'New Item 2', quantity: 1, total: 20 }  // Total 20 (incl taxes)
            ],
            taxRate: 15
        };

        const result = await updateBill.execute('bill123', updateData);

        expect(mockBillRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({
            id: 'bill123',
            customerName: 'New Name',
            total: 120, // 100 + 20
            sriStatus: 'BORRADOR'
        }));
        
        expect(result.items).toHaveLength(2);
        expect(result.items[0].name).toBe('New Item 1');
    });

    it('should reuse existing bill ID when re-submitting', async () => {
        const request = {
            id: 'existing-bill-123',
            order: { id: 'order123', items: [{ name: 'item', quantity: 1, total: 100 }], total: 100 },
            client: {
                identification: '1712345678',
                name: 'Test Client',
                email: 'test@client.com',
                address: 'Test Address',
                phone: '0987654321',
                paymentMethod: '01'
            }
        };

        await generateInvoice.execute(request as any);

        expect(mockBillRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({
            id: 'existing-bill-123'
        }));
    });
});
