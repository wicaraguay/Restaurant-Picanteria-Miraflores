/**
 * @file ValidationService.ts
 * @description Servicio de validación centralizado
 * 
 * @purpose
 * Centraliza todas las validaciones de la aplicación.
 * Proporciona validadores reutilizables y consistentes.
 * Facilita mantenimiento y testing de validaciones.
 * 
 * @connections
 * - Usado por: Formularios en componentes
 * - Usado por: Services (para validar antes de API calls)
 * 
 * @layer Services - Utility Service
 */

/**
 * Resultado de validación
 */
export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * ValidationService - Validaciones centralizadas
 */
export class ValidationService {
    /**
     * Valida email
     */
    static validateEmail(email: string): ValidationResult {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            return { isValid: false, error: 'El email es requerido' };
        }

        if (!emailRegex.test(email)) {
            return { isValid: false, error: 'Email inválido' };
        }

        return { isValid: true };
    }

    /**
     * Valida teléfono
     */
    static validatePhone(phone: string): ValidationResult {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;

        if (!phone) {
            return { isValid: false, error: 'El teléfono es requerido' };
        }

        if (!phoneRegex.test(phone)) {
            return { isValid: false, error: 'Teléfono inválido' };
        }

        if (phone.replace(/\D/g, '').length < 7) {
            return { isValid: false, error: 'Teléfono muy corto' };
        }

        return { isValid: true };
    }

    /**
     * Valida RUC (Ecuador)
     */
    static validateRUC(ruc: string): ValidationResult {
        if (!ruc) {
            return { isValid: false, error: 'El RUC es requerido' };
        }

        // RUC debe tener 13 dígitos
        if (!/^\d{13}$/.test(ruc)) {
            return { isValid: false, error: 'RUC debe tener 13 dígitos' };
        }

        return { isValid: true };
    }

    /**
     * Valida Cédula (Ecuador)
     */
    static validateCedula(cedula: string): ValidationResult {
        if (!cedula) {
            return { isValid: false, error: 'La cédula es requerida' };
        }

        // Cédula debe tener 10 dígitos
        if (!/^\d{10}$/.test(cedula)) {
            return { isValid: false, error: 'Cédula debe tener 10 dígitos' };
        }

        return { isValid: true };
    }

    /**
     * Valida precio
     */
    static validatePrice(price: number): ValidationResult {
        if (price === undefined || price === null) {
            return { isValid: false, error: 'El precio es requerido' };
        }

        if (price < 0) {
            return { isValid: false, error: 'El precio no puede ser negativo' };
        }

        if (price > 999999) {
            return { isValid: false, error: 'Precio demasiado alto' };
        }

        return { isValid: true };
    }

    /**
     * Valida cantidad
     */
    static validateQuantity(quantity: number): ValidationResult {
        if (quantity === undefined || quantity === null) {
            return { isValid: false, error: 'La cantidad es requerida' };
        }

        if (!Number.isInteger(quantity)) {
            return { isValid: false, error: 'La cantidad debe ser un número entero' };
        }

        if (quantity <= 0) {
            return { isValid: false, error: 'La cantidad debe ser mayor a 0' };
        }

        if (quantity > 1000) {
            return { isValid: false, error: 'Cantidad demasiado alta' };
        }

        return { isValid: true };
    }

    /**
     * Valida nombre (no vacío, longitud razonable)
     */
    static validateName(name: string, fieldName: string = 'nombre'): ValidationResult {
        if (!name || name.trim().length === 0) {
            return { isValid: false, error: `El ${fieldName} es requerido` };
        }

        if (name.length < 2) {
            return { isValid: false, error: `El ${fieldName} es demasiado corto` };
        }

        if (name.length > 100) {
            return { isValid: false, error: `El ${fieldName} es demasiado largo` };
        }

        return { isValid: true };
    }

    /**
     * Valida username
     */
    static validateUsername(username: string): ValidationResult {
        if (!username) {
            return { isValid: false, error: 'El usuario es requerido' };
        }

        if (username.length < 3) {
            return { isValid: false, error: 'El usuario debe tener al menos 3 caracteres' };
        }

        if (username.length > 20) {
            return { isValid: false, error: 'El usuario no puede tener más de 20 caracteres' };
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { isValid: false, error: 'El usuario solo puede contener letras, números y guión bajo' };
        }

        return { isValid: true };
    }

    /**
     * Valida password
     */
    static validatePassword(password: string): ValidationResult {
        if (!password) {
            return { isValid: false, error: 'La contraseña es requerida' };
        }

        if (password.length < 6) {
            return { isValid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
        }

        return { isValid: true };
    }

    /**
     * Valida campo requerido genérico
     */
    static validateRequired(value: any, fieldName: string): ValidationResult {
        if (value === undefined || value === null || value === '') {
            return { isValid: false, error: `${fieldName} es requerido` };
        }

        return { isValid: true };
    }

    /**
     * Valida múltiples campos y retorna el primer error
     */
    static validateMultiple(validations: ValidationResult[]): ValidationResult {
        for (const validation of validations) {
            if (!validation.isValid) {
                return validation;
            }
        }

        return { isValid: true };
    }
}
