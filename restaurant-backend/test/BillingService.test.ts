
import { describe, it, expect } from 'vitest';
import { BillingService } from '../src/application/services/BillingService';
import { ValidationError } from '../src/domain/errors/CustomErrors';

describe('BillingService', () => {
    const billingService = new BillingService();

    describe('calculateDetails', () => {
        it('should calculate taxes and totals correctly for a single item (15% VAT)', () => {
            const items = [
                {
                    name: 'Arroz con Pollo',
                    quantity: 2,
                    price: 10.00
                }
            ];
            const taxRate = 15;

            const result = billingService.calculateDetails(items, taxRate);

            expect(result).toHaveLength(1);
            expect(result[0].precioTotalSinImpuesto).toBe(20.00);
            expect(result[0].impuestos[0].valor).toBe(3.00);
            expect(result[0].impuestos[0].baseImponible).toBe(20.00);
            expect(result[0].impuestos[0].codigoPorcentaje).toBe('4'); 
            expect(result[0].precioUnitario).toBe(10.00);
        });

        it('should calculate correctly when total (inclusive) is provided', () => {
            const items = [
                { name: 'Item 1', quantity: 1, total: 11.50 }
            ];
            const taxRate = 15;

            const result = billingService.calculateDetails(items, taxRate);

            expect(result[0].precioTotalSinImpuesto).toBe(10.00);
            expect(result[0].impuestos[0].valor).toBe(1.50);
            expect(result[0].precioUnitario).toBe(10.00);
        });

        it('should handle multiple items correctly', () => {
            const items = [
                { name: 'Item 1', quantity: 1, price: 10.00 },
                { name: 'Item 2', quantity: 1, price: 5.00 }
            ];
            const taxRate = 12;

            const result = billingService.calculateDetails(items, taxRate);

            expect(result).toHaveLength(2);
            expect(result[0].precioTotalSinImpuesto).toBe(10.00);
            expect(result[1].precioTotalSinImpuesto).toBe(5.00);
            expect(result[0].impuestos[0].valor).toBe(1.20);
            expect(result[1].impuestos[0].valor).toBe(0.60);
        });

        it('should round to 2 decimal places', () => {
            const items = [
                { name: 'Item 1', quantity: 1, price: 10.556 }
            ];
            const taxRate = 15;

            const result = billingService.calculateDetails(items, taxRate);

            expect(result[0].precioTotalSinImpuesto).toBe(10.56);
        });
    });

    describe('getTaxCode', () => {
        it('should return correct codes for various rates', () => {
            expect(billingService.getTaxCode(15)).toBe('4');
            expect(billingService.getTaxCode(12)).toBe('2');
            expect(billingService.getTaxCode(10)).toBe('3');
            expect(billingService.getTaxCode(5)).toBe('5');
            expect(billingService.getTaxCode(0)).toBe('0');
        });
    });

    describe('validateEmail', () => {
        it('should not throw for valid emails', () => {
            expect(() => billingService.validateEmail('test@example.com')).not.toThrow();
            expect(() => billingService.validateEmail('user.name+tag@domain.co.uk')).not.toThrow();
        });

        it('should throw ValidationError for invalid emails', () => {
            expect(() => billingService.validateEmail('invalid-email')).toThrow(ValidationError);
            expect(() => billingService.validateEmail('@domain.com')).toThrow(ValidationError);
        });
    });

    describe('getIdentificacionType', () => {
        it('should return 04 for RUC (13 digits)', () => {
            expect(billingService.getIdentificacionType('1790011001001')).toBe('04');
        });

        it('should return 05 for Cédula (10 digits)', () => {
            expect(billingService.getIdentificacionType('1712345678')).toBe('05');
        });

        it('should return 07 for Consumidor Final', () => {
            expect(billingService.getIdentificacionType('9999999999999')).toBe('07');
        });
    });

    describe('formatDateToSRI', () => {
        it('should format date as DD/MM/YYYY', () => {
            const date = new Date(2023, 11, 25); // Dec 25, 2023
            expect(billingService.formatDateToSRI(date)).toBe('25/12/2023');
        });
    });

    describe('getCurrentDateEcuador', () => {
        it('should return current date in SRI format', () => {
            const result = billingService.getCurrentDateEcuador();
            expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        });
    });

    describe('parseSRIDate', () => {
        it('should parse ISO strings', () => {
            const iso = '2023-12-25T10:00:00Z';
            const result = billingService.parseSRIDate(iso);
            expect(result.getFullYear()).toBe(2023);
            expect(result.getMonth()).toBe(11);
            expect(result.getDate()).toBe(25);
        });

        it('should parse DD/MM/YYYY strings', () => {
            const str = '25/12/2023';
            const result = billingService.parseSRIDate(str);
            expect(result.getFullYear()).toBe(2023);
            expect(result.getMonth()).toBe(11);
            expect(result.getDate()).toBe(25);
        });
    });

    describe('validateRealTimeTransmission', () => {
        it('should not throw if the date is today in Ecuador', () => {
            const todayStr = billingService.getCurrentDateEcuador();
            expect(() => billingService.validateRealTimeTransmission(todayStr)).not.toThrow();
        });

        it('should throw Error if the date is NOT today in Ecuador', () => {
            expect(() => billingService.validateRealTimeTransmission('01/01/2000')).toThrow(/Transmisión NO en tiempo real/);
        });
    });
});
