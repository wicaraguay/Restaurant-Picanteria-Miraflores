import { SRIService } from '../../infrastructure/services/SRIService';
import { PDFService } from '../../infrastructure/services/PDFService';
import { EmailService } from '../../infrastructure/services/EmailService';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { ICreditNoteRepository } from '../../domain/repositories/ICreditNoteRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { CreditNote, CreditNoteDetail, CREDIT_NOTE_REASONS } from '../../domain/billing/creditNote';

export class GenerateCreditNote {
    constructor(
        private configRepository: IRestaurantConfigRepository,
        private creditNoteRepository: ICreditNoteRepository,
        private billRepository: IBillRepository,
        private sriService: SRIService,
        private pdfService: PDFService,
        private emailService: EmailService
    ) { }

    async execute(data: {
        billId: string;
        reason: string;
        customDescription?: string;
        taxRate?: number;
    }): Promise<any> {
        const { billId, reason, customDescription, taxRate = 15 } = data;

        console.log(`[GenerateCreditNote] Starting credit note generation for bill: ${billId}`);

        // 1. Validate that the bill exists and is authorized
        const originalBill = await this.billRepository.findById(billId);
        if (!originalBill) {
            throw new Error('Factura original no encontrada');
        }

        if (originalBill.sriStatus !== 'AUTORIZADO') {
            throw new Error('Solo se pueden crear notas de crédito para facturas AUTORIZADAS');
        }

        if (!originalBill.accessKey) {
            throw new Error('La factura original no tiene clave de acceso');
        }


        // Validate that customer is not "Consumidor Final" according to SRI 2026 regulations
        // SRI Resolution NAC-DGERCGC25-00000017: Credit notes cannot be issued for "Consumidor Final" invoices
        const customerIdentType = this.getIdentificacionType(originalBill.customerIdentification);
        if (originalBill.customerIdentification === '9999999999999' || customerIdentType === '07') {
            throw new Error('No se puede emitir una nota de crédito para facturas de "CONSUMIDOR FINAL" según las normativas del SRI vigentes desde 2026 (Resolución NAC-DGERCGC25-00000017).');
        }

        // Validate 7-day deadline for credit notes (SRI 2026 requirement)
        // Resolution NAC-DGERCGC25-00000017: Credit notes can only be issued until the 7th of the month following emission
        const billDate = this.parseSRIDate(originalBill.date);
        const billMonth = billDate.getMonth();
        const billYear = billDate.getFullYear();

        // Calculate the last allowed day (7th of the following month, end of day)
        const maxDate = new Date(billYear, billMonth + 1, 7, 23, 59, 59);
        const today = new Date();

        if (today > maxDate) {
            const billDateStr = billDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const maxDateStr = maxDate.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
            throw new Error(
                `Fuera de plazo: Las notas de crédito solo pueden emitirse hasta el día 7 del mes siguiente ` +
                `(Resolución SRI NAC-DGERCGC25-00000017). Factura emitida: ${billDateStr}. Plazo máximo: ${maxDateStr}.`
            );
        }

        console.log(`[GenerateCreditNote] Bill validated: ${originalBill.documentNumber}`);

        // 2. Calculate Details (same items as original bill, but as credit)
        const rateDecimal = taxRate / 100;
        const details: CreditNoteDetail[] = originalBill.items.map((item: any, index: number) => {
            const priceInclusive = item.total / item.quantity || 0;
            const totalInclusive = priceInclusive * item.quantity;
            const rawSubtotal = totalInclusive / (1 + rateDecimal);
            const subtotalRounded = parseFloat(rawSubtotal.toFixed(2));
            const taxValueRounded = parseFloat((subtotalRounded * rateDecimal).toFixed(2));
            const unitPrice = subtotalRounded / item.quantity;

            return {
                codigoPrincipal: `ITEM-${index + 1}`,
                descripcion: item.name,
                cantidad: item.quantity,
                precioUnitario: parseFloat(unitPrice.toFixed(6)),
                descuento: 0,
                precioTotalSinImpuesto: subtotalRounded,
                impuestos: [{
                    codigo: '2',
                    codigoPorcentaje: taxRate === 15 ? '4' : (taxRate === 12 ? '2' : '0'),
                    tarifa: taxRate,
                    baseImponible: subtotalRounded,
                    valor: taxValueRounded
                }]
            };
        });

        const subtotal = details.reduce((sum, d) => sum + d.precioTotalSinImpuesto, 0);
        const totalImpuestos = details.reduce((sum, d) => sum + d.impuestos[0].valor, 0);
        const total = subtotal + totalImpuestos;

        // 3. Get Config
        const config = await this.configRepository.get();
        const info = config || {} as any;

        // 4. Get Next Sequential for Credit Notes (we'll use the same method for now)
        // In a production system, you might want a separate sequential counter for credit notes
        const nextSequential = await this.configRepository.getNextCreditNoteSequential();
        const secuencial = nextSequential.toString().padStart(9, '0');

        // 5. Build Credit Note Object
        const now = new Date();
        const reasonDescription = customDescription || CREDIT_NOTE_REASONS[reason as keyof typeof CREDIT_NOTE_REASONS] || 'Nota de Crédito';

        const creditNote: CreditNote = {
            billId: billId,
            orderId: originalBill.orderId,
            status: 'PENDING',
            creationDate: now,
            detalles: details,
            info: {
                ambiente: (process.env.SRI_ENV as '1' | '2') || '1',
                tipoEmision: '1',
                razonSocial: info.businessName || process.env.BUSINESS_NAME || 'RESTAURANTE DEMO',
                nombreComercial: info.name || process.env.COMMERCIAL_NAME,
                ruc: info.ruc || process.env.RUC || '0000000000001',
                dirMatriz: info.address || process.env.DIR_MATRIZ || 'Direccion Matriz',
                dirEstablecimiento: info.address || process.env.DIR_ESTABLECIMIENTO || process.env.DIR_MATRIZ,
                codDoc: '04',
                estab: info.billing?.establishment || process.env.ESTAB || '001',
                ptoEmi: info.billing?.emissionPoint || process.env.PTO_EMI || '001',
                secuencial: secuencial,
                fechaEmision: `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`,

                // Document Modified (Original Invoice)
                codDocModificado: '01',
                numDocModificado: originalBill.documentNumber,
                fechaEmisionDocSustento: this.formatDateToSRI(originalBill.date),

                obligadoContabilidad: info.obligadoContabilidad ? 'SI' : 'NO',
                tipoIdentificacionComprador: this.getIdentificacionType(originalBill.customerIdentification),
                razonSocialComprador: originalBill.customerName,
                identificacionComprador: originalBill.customerIdentification,

                motivo: reasonDescription,

                totalSinImpuestos: subtotal,
                totalDescuento: 0,
                totalImpuestos: [],
                importeTotal: total,
                moneda: 'DOLAR',

                emailComprador: originalBill.customerEmail,
                logoUrl: info.fiscalLogo || info.logo,
                emailMatriz: info.fiscalEmail || info.email || process.env.SMTP_FROM || 'info@restaurant.com'
            }
        };

        // 6. Generate XML
        console.log('[GenerateCreditNote] Generating XML...');
        const xml = this.sriService.generateCreditNoteXML(creditNote);
        const signedXml = await this.sriService.signXML(xml);
        const isProd = process.env.SRI_ENV === '2';

        // 7. Send to SRI
        console.log('[GenerateCreditNote] Sending to SRI...');
        const result = await this.sriService.sendCreditNoteToSRI(signedXml, isProd);

        // 8. Handle Response & Authorization
        const responseString = JSON.stringify(result);
        const isAlreadyRegistered = result.estado === 'DEVUELTA' &&
            (responseString.includes('CLAVE ACCESO REGISTRADA') || responseString.includes('EN PROCESAMIENTO'));

        let authResult = null;
        if (result.estado === 'RECIBIDA' || isAlreadyRegistered) {
            if (!isAlreadyRegistered) {
                console.log('[GenerateCreditNote] Waiting 3 seconds before authorization...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            console.log('[GenerateCreditNote] Requesting authorization...');
            authResult = await this.sriService.authorizeCreditNote(creditNote.info.claveAcceso!, isProd);

            // 9. Persist Credit Note
            await this.creditNoteRepository.upsert({
                accessKey: creditNote.info.claveAcceso,
                documentNumber: `${creditNote.info.estab}-${creditNote.info.ptoEmi}-${creditNote.info.secuencial}`,
                billId: billId,
                originalAccessKey: originalBill.accessKey,
                orderId: creditNote.orderId,
                date: now.toISOString(),
                reason: reason,
                reasonDescription: reasonDescription,
                customerName: creditNote.info.razonSocialComprador,
                customerIdentification: creditNote.info.identificacionComprador,
                customerAddress: originalBill.customerAddress,
                customerEmail: creditNote.info.emailComprador,
                items: details.map(d => ({
                    name: d.descripcion,
                    quantity: d.cantidad,
                    price: d.precioUnitario,
                    total: d.precioTotalSinImpuesto + (d.impuestos[0]?.valor || 0)
                })),
                subtotal: creditNote.info.totalSinImpuestos,
                tax: totalImpuestos,
                total: creditNote.info.importeTotal,
                sriStatus: authResult.estado || result.estado,
                environment: creditNote.info.ambiente,
                authorizationDate: authResult.fechaAutorizacion
            });

            console.log('[GenerateCreditNote] Credit note persisted successfully');

            // 10.1. Mark the original bill as cancelled (only if credit note was authorized)
            if (authResult.estado === 'AUTORIZADO') {
                await this.billRepository.upsert({
                    id: billId,
                    hasCreditNote: true,
                    sriStatus: 'CANCELLED'
                } as any);
                console.log('[GenerateCreditNote] Original bill marked as CANCELLED');
            } else {
                console.log('[GenerateCreditNote] Credit note not authorized, bill status unchanged');
            }

            // 10.2. Send Email (optional - only for authorized and valid emails)
            const isValidEmail = originalBill.customerEmail &&
                !originalBill.customerEmail.includes('consumidor@final') &&
                !originalBill.customerEmail.includes('noemail') &&
                originalBill.customerEmail.includes('@') &&
                originalBill.customerEmail.includes('.');

            if (authResult.estado === 'AUTORIZADO' && isValidEmail) {
                console.log(`[GenerateCreditNote] Sending email to ${originalBill.customerEmail}`);
                if (authResult.fechaAutorizacion) creditNote.authorizationDate = authResult.fechaAutorizacion;

                // For now, we'll skip PDF generation for credit notes
                // You can extend PDFService later to support credit note PDFs
                // const pdfBuffer = await this.pdfService.generateCreditNotePDF(creditNote);
                // await this.emailService.sendCreditNoteEmail(originalBill.customerEmail, creditNote, pdfBuffer, signedXml);
            } else {
                console.log('[GenerateCreditNote] Skipping email - Conditions not met');
            }
        }

        return {
            success: true,
            creditNoteId: creditNote.info.secuencial,
            accessKey: creditNote.info.claveAcceso,
            sriResponse: result,
            authorization: authResult,
            xml: xml
        };
    }

    private formatDateToSRI(dateStr: string): string {
        // If already in DD/MM/YYYY format, return as is
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            return dateStr;
        }

        // Try to parse as Date (handles ISO, timestamp, etc.)
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            // If invalid, return current date as fallback
            console.warn(`[GenerateCreditNote] Invalid date: ${dateStr}, using current date`);
            const now = new Date();
            return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
        }

        // Convert to DD/MM/YYYY
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }

    /**
     * Parses a date from different formats to Date object
     * Supports: ISO string, DD/MM/YYYY, timestamp
     */
    private parseSRIDate(dateStr: string): Date {
        // If already in DD/MM/YYYY format
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/').map(Number);
            return new Date(year, month - 1, day);
        }

        // Try to parse as ISO string or timestamp
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            console.warn(`[GenerateCreditNote] Invalid date format: ${dateStr}, using current date`);
            return new Date();
        }

        return date;
    }

    private getIdentificacionType(id: string): "04" | "05" | "06" | "07" {
        if (id === '9999999999999') return '07';
        if (id.length === 13) return '04';
        if (id.length === 10) return '05';
        return '06';
    }
}
