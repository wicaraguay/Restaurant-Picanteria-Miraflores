/**
 * Tests Unitarios e Integración — Cálculo de IVA Inclusivo en Comprobantes
 *
 * BUG REPORTADO:
 *   "El total es $21.98. En el correo/RIDE/ticket aparece $21.98 + $3.30 IVA = $25.28"
 *
 * CAUSA RAÍZ:
 *   El frontend enviaba order.items SIN el campo `item.total`.
 *   BillingService.calculateDetails() tiene dos modos:
 *     • "total-driven": item.total definido → trata total como precio con IVA incluido ✅
 *     • "price-driven": sin item.total   → trata item.price como base SIN IVA y suma IVA encima ❌
 *
 * CORRECCIÓN:
 *   OrderManagement.tsx ahora mapea los items antes de enviar al backend,
 *   añadiendo: total = price * quantity (precio con IVA ya incluido).
 *
 * REGLA DE NEGOCIO CENTRAL:
 *   Precios en el sistema = precios de venta al público CON IVA incluido.
 *   El IVA debe extraerse del total, NUNCA sumarse encima del total.
 *
 *   ✅ CORRECTO:   total(con IVA) → subtotal = total/1.15 → IVA = total - subtotal → VALOR TOTAL = total
 *   ❌ INCORRECTO: total → IVA = total * 0.15 → VALOR TOTAL = total + IVA
 */

import { describe, it, expect } from 'vitest';

// --------------------------------------------------------------------------
// Réplica exacta de BillingService.calculateDetails() para testing sin deps
// --------------------------------------------------------------------------
function calculateDetails(
    items: Array<{ name: string; price: number; quantity: number; total?: number }>,
    taxRate: number = 15
) {
    const rateDecimal = taxRate / 100;
    const details = items.map((item) => {
        const qty = item.quantity || 1;
        let subtotalRounded: number, taxValueRounded: number, totalInclusive: number;

        if (item.total !== undefined && item.total !== null) {
            // ✅ MODO TOTAL-DRIVEN: total ya tiene IVA incluido
            totalInclusive = item.total;
            const rawSubtotal = totalInclusive / (1 + rateDecimal);
            subtotalRounded = parseFloat(rawSubtotal.toFixed(2));
            taxValueRounded = parseFloat((totalInclusive - subtotalRounded).toFixed(2));
        } else {
            // ❌ MODO PRICE-DRIVEN: asume price es base SIN IVA → agrega IVA encima
            const rawSubtotal = (item.price || 0) * qty;
            subtotalRounded = parseFloat(rawSubtotal.toFixed(2));
            taxValueRounded = parseFloat((subtotalRounded * rateDecimal).toFixed(2));
            totalInclusive = subtotalRounded + taxValueRounded;
        }

        return { subtotalRounded, taxValueRounded, totalInclusive };
    });

    const totalSinImpuestos = parseFloat(details.reduce((s, d) => s + d.subtotalRounded, 0).toFixed(2));
    const totalImpuestos = parseFloat(details.reduce((s, d) => s + d.taxValueRounded, 0).toFixed(2));
    const importeTotal = parseFloat((totalSinImpuestos + totalImpuestos).toFixed(2));

    return { details, totalSinImpuestos, totalImpuestos, importeTotal };
}

// Réplica del mapeo corregido de OrderManagement.tsx
function mapItemsConTotal(items: Array<{ name: string; price: number; quantity: number }>) {
    return items.map(item => ({
        ...item,
        total: parseFloat(((item.price || 0) * item.quantity).toFixed(2)),
    }));
}

// ==========================================================================
// 1. EL BUG EXACTO — $21.98 se convierte en $25.28
// ==========================================================================
describe('🐛 Bug Reportado — $21.98 convertido en $25.28', () => {

    it('❌ ANTES del fix (sin item.total): modo price-driven SUMA IVA encima → $25.28', () => {
        const itemsSinTotal = [
            { name: 'Cuuy asado', price: 14.00, quantity: 1 },
            { name: 'Arroz relleno', price: 7.98, quantity: 1 },
        ];
        // El cliente pagó: 14 + 7.98 = $21.98

        const result = calculateDetails(itemsSinTotal, 15);

        // ❌ Sin item.total, el backend trata $21.98 como base SIN IVA
        // → suma 15% encima → da $25.28 (incorrecto, se cobra $3.30 de más)
        expect(result.importeTotal).toBe(25.28);
        expect(result.totalImpuestos).toBeCloseTo(3.30, 1);
    });

    it('✅ DESPUÉS del fix (con item.total): modo total-driven EXTRAE IVA → $21.98', () => {
        const itemsSinTotal = [
            { name: 'Cuuy asado', price: 14.00, quantity: 1 },
            { name: 'Arroz relleno', price: 7.98, quantity: 1 },
        ];
        const itemsConTotal = mapItemsConTotal(itemsSinTotal);

        const result = calculateDetails(itemsConTotal, 15);

        // ✅ VALOR TOTAL = $21.98 (lo que el cliente ya pagó, sin cobrar extra)
        expect(result.importeTotal).toBe(21.98);
        // El subtotal se extrae DESDE el total (no se suma nada)
        expect(result.totalSinImpuestos).toBeCloseTo(21.98 / 1.15, 1);
        // IVA = total - subtotal (extraído, no añadido)
        expect(result.totalImpuestos).toBeCloseTo(21.98 - (21.98 / 1.15), 1);
        // INVARIANTE CRÍTICA: subtotal + IVA = total
        expect(parseFloat((result.totalSinImpuestos + result.totalImpuestos).toFixed(2))).toBe(21.98);
    });

    it('Diferencia exacta del bug: $3.30 que se cobraba de más', () => {
        const items = [
            { name: 'Cuuy asado', price: 14.00, quantity: 1 },
            { name: 'Arroz relleno', price: 7.98, quantity: 1 },
        ];

        const bugResult = calculateDetails(items, 15);
        const fixResult = calculateDetails(mapItemsConTotal(items), 15);

        const diferencia = parseFloat((bugResult.importeTotal - fixResult.importeTotal).toFixed(2));

        expect(diferencia).toBeCloseTo(3.30, 1); // $3.30 de IVA duplicado
        expect(fixResult.importeTotal).toBe(21.98);
        expect(bugResult.importeTotal).toBe(25.28);
    });
});

// ==========================================================================
// 2. FUNCIÓN mapItemsConTotal — verifica el fix del frontend
// ==========================================================================
describe('🔧 mapItemsConTotal — corrección en OrderManagement.tsx', () => {

    it('añade total = price × quantity para cada item', () => {
        const items = [
            { name: 'Cuy', price: 14.00, quantity: 1 },
            { name: 'Arroz', price: 2.50, quantity: 2 },
        ];
        const mapped = mapItemsConTotal(items);

        expect(mapped[0].total).toBe(14.00);
        expect(mapped[1].total).toBe(5.00);
    });

    it('preserva todos los campos originales del item', () => {
        const items = [{ name: 'Producto', price: 9.99, quantity: 3 }];
        const mapped = mapItemsConTotal(items);

        expect(mapped[0].name).toBe('Producto');
        expect(mapped[0].price).toBe(9.99);
        expect(mapped[0].quantity).toBe(3);
        expect(mapped[0].total).toBe(29.97);
    });

    it('con items mapeados, importeTotal == sum(price × qty) [no se suma IVA extra]', () => {
        const items = [
            { name: 'A', price: 5.00, quantity: 2 },  // 10.00
            { name: 'B', price: 3.50, quantity: 1 },  // 3.50
        ];
        const mapped = mapItemsConTotal(items);
        const result = calculateDetails(mapped, 15);

        // VALOR TOTAL debe ser exactamente la suma de precios (con IVA incluido)
        expect(result.importeTotal).toBe(13.50);
        // NO debe ser 13.50 * 1.15 = 15.53
        expect(result.importeTotal).not.toBe(15.53);
    });
});

// ==========================================================================
// 3. INVARIANTES MATEMÁTICAS (con el fix aplicado)
// ==========================================================================
describe('📐 Invariantes — precios inclusivos correctamente mapeados', () => {

    const casos = [
        { label: '$21.98 (caso reportado)',   items: [{ name: 'Combo', price: 21.98, quantity: 1 }] },
        { label: 'Cuuy $14 + Arroz $2.50',   items: [{ name: 'Cuuy', price: 14.00, quantity: 1 }, { name: 'Arroz', price: 2.50, quantity: 1 }] },
        { label: '4 platos $9.50 c/u',        items: [{ name: 'Plato', price: 9.50, quantity: 4 }] },
        { label: 'Mixtos $5.25×2 + $12.75',  items: [{ name: 'A', price: 5.25, quantity: 2 }, { name: 'B', price: 12.75, quantity: 1 }] },
    ];

    casos.forEach(({ label, items }) => {
        it(`[${label}] VALOR TOTAL == sum(price × qty)`, () => {
            const mapped = mapItemsConTotal(items);
            const result = calculateDetails(mapped, 15);
            const sumTotal = parseFloat(items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2));
            expect(result.importeTotal).toBeCloseTo(sumTotal, 2);
        });

        it(`[${label}] subtotal + IVA == VALOR TOTAL`, () => {
            const mapped = mapItemsConTotal(items);
            const result = calculateDetails(mapped, 15);
            const suma = parseFloat((result.totalSinImpuestos + result.totalImpuestos).toFixed(2));
            expect(suma).toBe(result.importeTotal);
        });

        it(`[${label}] subtotal < VALOR TOTAL (IVA extraído, no sumado)`, () => {
            const mapped = mapItemsConTotal(items);
            const result = calculateDetails(mapped, 15);
            expect(result.totalSinImpuestos).toBeLessThan(result.importeTotal);
            expect(result.totalImpuestos).toBeGreaterThan(0);
        });
    });
});

// ==========================================================================
// 4. CASOS ESPECIALES
// ==========================================================================
describe('🔍 Casos especiales', () => {

    it('IVA 0%: total == subtotal, IVA == 0, nada se agrega', () => {
        const items = mapItemsConTotal([{ name: 'Comida', price: 16.98, quantity: 1 }]);
        const result = calculateDetails(items, 0);
        expect(result.importeTotal).toBe(16.98);
        expect(result.totalSinImpuestos).toBe(16.98);
        expect(result.totalImpuestos).toBe(0);
    });

    it('$16.98 con IVA 15%: subtotal=$14.77, IVA=$2.21, total=$16.98', () => {
        const items = mapItemsConTotal([{ name: 'Plato', price: 16.98, quantity: 1 }]);
        const result = calculateDetails(items, 15);
        expect(result.totalSinImpuestos).toBe(14.77);
        expect(result.totalImpuestos).toBe(2.21);
        expect(result.importeTotal).toBe(16.98);
    });

    it('cantidad > 1: el total del item = price × qty (IVA se extrae del total completo)', () => {
        // 3 × $7.00 = $21.00 (con IVA) → subtotal = $21.00/1.15 ≈ $18.26
        const items = mapItemsConTotal([{ name: 'Plato', price: 7.00, quantity: 3 }]);
        const result = calculateDetails(items, 15);
        expect(result.importeTotal).toBe(21.00);
        expect(result.totalSinImpuestos).toBeCloseTo(21.00 / 1.15, 1);
        // No debe ser 7 * 3 * 1.15 = 24.15
        expect(result.importeTotal).not.toBe(24.15);
    });

    it('cambio de tasa IVA al 12%: sigue siendo total-driven', () => {
        const items = mapItemsConTotal([{ name: 'Producto', price: 22.40, quantity: 1 }]);
        const result = calculateDetails(items, 12); // 22.40 = 20 * 1.12
        expect(result.importeTotal).toBe(22.40);
        expect(result.totalSinImpuestos).toBeCloseTo(20.00, 1);
        expect(result.totalImpuestos).toBeCloseTo(2.40, 1);
    });
});
