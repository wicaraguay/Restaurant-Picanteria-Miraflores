/**
 * @file CustomerCRUD.test.ts
 * @description Integration tests for Customer CRUD operations.
 *
 * These tests use an in-memory MongoDB instance to verify that:
 * - Customers can be created with or without identification
 * - Multiple customers WITHOUT identification don't conflict (sparse index)
 * - Customers WITH the same identification DO conflict (unique constraint)
 * - Update and Delete operate correctly
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CustomerModel, CustomerDocument } from '../../../src/infrastructure/database/schemas/CustomerSchema';
import { MongoCustomerRepository } from '../../../src/infrastructure/repositories/MongoCustomerRepository';
import { CreateCustomer } from '../../../src/application/use-cases/CreateCustomer';
import { UpdateCustomer } from '../../../src/application/use-cases/UpdateCustomer';
import { DeleteCustomer } from '../../../src/application/use-cases/DeleteCustomer';
import { GetCustomers } from '../../../src/application/use-cases/GetCustomers';

let mongoServer: MongoMemoryServer;
let repository: MongoCustomerRepository;
let createCustomer: CreateCustomer;
let updateCustomer: UpdateCustomer;
let deleteCustomer: DeleteCustomer;
let getCustomers: GetCustomers;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    // Ensure indexes are created (including sparse unique on identification)
    await CustomerModel.ensureIndexes();

    repository = new MongoCustomerRepository();
    createCustomer = new CreateCustomer(repository);
    updateCustomer = new UpdateCustomer(repository);
    deleteCustomer = new DeleteCustomer(repository);
    getCustomers = new GetCustomers(repository);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await CustomerModel.deleteMany({});
});

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

describe('CREATE customer', () => {
    it('creates a customer WITH identification', async () => {
        const customer = await createCustomer.execute({
            name: 'JUAN PEREZ',
            identification: '1712345678',
            email: 'juan@test.com',
            phone: '0999999999',
            address: 'Calle 1',
            loyaltyPoints: 0,
            lastVisit: new Date(),
        } as any);

        expect(customer.id).toBeDefined();
        expect(customer.name).toBe('JUAN PEREZ');
        expect(customer.identification).toBe('1712345678');
    });

    it('creates a customer WITHOUT identification (no ID conflict)', async () => {
        const customer = await createCustomer.execute({
            name: 'CLIENTE SIN ID',
            email: 'sin@test.com',
            phone: '0988888888',
            address: 'Calle 2',
            loyaltyPoints: 0,
            lastVisit: new Date(),
        } as any);

        expect(customer.id).toBeDefined();
        expect(customer.identification).toBeUndefined();
    });

    it('creates MULTIPLE customers WITHOUT identification — sparse index allows it', async () => {
        // This is the critical test: multiple customers with no identification must all succeed
        const c1 = await createCustomer.execute({
            name: 'CLIENTE UNO',
            loyaltyPoints: 0,
            lastVisit: new Date(),
        } as any);

        const c2 = await createCustomer.execute({
            name: 'CLIENTE DOS',
            loyaltyPoints: 0,
            lastVisit: new Date(),
        } as any);

        const c3 = await createCustomer.execute({
            name: 'CLIENTE TRES',
            loyaltyPoints: 0,
            lastVisit: new Date(),
        } as any);

        expect(c1.id).toBeDefined();
        expect(c2.id).toBeDefined();
        expect(c3.id).toBeDefined();
        expect(c1.id).not.toBe(c2.id);
        expect(c2.id).not.toBe(c3.id);
    });

    it('fails when two customers share the SAME identification', async () => {
        await createCustomer.execute({
            name: 'PRIMERO',
            identification: '9999999999',
            loyaltyPoints: 0,
            lastVisit: new Date(),
        } as any);

        await expect(createCustomer.execute({
            name: 'DUPLICADO',
            identification: '9999999999',
            loyaltyPoints: 0,
            lastVisit: new Date(),
        } as any)).rejects.toThrow();
    });

    it('treats empty string identification as absent — no sparse conflict', async () => {
        // empty string "" must be converted to undefined by the schema setter
        const c1 = await createCustomer.execute({
            name: 'VACIO UNO',
            identification: '',  // empty string — should be stored as absent
            loyaltyPoints: 0,
            lastVisit: new Date(),
        } as any);

        const c2 = await createCustomer.execute({
            name: 'VACIO DOS',
            identification: '',  // also empty
            loyaltyPoints: 0,
            lastVisit: new Date(),
        } as any);

        expect(c1.id).toBeDefined();
        expect(c2.id).toBeDefined();
    });
});

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

describe('GET customers', () => {
    it('returns empty list when no customers exist', async () => {
        const result = await getCustomers.executePaginated(1, 50);
        expect(result.data).toHaveLength(0);
        expect(result.pagination.total).toBe(0);
    });

    it('returns all created customers', async () => {
        await createCustomer.execute({ name: 'A', loyaltyPoints: 0, lastVisit: new Date() } as any);
        await createCustomer.execute({ name: 'B', loyaltyPoints: 0, lastVisit: new Date() } as any);
        await createCustomer.execute({ name: 'C', loyaltyPoints: 0, lastVisit: new Date() } as any);

        const result = await getCustomers.executePaginated(1, 50);
        expect(result.data).toHaveLength(3);
        expect(result.pagination.total).toBe(3);
    });

    it('supports pagination correctly', async () => {
        for (let i = 1; i <= 5; i++) {
            await createCustomer.execute({ name: `CLIENTE ${i}`, loyaltyPoints: 0, lastVisit: new Date() } as any);
        }

        const page1 = await getCustomers.executePaginated(1, 3);
        const page2 = await getCustomers.executePaginated(2, 3);

        expect(page1.data).toHaveLength(3);
        expect(page2.data).toHaveLength(2);
        expect(page1.pagination.hasNext).toBe(true);
        expect(page2.pagination.hasPrev).toBe(true);
    });
});

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

describe('UPDATE customer', () => {
    it('updates customer phone and email', async () => {
        const created = await createCustomer.execute({
            name: 'ACTUALIZAME',
            loyaltyPoints: 0,
            lastVisit: new Date(),
        } as any);

        const updated = await updateCustomer.execute(created.id, {
            phone: '0777777777',
            email: 'nuevo@test.com',
        });

        expect(updated).not.toBeNull();
        expect(updated!.phone).toBe('0777777777');
        expect(updated!.email).toBe('nuevo@test.com');
    });

    it('can add identification to a customer that previously had none', async () => {
        const created = await createCustomer.execute({
            name: 'SIN ID',
            loyaltyPoints: 0,
            lastVisit: new Date(),
        } as any);

        const updated = await updateCustomer.execute(created.id, {
            identification: '1800000001',
        });

        expect(updated!.identification).toBe('1800000001');
    });

    it('returns null when updating a non-existent customer', async () => {
        const result = await updateCustomer.execute(new mongoose.Types.ObjectId().toString(), { phone: '0000000000' });
        expect(result).toBeNull();
    });
});

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

describe('DELETE customer', () => {
    it('deletes a customer successfully', async () => {
        const created = await createCustomer.execute({
            name: 'ELIMINAR',
            loyaltyPoints: 0,
            lastVisit: new Date(),
        } as any);

        const deleted = await deleteCustomer.execute(created.id);
        expect(deleted).toBe(true);

        const all = await getCustomers.execute();
        expect(all).toHaveLength(0);
    });

    it('returns false when deleting a non-existent customer', async () => {
        const result = await deleteCustomer.execute(new mongoose.Types.ObjectId().toString());
        expect(result).toBe(false);
    });
});
