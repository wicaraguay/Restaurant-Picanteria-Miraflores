/**
 * Tests del Reporte Mensual para Declaración (Formulario 104).
 *
 * Regresión clave: monthKeyEcuador devolvía '2026-7' (mes SIN cero) porque
 * Intl ignora 'month: 2-digit' cuando solo se piden año+mes — el filtro
 * comparaba contra '2026-07' y el reporte salía SIEMPRE en cero aunque
 * existieran facturas autorizadas del mes.
 */
import { describe, it, expect } from 'vitest';
import { monthKeyEcuador, computeBreakdown } from '../../src/interfaces/http/controllers/ExportController';

describe('monthKeyEcuador', () => {
    it('REGRESIÓN: debe devolver el mes con cero inicial (2026-07, no 2026-7)', () => {
        // La primera factura real del negocio: 2026-07-05 02:31 UTC = 4 jul 21:31 Ecuador
        expect(monthKeyEcuador('2026-07-05T02:31:12.202Z')).toBe('2026-07');
    });

    it('debe asignar el mes según la hora de Ecuador, no UTC', () => {
        // 1 de agosto 02:00 UTC = 31 de JULIO 21:00 en Ecuador → pertenece a julio
        expect(monthKeyEcuador('2026-08-01T02:00:00.000Z')).toBe('2026-07');
    });

    it('debe mantener el mes cuando la hora no cruza el día en Ecuador', () => {
        expect(monthKeyEcuador('2026-07-15T14:00:00.000Z')).toBe('2026-07');
    });

    it('debe devolver vacío para fechas inválidas', () => {
        expect(monthKeyEcuador('no-es-fecha')).toBe('');
    });
});

describe('computeBreakdown', () => {
    it('debe separar bases por tarifa de IVA (precios incluyen IVA)', () => {
        const items = [
            { name: 'Sancocho', quantity: 1, total: 1.50, taxRate: 0 },
            { name: 'Cerveza', quantity: 1, total: 3.00, taxRate: 15 }
        ];
        const bd = computeBreakdown(items);
        expect(bd.base0).toBe(1.50);
        expect(bd.base15).toBe(2.61);  // 3.00 / 1.15
        expect(bd.iva).toBe(0.39);     // 3.00 - 2.61
        expect(bd.total).toBe(4.50);
    });

    it('debe asumir 15% cuando el ítem no trae taxRate', () => {
        const bd = computeBreakdown([{ name: 'X', quantity: 1, total: 11.50 }]);
        expect(bd.base15).toBe(10.00);
        expect(bd.iva).toBe(1.50);
    });

    it('debe calcular el total desde precio x cantidad si falta total', () => {
        const bd = computeBreakdown([{ name: 'X', quantity: 2, price: 1.00, taxRate: 0 }]);
        expect(bd.base0).toBe(2.00);
    });

    it('debe devolver ceros con lista vacía', () => {
        const bd = computeBreakdown([]);
        expect(bd).toEqual({ base0: 0, base15: 0, iva: 0, total: 0 });
    });
});
