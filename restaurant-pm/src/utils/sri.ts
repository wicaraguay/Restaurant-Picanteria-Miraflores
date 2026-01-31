/**
 * Utility functions for SRI (Servicio de Rentas Internas)
 */

export const generateAccessKey = (
    date: Date,
    codDoc: string, // '01' = Factura
    ruc: string,
    environment: '1' | '2',
    establishment: string, // '001'
    emissionPoint: string, // '001'
    sequential: string, // 9 digits
    numericalCode: string // 8 digits
): string => {
    // Format Date: dd/mm/yyyy -> ddMMyyyy
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const fechaSimple = `${day}${month}${year}`;

    const keyPayload =
        fechaSimple +
        codDoc +
        ruc +
        environment +
        establishment +
        emissionPoint +
        sequential +
        numericalCode +
        '1'; // Tipo Emision (Normal)

    const checkDigit = calculateMod11(keyPayload);

    return keyPayload + checkDigit;
};

const calculateMod11 = (input: string): number => {
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
};
