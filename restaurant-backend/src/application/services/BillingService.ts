import { ValidationError } from '../../domain/errors/CustomErrors';
import { RestaurantConfig } from '../../domain/entities/RestaurantConfig';
import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';

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
    constructor(private customerRepository?: ICustomerRepository) { }

    public calculateDetails(items: any[], taxRate: number = 15): BillingDetail[] {
        const rateDecimal = taxRate / 100;

        // 1. Calculate individual items and accumulate totals
        let totalSubtotalSum = 0;
        let totalTaxSum = 0;
        let totalInclusiveSum = 0;

        const details = items.map((item: any, index: number) => {
            const quantity = item.quantity || 1;
            let totalInclusive: number;

            if (item.total !== undefined && item.total !== null) {
                totalInclusive = item.total;
            } else {
                totalInclusive = (item.price || 0) * quantity;
            }

            const rawSubtotal = totalInclusive / (1 + rateDecimal);
            const subtotalRounded = parseFloat(rawSubtotal.toFixed(2));
            const taxValueRounded = parseFloat((totalInclusive - subtotalRounded).toFixed(2));

            totalSubtotalSum += subtotalRounded;
            totalTaxSum += taxValueRounded;
            totalInclusiveSum += totalInclusive;

            return {
                codigoPrincipal: item.id || `ITEM-${index + 1}`,
                descripcion: item.name,
                cantidad: quantity,
                precioUnitario: parseFloat((subtotalRounded / quantity).toFixed(6)),
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

        // 2. PENNY ADJUSTMENT (Total-driven logic)
        // Mathematically, the subtotal of the WHOLE invoice should be Rounded(Sum(Total) / 1.15)
        // If the sum of individual subtotals differs, we adjust the last item.
        if (details.length > 0) {
            const targetTotalSubtotal = parseFloat((totalInclusiveSum / (1 + rateDecimal)).toFixed(2));
            const subtotalDifference = parseFloat((targetTotalSubtotal - totalSubtotalSum).toFixed(2));

            if (Math.abs(subtotalDifference) > 0 && Math.abs(subtotalDifference) < 0.10) {
                console.log(`[BillingService] Applying penny adjustment: ${subtotalDifference > 0 ? '+' : ''}${subtotalDifference} to last item subtotal`);
                
                const lastItem = details[details.length - 1];
                lastItem.precioTotalSinImpuesto = parseFloat((lastItem.precioTotalSinImpuesto + subtotalDifference).toFixed(2));
                lastItem.precioUnitario = parseFloat((lastItem.precioTotalSinImpuesto / lastItem.cantidad).toFixed(6));
                
                // Adjust baseImponible and valor for the last item's tax
                // Tax MUST be TotalItem - SubtotalItem to keep TotalItem unchanged
                const lastItemTotal = items[items.length - 1].total || (items[items.length - 1].price * (items[items.length - 1].quantity || 1));
                const newTaxValue = parseFloat((lastItemTotal - lastItem.precioTotalSinImpuesto).toFixed(2));
                
                lastItem.impuestos[0].baseImponible = lastItem.precioTotalSinImpuesto;
                lastItem.impuestos[0].valor = newTaxValue;

                console.log(`[BillingService] New Last Item: Sub=${lastItem.precioTotalSinImpuesto}, Tax=${newTaxValue}, Total=${(lastItem.precioTotalSinImpuesto + newTaxValue).toFixed(2)}`);
            }
        }

        return details;
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
     * 04: RUC (13 digits)
     * 05: Cédula (10 digits)
     * 06: Pasaporte / Identificación Exterior
     * 07: Consumidor Final (9999999999999)
     */
    public getIdentificacionType(id: string): "04" | "05" | "06" | "07" {
        if (!id || id.trim() === '' || id === '9999999999999') return '07';
        
        const cleanId = id.trim();
        if (cleanId.length === 13 && /^\d+$/.test(cleanId)) return '04';
        if (cleanId.length === 10 && /^\d+$/.test(cleanId)) return '05';
        
        // If it doesn't match RUC or Cédula, assume Passport/Other (06)
        // Note: For Consumidor Final, it MUST be '07'
        return '06';
    }

    /**
     * Validates "Consumidor Final" requirements according to SRI 2026 regulations
     * Resolution NAC-DGERCGC25-00000017
     * @param identification - Buyer identification
     * @param total - Invoice total amount
     * @throws ValidationError if requirements are not met
     */
    public validateConsumidorFinal(identification: string, total: number): void {
        const isCF = identification === '9999999999999';
        
        if (isCF && total >= 50) {
            throw new ValidationError(
                `⚠️ Límite de Consumidor Final excedido: Las facturas de $50.00 o más requieren identificación completa ` +
                `(Resolución SRI NAC-DGERCGC25-00000017). Total actual: $${total.toFixed(2)}.`
            );
        }
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

    /**
     * Auto-learn or update customer data from the billing request.
     * Centralized in BillingService for reuse across Use Cases (GenerateInvoice, UpdateBill).
     */
    public async autoLearnCustomer(client: {
        identification: string;
        name: string;
        email?: string;
        address?: string;
        phone?: string;
    }, now: Date): Promise<void> {
        if (!this.customerRepository) {
            console.warn('[BillingService] Cannot auto-learn: CustomerRepository not provided.');
            return;
        }

        // Validation: skip if no identification or if it is Consumidor Final
        const rawId = client.identification;
        if (!rawId || rawId === 'undefined' || rawId === 'null') return;

        const identification = String(rawId).trim();
        const isConsumidorFinal = identification === '9999999999999';

        if (!identification || isConsumidorFinal) return;

        try {
            const existingCustomer = await this.customerRepository.findByIdentification(identification);
            if (existingCustomer) {
                // Update existing customer info if changed
                await this.customerRepository.update(existingCustomer.id, {
                    name: client.name,
                    email: (client.email && client.email.trim() !== '') ? client.email : existingCustomer.email,
                    address: (client.address && client.address.trim() !== '') ? client.address : existingCustomer.address,
                    phone: (client.phone && client.phone.trim() !== '') ? client.phone : existingCustomer.phone,
                    lastVisit: now
                });
                console.log(`[BillingService] Auto-learned: Updated customer ${identification}`);
            } else {
                const newCustomerData = {
                    name: client.name,
                    identification: identification,
                    email: (client.email && client.email.trim() !== '') ? client.email : undefined,
                    address: (client.address && client.address.trim() !== '') ? client.address : undefined,
                    phone: (client.phone && client.phone.trim() !== '') ? client.phone : undefined,
                    loyaltyPoints: 0,
                    lastVisit: now
                };

                const created = await this.customerRepository.create(newCustomerData as any);
                console.log(`[BillingService] Auto-learned: Created NEW customer ${identification} (ID: ${created?.id || 'new'})`);
            }
        } catch (error: any) {
            // Silently log error, we don't want customer learning to stop the whole billing process
            console.error('[BillingService] Failed to auto-learn customer data:', error.message);
        }
    }
}
