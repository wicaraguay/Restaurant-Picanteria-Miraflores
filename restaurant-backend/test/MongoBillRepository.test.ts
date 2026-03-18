
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as dbHandler from './helpers/db-handler';
import { MongoBillRepository } from '../src/infrastructure/repositories/MongoBillRepository';
import { Bill } from '../src/domain/entities/Bill';

describe('MongoBillRepository Integration Tests', () => {
    const repository = new MongoBillRepository();

    beforeAll(async () => await dbHandler.connect());
    afterAll(async () => await dbHandler.closeDatabase());
    beforeEach(async () => await dbHandler.clearDatabase());

    it('should create and find a bill', async () => {
        const billData = new Bill(
            '',
            '001-001-000000001',
            'order-123',
            '2023-12-25',
            'Factura',
            'Juan Pérez',
            '1712345678',
            'S/N',
            'juan@example.com',
            [{ name: 'Item 1', quantity: 1, price: 10.00, total: 11.50 }],
            10.00,
            1.50,
            11.50,
            'RIMPE',
            '1234567890123456789012345678901234567890123456789',
            'RECIBIDO',
            '1',
            undefined, // authorizationDate
            undefined, // xmlUrl
            undefined, // pdfUrl
            false,     // hasCreditNote
            '0999999999',
            '01'
        );

        const created = await repository.create(billData);
        expect(created.id).toBeDefined();
        expect(created.documentNumber).toBe('001-001-000000001');

        const found = await repository.findById(created.id!);
        expect(found).not.toBeNull();
        expect(found?.accessKey).toBe(billData.accessKey);
    });

    it('should find by access key', async () => {
        const accessKey = '9999999999999999999999999999999999999999999999999';
        const billData = new Bill(
            '',
            '001-001-000000002',
            'order-456',
            '2023-12-25',
            'Factura',
            'Juan Pérez',
            '1712345678',
            'S/N',
            'juan@example.com',
            [],
            0,
            0,
            0,
            'RIMPE',
            accessKey,
            'RECIBIDO',
            '1',
            undefined,
            undefined,
            undefined,
            false,
            '0999999999',
            '01'
        );

        await repository.create(billData);
        
        const found = await repository.findByAccessKey(accessKey);
        expect(found).not.toBeNull();
        expect(found?.documentNumber).toBe('001-001-000000002');
    });

    it('should upsert a bill by access key', async () => {
        const accessKey = '8888888888888888888888888888888888888888888888888';
        const initialBill = {
            documentNumber: '001-001-000000003',
            accessKey: accessKey,
            sriStatus: 'RECIBIDO'
        };

        const created = await repository.upsert(initialBill as any);
        expect(created.sriStatus).toBe('RECIBIDO');

        // Update status via upsert
        const updated = await repository.upsert({
            accessKey: accessKey,
            sriStatus: 'AUTORIZADO',
            authorizationDate: '2023-12-25T15:00:00'
        } as any);

        expect(updated.sriStatus).toBe('AUTORIZADO');
        expect(updated.authorizationDate).toBe('2023-12-25T15:00:00');
        
        const count = await repository.count();
        expect(count).toBe(1); // Should not have created a new record
    });
});
