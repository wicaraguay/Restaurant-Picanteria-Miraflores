import { logger } from '../../utils/Logger';
import { AccessKeyParams } from './types';

/**
 * Utility for generating and validating SRI Access Keys (Clave de Acceso)
 * Implements Módulo 11 verification digit calculation
 */
export class AccessKeyGenerator {
    /**
     * Generates a complete access key with verification digit
     * @param params Access key parameters
     * @returns Complete 49-digit access key
     */
    public generateAccessKey(params: AccessKeyParams): string {
        const keyPayload =
            this.formatDate(params.fechaEmision) +
            params.codDoc +
            params.ruc +
            params.ambiente +
            params.estab +
            params.ptoEmi +
            params.secuencial +
            params.codigoNumerico +
            '1'; // Tipo Emision (Normal)

        const digitoVerificador = this.calculateMod11(keyPayload);
        const claveAcceso = keyPayload + digitoVerificador;

        logger.info('[AccessKey] Generated access key', {
            keyPrefix: claveAcceso.substring(0, 10) + '...',
            codDoc: params.codDoc
        });

        return claveAcceso;
    }

    /**
     * Generates a unique random 8-digit numeric code for access keys
     * CRITICAL: Each invoice must have a different code to avoid SRI collisions
     */
    public generateRandomCode(): string {
        return Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    /**
     * Formats date from dd/mm/yyyy to ddMMyyyy
     */
    private formatDate(fechaEmision: string): string {
        const dateParts = fechaEmision.split('/');
        const day = dateParts[0].padStart(2, '0');
        const month = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        return `${day}${month}${year}`;
    }

    /**
     * Calculates the verification digit using Módulo 11 algorithm
     * @param input 48-digit payload (without verification digit)
     * @returns Single verification digit (0-9)
     */
    public calculateMod11(input: string): number {
        let factor = 2;
        let sum = 0;

        for (let i = input.length - 1; i >= 0; i--) {
            sum += parseInt(input.charAt(i)) * factor;
            factor = factor === 7 ? 2 : factor + 1;
        }

        const remainder = sum % 11;
        const result = 11 - remainder;

        if (result === 11) return 0;
        if (result === 10) return 1;
        return result;
    }

    /**
     * Gets the document type code
     */
    public getDocTypeCode(docType: 'invoice' | 'creditNote'): string {
        return docType === 'invoice' ? '01' : '04';
    }
}
