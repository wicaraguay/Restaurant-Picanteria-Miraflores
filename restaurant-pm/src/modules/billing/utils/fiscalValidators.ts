/**
 * @file fiscalValidators.ts
 * @description Validadores para identificación fiscal (Ecuador)
 */

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Valida RUC (Ecuador)
 */
export const validateRUC = (ruc: string): ValidationResult => {
    if (!ruc) {
        return { isValid: false, error: 'El RUC es requerido' };
    }

    // RUC debe tener 13 dígitos
    if (!/^\d{13}$/.test(ruc)) {
        return { isValid: false, error: 'RUC debe tener 13 dígitos' };
    }

    return { isValid: true };
};

/**
 * Valida Cédula (Ecuador)
 */
export const validateCedula = (cedula: string): ValidationResult => {
    if (!cedula) {
        return { isValid: false, error: 'La cédula es requerida' };
    }

    // Cédula debe tener 10 dígitos
    if (!/^\d{10}$/.test(cedula)) {
        return { isValid: false, error: 'Cédula debe tener 10 dígitos' };
    }

    return { isValid: true };
};
