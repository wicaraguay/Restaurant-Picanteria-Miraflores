/**
 * @file hrValidators.ts
 * @description Validadores específicos para el módulo de Recursos Humanos.
 */

import { validateCedula } from '../../billing/utils/fiscalValidators';

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Valida la identificación del empleado (Cédula)
 */
export const validateEmployeeId = (id: string): ValidationResult => {
    return validateCedula(id);
};

/**
 * Valida el nombre completo
 */
export const validateFullName = (name: string): ValidationResult => {
    if (!name || name.trim().length < 3) {
        return { isValid: false, error: 'El nombre debe tener al menos 3 caracteres' };
    }
    return { isValid: true };
};

/**
 * Valida el nombre de usuario
 */
export const validateUsername = (username: string): ValidationResult => {
    if (!username || username.trim().length < 4) {
        return { isValid: false, error: 'El usuario debe tener al menos 4 caracteres' };
    }
    if (/\s/.test(username)) {
        return { isValid: false, error: 'El usuario no puede contener espacios' };
    }
    return { isValid: true };
};

/**
 * Valida la contraseña (mínimo 6 caracteres)
 */
export const validatePassword = (password: string): ValidationResult => {
    if (!password || password.length < 6) {
        return { isValid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
    }
    return { isValid: true };
};

/**
 * Valida el teléfono
 */
export const validatePhone = (phone: string): ValidationResult => {
    if (phone && !/^\d{7,10}$/.test(phone)) {
        return { isValid: false, error: 'Teléfono debe tener entre 7 y 10 dígitos' };
    }
    return { isValid: true };
};
