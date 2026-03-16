import { ValidationError } from '../../domain/errors/CustomErrors';
import { RestaurantConfig } from '../../domain/entities/RestaurantConfig';

export interface TaxDetail {
    codigo: string;
    codigoPorcentaje: string;
    tarifa: number;
    baseImponible: number;
    valor: number;
}

export interface BillingDetail {
    codigoPrincipal: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    precioTotalSinImpuesto: number;
    impuestos: TaxDetail[];
}

export class BillingService {
    /**
     * Calculates billing details including taxes for a set of items.
     * @param items Array of items from an order or bill
     * @param taxRate Current tax rate (e.g., 15)
     * @returns Array of BillingDetail with calculated values
     */
    public calculateDetails(items: any[], taxRate: number = 15): BillingDetail[] {
        const rateDecimal = taxRate / 100;

        return items.map((item: any, index: number) => {
            // Price can be inclusive or exclusive depending on the context
            // In GenerateInvoice, price is inclusive
            // In CheckInvoiceStatus, price is unit price (exclusive)

            const quantity = item.quantity || 1;
            let subtotalRounded: number;
            let unitPrice: number;

            if (item.total !== undefined && item.total !== null) {
                // Calculation for inclusive price (from order)
                const totalInclusive = item.total;
                const rawSubtotal = totalInclusive / (1 + rateDecimal);
                subtotalRounded = parseFloat(rawSubtotal.toFixed(2));
                unitPrice = parseFloat((subtotalRounded / quantity).toFixed(6));
            } else {
                // Calculation for exclusive price (from unit price)
                const rawTotalSinImpuesto = (item.price || 0) * quantity;
                subtotalRounded = parseFloat(rawTotalSinImpuesto.toFixed(2));
                unitPrice = item.price || 0;
            }

            const taxValueRounded = parseFloat((subtotalRounded * rateDecimal).toFixed(2));

            return {
                codigoPrincipal: item.id || `ITEM-${index + 1}`,
                descripcion: item.name,
                cantidad: quantity,
                precioUnitario: unitPrice,
                descuento: 0,
                precioTotalSinImpuesto: subtotalRounded,
                impuestos: [{
                    codigo: '2',
                    codigoPorcentaje: this.getTaxCode(taxRate),
                    tarifa: taxRate,
                    baseImponible: subtotalRounded,
                    valor: taxValueRounded
                }]
            };
        });
    }

    /**
     * Maps tax rate to SRI tax code
     */
    public getTaxCode(taxRate: number): string {
        if (taxRate === 15) return '4';
        if (taxRate === 12) return '2';
        if (taxRate === 10) return '3';
        if (taxRate === 5) return '5';
        return '0';
    }

    /**
     * Maps identification string to SRI identification type
     */
    public getIdentificacionType(id: string): "04" | "05" | "06" | "07" {
        if (!id || id === '9999999999999') return '07';
        if (id.length === 13) return '04';
        if (id.length === 10) return '05';
        return '06';
    }

    /**
     * Validates email format and common typos
     */
    public validateEmail(email: string): void {
        if (!email) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const cleanEmail = email.trim();

        if (!emailRegex.test(cleanEmail)) {
            throw new ValidationError(`⚠️ Error de Formato: El correo "${email}" no es válido.`);
        }

        if (email.includes(',')) {
            throw new ValidationError(`⚠️ Error de Formato: El correo no puede tener comas (,).`);
        }
    }

    /**
     * Formats a date string or object to SRI DD/MM/YYYY format
     */
    public formatDateToSRI(date: string | Date): string {
        const d = date instanceof Date ? date : new Date(date);

        if (isNaN(d.getTime())) {
            const now = new Date();
            return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
        }

        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    }

    /**
     * Formats current date in Ecuador time zone to SRI format
     */
    public getCurrentDateEcuador(): string {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' };
        const parts = new Intl.DateTimeFormat('es-EC', options).formatToParts(now);

        const d = parts.find(p => p.type === 'day')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        const y = parts.find(p => p.type === 'year')?.value;

        return `${d}/${m}/${y}`;
    }

    /**
     * Parses a date from different formats to Date object
     * Supports: ISO string, DD/MM/YYYY, timestamp
     */
    public parseSRIDate(dateStr: string): Date {
        if (!dateStr) return new Date();

        // If already in DD/MM/YYYY format
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/').map(Number);
            return new Date(year, month - 1, day);
        }

        // Try to parse as ISO string or timestamp
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            console.warn(`[BillingService] Invalid date format: ${dateStr}, using current date`);
            return new Date();
        }

        return date;
    }

    /**
     * Validates that the invoice is being transmitted in real-time according to SRI 2026 regulations
     * Resolution NAC-DGERCGC25-00000017: The emission date must correspond to the current date
     * @param fechaEmision - Invoice emission date in DD/MM/YYYY format
     * @throws Error if the date is not today
     */
    public validateRealTimeTransmission(fechaEmision: string): void {
        const [day, month, year] = fechaEmision.split('/').map(Number);

        const now = new Date();
        const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' };
        const parts = new Intl.DateTimeFormat('es-EC', options).formatToParts(now);

        const ecuadorDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');
        const ecuadorMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
        const ecuadorYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');

        const isSameDate = day === ecuadorDay && month === ecuadorMonth && year === ecuadorYear;

        if (!isSameDate) {
            throw new Error(
                `Transmisión NO en tiempo real: La fecha de emisión (${fechaEmision}) debe ser la fecha actual (${ecuadorDay.toString().padStart(2, '0')}/${ecuadorMonth.toString().padStart(2, '0')}/${ecuadorYear}) según la Resolución SRI NAC-DGERCGC25-00000017.`
            );
        }
    }

    /**
     * Centralized method to retrieve the business logo URL based on priority.
     * Priority: fiscalLogo > logo > explicitly provided logoUrl > Environment Variable
     */
    public getLogoUrl(config: Partial<RestaurantConfig> | null, providedLogoUrl?: string): string {
        console.log('[BillingService] Resolving logo. DB Logo:', config?.logo ? 'PRESENT' : 'MISSING', 'DB Fiscal:', config?.fiscalLogo ? 'PRESENT' : 'MISSING', 'Provided:', providedLogoUrl ? 'PRESENT' : 'MISSING');

        const resolved = config?.logo || config?.fiscalLogo || providedLogoUrl || process.env.BUSINESS_LOGO_URL || '';
        console.log('[BillingService] Resolved Logo URL (first 50 chars):', resolved.substring(0, 50));
        return resolved;
    }
}
