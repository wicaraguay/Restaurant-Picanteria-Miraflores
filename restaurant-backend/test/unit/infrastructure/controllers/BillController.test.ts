
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillController } from '../../../../src/infrastructure/controllers/BillController';
// import { ResponseFormatter } from '../../../../src/infrastructure/utils/ResponseFormatter';
import { NotFoundError } from '../../../../src/domain/errors/CustomErrors';
import { RestaurantConfigModel } from '../../../../src/infrastructure/database/schemas/RestaurantConfigSchema';

// Mock dependencies
vi.mock('../../../../src/infrastructure/database/schemas/RestaurantConfigSchema', () => ({
    RestaurantConfigModel: {
        findOne: vi.fn()
    }
}));

describe('BillController - generateXml', () => {
    let billController: BillController;
    let mockCreateBill: any;
    let mockGetBills: any;
    let mockDeleteBill: any;
    let mockResetBillingSystem: any;
    let mockBillingService: any;
    let mockSRIService: any;

    beforeEach(() => {
        mockCreateBill = {};
        mockGetBills = {
            executeById: vi.fn(),
            executePaginated: vi.fn()
        };
        mockDeleteBill = {};
        mockResetBillingSystem = {};
        mockSRIService = {
            generateInvoiceXML: vi.fn().mockReturnValue('<xml>raw</xml>'),
            signXML: vi.fn().mockResolvedValue('<xml>signed</xml>')
        };
        mockBillingService = {
            getLogoUrl: vi.fn().mockReturnValue('logo.png')
        };

        billController = new BillController(
            mockCreateBill,
            mockGetBills,
            mockDeleteBill,
            mockResetBillingSystem,
            mockBillingService,
            mockSRIService
        );
    });

    it('should generate and return signed XML', async () => {
        const billId = 'bill-123';
        const mockBill = {
            id: billId,
            documentNumber: '001-001-000000001',
            accessKey: '1234567890123456789012345678901234567890123456789',
            customerName: 'Test Client',
            items: [],
            total: 10,
            subtotal: 9,
            tax: 1,
            date: '2024-03-21',
            documentType: 'Factura'
        };

        mockGetBills.executeById.mockResolvedValue(mockBill);
        (RestaurantConfigModel.findOne as any).mockResolvedValue({
            billing: { taxRate: 15 },
            ruc: '1712345678'
        });
        
        const req = { params: { id: billId }, query: {} } as any;
        const res = {
            setHeader: vi.fn(),
            send: vi.fn()
        } as any;
        const next = vi.fn();

        await billController.generateXml(req, res, next);

        expect(mockGetBills.executeById).toHaveBeenCalledWith(billId);
        expect(mockSRIService.generateInvoiceXML).toHaveBeenCalled();
        expect(mockSRIService.signXML).toHaveBeenCalledWith('<xml>raw</xml>');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/xml');
        expect(res.send).toHaveBeenCalledWith('<xml>signed</xml>');
    });

    it('should throw error if bill not found', async () => {
        mockGetBills.executeById.mockResolvedValue(null);
        
        const req = { params: { id: 'invalid' } } as any;
        const res = {} as any;
        const next = vi.fn();

        await billController.generateXml(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('should filter bills by date range in getAll', async () => {
        const req = {
            query: {
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                page: '1',
                limit: '50'
            }
        } as any;
        const res = { json: vi.fn() } as any;
        const next = vi.fn();

        mockGetBills.executePaginated.mockResolvedValue({
            data: [],
            pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrev: false }
        });

        await billController.getAll(req, res, next);

        expect(mockGetBills.executePaginated).toHaveBeenCalledWith(
            1,
            50,
            expect.objectContaining({
                date: { $gte: '2026-01-01', $lte: '2026-12-31' }
            }),
            expect.any(Object)
        );
    });
});
