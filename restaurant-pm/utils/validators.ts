/**
 * Validadores Reutilizables
 * 
 * Funciones de validación para formularios y datos.
 * Incluye validadores específicos para Ecuador (RUC, CI).
 * Retorna mensajes de error en español.
 */

/**
 * Resultado de una validación
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Clase con validadores reutilizables
 */
export class Validators {
    /**
     * Valida un email
     */
    static email(value: string): ValidationResult {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!value) {
            return { valid: false, error: 'El email es requerido' };
        }

        if (!emailRegex.test(value)) {
            return { valid: false, error: 'Email inválido' };
        }

        return { valid: true };
    }

    /**
     * Valida un teléfono (formato Ecuador)
     */
    static phone(value: string): ValidationResult {
        // Acepta formatos: 0991234567, +593991234567, 02-1234567
        const phoneRegex = /^(\+593|0)[0-9]{9,10}$/;
        const cleanPhone = value.replace(/[\s-]/g, '');

        if (!value) {
            return { valid: false, error: 'El teléfono es requerido' };
        }

        if (!phoneRegex.test(cleanPhone)) {
            return { valid: false, error: 'Teléfono inválido. Formato: 0991234567 o +593991234567' };
        }

        return { valid: true };
    }

    /**
     * Valida una Cédula de Identidad ecuatoriana
     */
    static cedula(value: string): ValidationResult {
        if (!value) {
            return { valid: false, error: 'La cédula es requerida' };
        }

        if (value.length !== 10) {
            return { valid: false, error: 'La cédula debe tener 10 dígitos' };
        }

        if (!/^\d+$/.test(value)) {
            return { valid: false, error: 'La cédula solo debe contener números' };
        }

        // Validar provincia (primeros 2 dígitos)
        const provincia = parseInt(value.substring(0, 2));
        if (provincia < 1 || provincia > 24) {
            return { valid: false, error: 'Código de provincia inválido' };
        }

        // Algoritmo de validación de cédula ecuatoriana
        const digitos = value.split('').map(Number);
        const digitoVerificador = digitos[9];

        let suma = 0;
        for (let i = 0; i < 9; i++) {
            let valor = digitos[i];
            if (i % 2 === 0) {
                valor *= 2;
                if (valor > 9) valor -= 9;
            }
            suma += valor;
        }

        const resultado = suma % 10 === 0 ? 0 : 10 - (suma % 10);

        if (resultado !== digitoVerificador) {
            return { valid: false, error: 'Cédula inválida' };
        }

        return { valid: true };
    }

    /**
     * Valida un RUC ecuatoriano
     */
    static ruc(value: string): ValidationResult {
        if (!value) {
            return { valid: false, error: 'El RUC es requerido' };
        }

        if (value.length !== 13) {
            return { valid: false, error: 'El RUC debe tener 13 dígitos' };
        }

        if (!/^\d+$/.test(value)) {
            return { valid: false, error: 'El RUC solo debe contener números' };
        }

        // Los primeros 10 dígitos deben ser una cédula válida
        const cedula = value.substring(0, 10);
        const cedulaValidation = this.cedula(cedula);

        if (!cedulaValidation.valid) {
            return { valid: false, error: 'RUC inválido (cédula base incorrecta)' };
        }

        // Los últimos 3 dígitos deben ser 001
        const establecimiento = value.substring(10);
        if (establecimiento !== '001') {
            return { valid: false, error: 'RUC inválido (debe terminar en 001)' };
        }

        return { valid: true };
    }

    /**
     * Valida que un campo no esté vacío
     */
    static required(value: string | number | null | undefined, fieldName: string = 'Campo'): ValidationResult {
        if (value === null || value === undefined || value === '') {
            return { valid: false, error: `${fieldName} es requerido` };
        }
        return { valid: true };
    }

    /**
     * Valida longitud mínima
     */
    static minLength(value: string, min: number, fieldName: string = 'Campo'): ValidationResult {
        if (!value || value.length < min) {
            return { valid: false, error: `${fieldName} debe tener al menos ${min} caracteres` };
        }
        return { valid: true };
    }

    /**
     * Valida longitud máxima
     */
    static maxLength(value: string, max: number, fieldName: string = 'Campo'): ValidationResult {
        if (value && value.length > max) {
            return { valid: false, error: `${fieldName} no puede tener más de ${max} caracteres` };
        }
        return { valid: true };
    }

    /**
     * Valida un número positivo
     */
    static positiveNumber(value: number, fieldName: string = 'Valor'): ValidationResult {
        if (value <= 0) {
            return { valid: false, error: `${fieldName} debe ser mayor a 0` };
        }
        return { valid: true };
    }

    /**
     * Valida un rango numérico
     */
    static numberRange(value: number, min: number, max: number, fieldName: string = 'Valor'): ValidationResult {
        if (value < min || value > max) {
            return { valid: false, error: `${fieldName} debe estar entre ${min} y ${max}` };
        }
        return { valid: true };
    }
}
