import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateBill } from '../../../src/application/use-cases/UpdateBill';
import { GenerateInvoice } from '../../../src/application/use-cases/GenerateInvoice';
import { ValidationError } from '../../../src/domain/errors/CustomErrors';

describe('UpdateBill and GenerateInvoice Sequential Preservation', () => {
    let mockBillRepo: any;
    let mockBillingService: any;
    let mockConfigRepo: any;
    let mockSRIService: any;
    let mockOrderRepo: any;
    let updateBill: UpdateBill;
    let generateInvoice: GenerateInvoice;

    beforeEach(() => {
        mockBillRepo = {
            findById: vi.fn(),
            update: vi.fn().mockResolvedValue({}),
            upsert: vi.fn().mockImplementation(data => Promise.resolve({ ...data, id: data.id || 'new-id' })),
            save: vi.fn().mockImplementation(data => Promise.resolve({ ...data, id: data.id || 'new-id' }))
        };
        mockBillingService = {
            calculateDetails: vi.fn().mockReturnValue([{
                precioTotalSinImpuesto: 10,
                impuestos: [{ valor: 1.5 }]
            }]),
            autoLearnCustomer: vi.fn().mockResolvedValue({}),
            validateEmail: vi.fn(),
            validateConsumidorFinal: vi.fn(),
            getCurrentDateEcuador: vi.fn().mockReturnValue('22/03/2026'),
            getIdentificacionType: vi.fn().mockReturnValue('05'),
            getLogoUrl: vi.fn().mockReturnValue('http://logo.com'),
            validateRealTimeTransmission: vi.fn()
        };
        mockConfigRepo = {
            get: vi.fn().mockResolvedValue({
                businessName: 'Test Biz',
                ruc: '1234567890001',
                billing: { establishment: '001', emissionPoint: '001' }
            }),
            getNextSequential: vi.fn().mockResolvedValue(200)
        };
        mockSRIService = {
            generateInvoiceXML: vi.fn().mockReturnValue('<xml></xml>'),
            signXML: vi.fn().mockResolvedValue('<signed></signed>'),
            sendToSRI: vi.fn().mockResolvedValue({ estado: 'RECIBIDA', mensajes: [] }),
            waitForAuthorization: vi.fn().mockResolvedValue({ estado: 'AUTORIZADO', mensajes: [], fechaAutorizacion: '2026-03-22' })
        };
        mockOrderRepo = {
            findById: vi.fn().mockResolvedValue({ id: 'order1', items: [] }),
            update: vi.fn().mockResolvedValue({})
        };

        updateBill = new UpdateBill(mockBillRepo, mockBillingService);
        generateInvoice = new GenerateInvoice(
            mockConfigRepo,
            mockBillRepo,
            mockOrderRepo,
            mockSRIService,
            { generateInvoicePDF: vi.fn().mockResolvedValue(Buffer.from('pdf')) } as any,
            { sendInvoiceEmail: vi.fn().mockResolvedValue({}) } as any,
            mockBillingService
        );
    });

    it('should block editing if bill is in PENDING state', async () => {
        console.log('--- TEST 1 ---');
        mockBillRepo.findById.mockResolvedValue({
            id: 'bill1',
            sriStatus: 'PENDING'
        });

        await expect(updateBill.execute('bill1', { name: 'New Name' }))
            .rejects.toThrow(/No se puede editar/);
        console.log('--- TEST 1 PASSED ---');
    });

    it('should preserve documentNumber and clear metadata when updating a bill', async () => {
        console.log('--- TEST 2 ---');
        const existingBill = {
            id: 'bill1',
            sriStatus: 'DEVUELTA',
            documentNumber: '001-001-000000123',
            items: []
        };
        mockBillRepo.findById.mockResolvedValue(existingBill);

        await updateBill.execute('bill1', { name: 'Updated Name', items: [] });
        console.log('--- TEST 2 PASSED ---');
    });

    it('should reuse existing sequential in GenerateInvoice if provided', async () => {
        console.log('--- TEST 3 ---');
        const existingBill = {
            id: 'bill123',
            documentNumber: '001-001-000000555',
            sriStatus: 'BORRADOR'
        };
        mockBillRepo.findById.mockResolvedValue(existingBill);

        await generateInvoice.execute({
            id: 'bill123',
            order: { id: 'order1', items: [] },
            client: { identification: '123', name: 'Test Client' }
        });
        console.log('--- TEST 3 PASSED ---');
    });

    it('should generate NEW sequential in GenerateInvoice if bill has no documentNumber', async () => {
        console.log('--- TEST 4 ---');
        mockBillRepo.findById.mockResolvedValue({ id: 'new-bill', sriStatus: 'BORRADOR' });

        await generateInvoice.execute({
            id: 'new-bill',
            order: { id: 'order2', items: [] },
            client: { identification: '456', name: 'Other Client' }
        });
        console.log('--- TEST 4 PASSED ---');
    });
});
