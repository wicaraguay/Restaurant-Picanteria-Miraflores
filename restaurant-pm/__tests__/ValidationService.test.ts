/**
 * @file ValidationService.test.ts
 * @description Unit tests para ValidationService
 * 
 * @purpose
 * Verifica que todas las validaciones funcionen correctamente.
 * Prueba casos válidos e inválidos.
 * 
 * @layer Tests
 */

import { ValidationService } from '../src/services/ValidationService';

describe('ValidationService', () => {
    describe('validateEmail', () => {
        it('should validate correct emails', () => {
            const result = ValidationService.validateEmail('test@example.com');
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should reject invalid emails', () => {
            const result = ValidationService.validateEmail('invalid-email');
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should reject empty emails', () => {
            const result = ValidationService.validateEmail('');
            expect(result.isValid).toBe(false);
        });
    });

    describe('validatePhone', () => {
        it('should validate correct phone numbers', () => {
            const result = ValidationService.validatePhone('555-1234');
            expect(result.isValid).toBe(true);
        });

        it('should reject invalid phone numbers', () => {
            const result = ValidationService.validatePhone('abc');
            expect(result.isValid).toBe(false);
        });

        it('should reject too short phone numbers', () => {
            const result = ValidationService.validatePhone('123');
            expect(result.isValid).toBe(false);
        });
    });

    describe('validateRUC', () => {
        it('should validate 13-digit RUC', () => {
            const result = ValidationService.validateRUC('1234567890001');
            expect(result.isValid).toBe(true);
        });

        it('should reject RUC with wrong length', () => {
            const result = ValidationService.validateRUC('12345');
            expect(result.isValid).toBe(false);
        });

        it('should reject non-numeric RUC', () => {
            const result = ValidationService.validateRUC('12345678900ab');
            expect(result.isValid).toBe(false);
        });
    });

    describe('validatePrice', () => {
        it('should validate positive prices', () => {
            const result = ValidationService.validatePrice(10.50);
            expect(result.isValid).toBe(true);
        });

        it('should reject negative prices', () => {
            const result = ValidationService.validatePrice(-5);
            expect(result.isValid).toBe(false);
        });

        it('should reject extremely high prices', () => {
            const result = ValidationService.validatePrice(9999999);
            expect(result.isValid).toBe(false);
        });
    });

    describe('validateQuantity', () => {
        it('should validate positive integers', () => {
            const result = ValidationService.validateQuantity(5);
            expect(result.isValid).toBe(true);
        });

        it('should reject zero', () => {
            const result = ValidationService.validateQuantity(0);
            expect(result.isValid).toBe(false);
        });

        it('should reject negative numbers', () => {
            const result = ValidationService.validateQuantity(-1);
            expect(result.isValid).toBe(false);
        });

        it('should reject decimals', () => {
            const result = ValidationService.validateQuantity(5.5);
            expect(result.isValid).toBe(false);
        });
    });

    describe('validateName', () => {
        it('should validate normal names', () => {
            const result = ValidationService.validateName('John Doe');
            expect(result.isValid).toBe(true);
        });

        it('should reject empty names', () => {
            const result = ValidationService.validateName('');
            expect(result.isValid).toBe(false);
        });

        it('should reject too short names', () => {
            const result = ValidationService.validateName('A');
            expect(result.isValid).toBe(false);
        });

        it('should reject too long names', () => {
            const result = ValidationService.validateName('A'.repeat(101));
            expect(result.isValid).toBe(false);
        });
    });

    describe('validateUsername', () => {
        it('should validate correct usernames', () => {
            const result = ValidationService.validateUsername('user123');
            expect(result.isValid).toBe(true);
        });

        it('should reject too short usernames', () => {
            const result = ValidationService.validateUsername('ab');
            expect(result.isValid).toBe(false);
        });

        it('should reject usernames with special characters', () => {
            const result = ValidationService.validateUsername('user@123');
            expect(result.isValid).toBe(false);
        });
    });

    describe('validatePassword', () => {
        it('should validate passwords with minimum length', () => {
            const result = ValidationService.validatePassword('password123');
            expect(result.isValid).toBe(true);
        });

        it('should reject too short passwords', () => {
            const result = ValidationService.validatePassword('12345');
            expect(result.isValid).toBe(false);
        });
    });

    describe('validateMultiple', () => {
        it('should return first error when multiple validations fail', () => {
            const validations = [
                { isValid: true },
                { isValid: false, error: 'First error' },
                { isValid: false, error: 'Second error' }
            ];

            const result = ValidationService.validateMultiple(validations);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('First error');
        });

        it('should return valid when all validations pass', () => {
            const validations = [
                { isValid: true },
                { isValid: true },
                { isValid: true }
            ];

            const result = ValidationService.validateMultiple(validations);
            expect(result.isValid).toBe(true);
        });
    });
});
