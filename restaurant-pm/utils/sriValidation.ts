/**
 * @file sriValidation.ts
 * @description Validación de identificaciones ecuatorianas (RUC, Cédula, Pasaporte)
 * 
 * @purpose
 * Implementa el algoritmo oficial del SRI para validar RUC y Cédulas.
 * Soporta Módulo 10 (personas naturales) y Módulo 11 (sociedades).
 * 
 * @connections
 * - Usado por: BillForm component
 * 
 * @layer Utils - Business Logic
 */

export type IDType = 'RUC' | 'Cédula' | 'Consumidor Final' | 'Pasaporte' | 'Desconocido';

export interface ValidationResult {
    isValid: boolean;
    type: IDType;
}

/**
 * Valida identificaciones ecuatorianas según algoritmo del SRI
 */
export const validateEcuadorianID = (id: string): ValidationResult => {
    // 1. Basic format checks
    if (!id || typeof id !== 'string') {
        return { isValid: false, type: 'Desconocido' };
    }

    // Consumidor Final
    if (id === '9999999999999') {
        return { isValid: true, type: 'Consumidor Final' };
    }

    // Pasaporte logic (Simple heuristic: letters or irregular length not 10/13)
    if (!/^\d+$/.test(id)) {
        if (id.length >= 5) {
            return { isValid: true, type: 'Pasaporte' };
        }
        return { isValid: false, type: 'Desconocido' };
    }

    const len = id.length;
    if (len !== 10 && len !== 13) {
        // If it's numeric but not 10 or 13, and > 5, assume passport (foreign id)
        if (len > 5 && len < 20) {
            return { isValid: true, type: 'Pasaporte' };
        }
        return { isValid: false, type: 'Desconocido' };
    }

    const province = parseInt(id.substring(0, 2), 10);
    const thirdDigit = parseInt(id.substring(2, 3), 10);
    const digits = id.split('').map(Number);

    // 2. Province Validation (01-24, 30 for Foreigners)
    if (!((province >= 1 && province <= 24) || province === 30)) {
        return { isValid: false, type: 'Desconocido' };
    }

    // --- ALGORITHMS ---

    // Algorithm Modulo 10 (Cedula / RUC Persona Natural)
    const checkModulo10 = (d: number[]) => {
        const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            let val = d[i] * coef[i];
            sum += val >= 10 ? val - 9 : val;
        }
        let result = sum % 10 === 0 ? 0 : 10 - (sum % 10);
        return result === d[9];
    };

    // Algorithm Modulo 11 (Sociedades)
    const checkModulo11 = (d: number[], coef: number[], checkIndex: number) => {
        let sum = 0;
        for (let i = 0; i < coef.length; i++) {
            sum += d[i] * coef[i];
        }
        let remainder = sum % 11;
        let result = remainder === 0 ? 0 : 11 - remainder;

        // If result is 10, strictly invalid in Modulo 11 for RUCs
        if (result === 10) return false;

        return result === d[checkIndex];
    };

    // 3. Classification based on 3rd Digit

    // CASO A: Persona Natural (0, 1, 2, 3, 4, 5)
    if (thirdDigit < 6) {
        if (checkModulo10(digits)) {
            // Is it Cedula or RUC?
            if (len === 10) return { isValid: true, type: 'Cédula' };
            if (len === 13) {
                // RUC Natural must end in 001 (or greater sequence)
                const establishment = parseInt(id.substring(10, 13), 10);
                if (establishment >= 1) return { isValid: true, type: 'RUC' };
            }
        }
    }
    // CASO B: Sociedad Pública (6)
    else if (thirdDigit === 6) {
        // Must be RUC (13 digits)
        if (len !== 13) return { isValid: false, type: 'Desconocido' };

        // Check Digit is at index 8 (9th digit)
        const coef = [3, 2, 7, 6, 5, 4, 3, 2];
        if (checkModulo11(digits, coef, 8)) {
            const establishment = parseInt(id.substring(9, 13), 10); // Last 4 digits
            if (establishment >= 1) return { isValid: true, type: 'RUC' };
        }
    }
    // CASO C: Sociedad Privada (9)
    else if (thirdDigit === 9) {
        // Must be RUC (13 digits)
        if (len !== 13) return { isValid: false, type: 'Desconocido' };

        // Check Digit is at index 9 (10th digit)
        const coef = [4, 3, 2, 7, 6, 5, 4, 3, 2];
        if (checkModulo11(digits, coef, 9)) {
            const establishment = parseInt(id.substring(10, 13), 10);
            if (establishment >= 1) return { isValid: true, type: 'RUC' };
        }
    }

    return { isValid: false, type: 'Desconocido' };
};
