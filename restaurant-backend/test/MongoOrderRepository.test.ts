
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as dbHandler from './helpers/db-handler';
import { MongoOrderRepository } from '../src/infrastructure/repositories/MongoOrderRepository';
import { Order, OrderStatus } from '../src/domain/entities/Order';

describe('MongoOrderRepository Integration Tests', () => {
    const repository = new MongoOrderRepository();

    beforeAll(async () => await dbHandler.connect());
    afterAll(async () => await dbHandler.closeDatabase());
    beforeEach(async () => await dbHandler.clearDatabase());

    it('should create and find an order', async () => {
        const orderData: any = {
            customerName: 'Juan Pérez',
            items: [{ name: 'Parillada', quantity: 1, price: 25.00 }],
            type: 'En Local',
            status: OrderStatus.Completed,
            billed: false,
            orderNumber: '001-001-000000001',
            createdAt: new Date()
        };

        const created = await repository.create(orderData);
        expect(created.id).toBeDefined();
        expect(created.customerName).toBe('Juan Pérez');

        const found = await repository.findById(created.id!);
        expect(found).not.toBeNull();
        expect(found?.customerName).toBe('Juan Pérez');
    });

    it('should return paginated results', async () => {
        // Create 3 orders
        for (let i = 1; i <= 3; i++) {
            await repository.create({
                customerName: `Customer ${i}`,
                items: [{ name: 'Item', quantity: 1, price: 10 }],
                type: 'En Local',
                status: OrderStatus.New,
                billed: false,
                orderNumber: `00${i}`,
                createdAt: new Date()
            } as any);
        }

        const result = await repository.findPaginated(1, 2);
        expect(result.data).toHaveLength(2);
        expect(result.pagination.total).toBe(3);
        expect(result.pagination.totalPages).toBe(2);
    });

    it('should calculate dashboard stats correctly', async () => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);

        // Order 1: $30
        await repository.create({
            customerName: 'Client A',
            items: [
                { name: 'Pizza', quantity: 2, price: 10.00 }, // $20
                { name: 'Cerveza', quantity: 2, price: 5.00 }   // $10
            ],
            type: 'En Local',
            status: OrderStatus.Completed,
            billed: true,
            orderNumber: 'A1',
            createdAt: today
        } as any);

        // Order 2: $15
        await repository.create({
            customerName: 'Client B',
            items: [
                { name: 'Pizza', quantity: 1, price: 10.00 }, // $10
                { name: 'Soda', quantity: 1, price: 5.00 }    // $5
            ],
            type: 'Para Llevar',
            status: OrderStatus.New,
            billed: false,
            orderNumber: 'B1',
            createdAt: today
        } as any);

        const start = new Date(today);
        start.setHours(0, 0, 0, 0);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);

        const stats = await repository.getDashboardStats(start, end);

        expect(stats.totalOrders).toBe(2);
        expect(stats.totalRevenue).toBe(45.00);
        expect(stats.averageTicket).toBe(22.50);
        
        // Orders by status
        const completado = stats.ordersByStatus.find(s => s.status === OrderStatus.Completed);
        const nuevo = stats.ordersByStatus.find(s => s.status === OrderStatus.New);
        expect(completado?.count).toBe(1);
        expect(nuevo?.count).toBe(1);

        // Top selling items
        const pizza = stats.topSellingItems.find(i => i.name === 'Pizza');
        expect(pizza?.quantity).toBe(3);

        // Sales by category (Order Type in our implementation)
        const local = stats.salesByCategory.find(c => c.category === 'En Local');
        expect(local?.total).toBe(30.00);
    });
});
