"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
(0, vitest_1.describe)('Order Entity', () => {
    (0, vitest_1.it)('should create an order instance', () => {
        const order = {
            id: '123',
            customerName: 'Test Customer',
            items: [],
            type: 'dine-inEn',
            status: 'pending',
            createdAt: new Date(),
            billed: false,
            orderNumber: '001'
        };
        (0, vitest_1.expect)(order).toBeDefined();
        (0, vitest_1.expect)(order.id).toBe('123');
        (0, vitest_1.expect)(order.items).toEqual([]);
    });
});
