import { describe, it, expect } from 'vitest';
import { BillingService } from '../../../src/application/services/BillingService';

describe('BillingService - Mixed IVA Calculations (0% Food and 15% Drinks)', () => {
    const billingService = new BillingService();

    it('should correctly calculate details when food is 0% IVA and drink is 15% IVA (total-driven)', () => {
        // Simulating a real order item mapping where food (Ceviche) is $10.00 (0% IVA) 
        // and drink (Coca Cola) is $2.00 (15% IVA)
        const orderItems = [
            {
                id: '1',
                name: 'Ceviche',
                price: 10.00,
                quantity: 1,
                taxRate: 0,
                total: 10.00 // Total driven (inclusive)
            },
            {
                id: '2',
                name: 'Coca Cola',
                price: 2.00,
                quantity: 1,
                taxRate: 15,
                total: 2.00 // Total driven (inclusive)
            }
        ];

        const details = billingService.calculateDetails(orderItems);

        // --- VERIFICATIONS FOR CEVICHE (0% IVA) ---
        const cevicheDetail = details.find(d => d.descripcion === 'Ceviche')!;
        expect(cevicheDetail).toBeDefined();
        expect(cevicheDetail.precioTotalSinImpuesto).toBe(10.00); // 0% IVA means subtotal = total = $10.00
        expect(cevicheDetail.impuestos[0].tarifa).toBe(0);
        expect(cevicheDetail.impuestos[0].baseImponible).toBe(10.00);
        expect(cevicheDetail.impuestos[0].valor).toBe(0.00); // No tax value

        // --- VERIFICATIONS FOR COCA COLA (15% IVA) ---
        const cocaColaDetail = details.find(d => d.descripcion === 'Coca Cola')!;
        expect(cocaColaDetail).toBeDefined();
        // $2.00 / 1.15 = $1.73913 -> rounded to 2 decimals = $1.74
        expect(cocaColaDetail.precioTotalSinImpuesto).toBe(1.74); 
        expect(cocaColaDetail.impuestos[0].tarifa).toBe(15);
        expect(cocaColaDetail.impuestos[0].baseImponible).toBe(1.74);
        // $2.00 - $1.74 = $0.26 tax value
        expect(cocaColaDetail.impuestos[0].valor).toBe(0.26);

        // --- OVERALL TOTALS CHECK ---
        const totalSubtotal = details.reduce((sum, d) => sum + d.precioTotalSinImpuesto, 0);
        const totalTax = details.reduce((sum, d) => sum + d.impuestos[0].valor, 0);
        const totalPaid = parseFloat((totalSubtotal + totalTax).toFixed(2));

        expect(totalSubtotal).toBe(11.74); // $10.00 + $1.74
        expect(totalTax).toBe(0.26);      // $0.00 + $0.26
        expect(totalPaid).toBe(12.00);     // Total is exactly $12.00 (Customer pays $12.00)
    });

    it('should correctly calculate details when food is 0% IVA and drink is 15% IVA (price-driven)', () => {
        // Price-driven fallback (where price is exclusive of tax)
        const orderItems = [
            {
                id: '1',
                name: 'Ceviche',
                price: 10.00,
                quantity: 1,
                taxRate: 0
            },
            {
                id: '2',
                name: 'Coca Cola',
                price: 2.00,
                quantity: 1,
                taxRate: 15
            }
        ];

        const details = billingService.calculateDetails(orderItems);

        // Ceviche (0%): price is 10.00, subtotal 10.00, tax 0
        const cevicheDetail = details.find(d => d.descripcion === 'Ceviche')!;
        expect(cevicheDetail.precioTotalSinImpuesto).toBe(10.00);
        expect(cevicheDetail.impuestos[0].valor).toBe(0.00);

        // Coca Cola (15%): price is 2.00, subtotal 2.00, tax is 2.00 * 0.15 = 0.30
        const cocaColaDetail = details.find(d => d.descripcion === 'Coca Cola')!;
        expect(cocaColaDetail.precioTotalSinImpuesto).toBe(2.00);
        expect(cocaColaDetail.impuestos[0].valor).toBe(0.30);

        const totalSubtotal = details.reduce((sum, d) => sum + d.precioTotalSinImpuesto, 0);
        const totalTax = details.reduce((sum, d) => sum + d.impuestos[0].valor, 0);
        const totalPaid = parseFloat((totalSubtotal + totalTax).toFixed(2));

        expect(totalSubtotal).toBe(12.00); // 10.00 + 2.00
        expect(totalTax).toBe(0.30);      // 0.00 + 0.30
        expect(totalPaid).toBe(12.30);     // Exclusive total = $12.30
    });

    it('should fall back to 15% global tax rate when item taxRate is undefined', () => {
        const orderItems = [
            {
                id: '1',
                name: 'Default Item',
                price: 10.00,
                quantity: 1,
                total: 10.00
            }
        ];

        const details = billingService.calculateDetails(orderItems);
        const detail = details[0];

        // Should default to 15% IVA
        expect(detail.impuestos[0].tarifa).toBe(15);
        expect(detail.precioTotalSinImpuesto).toBe(8.70); // 10 / 1.15
        expect(detail.impuestos[0].valor).toBe(1.30);
    });
});
