/**
 * @file GetCreditNoteDocument.ts
 * @description Regenera los documentos (XML firmado / PDF) de una nota de crédito existente.
 *
 * @purpose
 * Las notas de crédito no persisten su XML firmado; este use case lo reconstruye
 * usando EXACTAMENTE el mismo camino de cálculo que la emisión original
 * (BillingService.calculateDetails + XMLGenerator.generateCreditNoteXML con la
 * clave de acceso persistida), de modo que el documento descargado refleja lo
 * que se envió al SRI.
 *
 * @connections
 * - Usado por: CreditNoteController (GET /credit-notes/:id/xml y /:id/pdf)
 * - Usa: ICreditNoteRepository, IBillRepository, IRestaurantConfigRepository,
 *        SRIService, PDFService, BillingService
 *
 * @layer Application - Use Case
 */

import { SRIService } from '../../infrastructure/services/SRIService';
import { PDFService } from '../../infrastructure/services/PDFService';
import { ICreditNoteRepository } from '../../domain/repositories/ICreditNoteRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { BillingService } from '../services/BillingService';
import { CreditNote as BillingCreditNote } from '../../domain/billing/creditNote';
import { NotFoundError } from '../../domain/errors/CustomErrors';
import { logger } from '../../infrastructure/utils/Logger';

export class GetCreditNoteDocument {
    constructor(
        private configRepository: IRestaurantConfigRepository,
        private creditNoteRepository: ICreditNoteRepository,
        private billRepository: IBillRepository,
        private sriService: SRIService,
        private pdfService: PDFService,
        private billingService: BillingService
    ) { }

    /** Devuelve el XML firmado de la nota de crédito */
    async getSignedXml(id: string): Promise<{ xml: string; documentNumber: string }> {
        const { billingNC, config, documentNumber } = await this.buildBillingCreditNote(id);

        const xml = this.sriService.generateCreditNoteXML(billingNC, billingNC.info.claveAcceso || undefined);
        const signedXml = await this.sriService.signXML(xml, config || undefined);

        return { xml: signedXml, documentNumber };
    }

    /** Devuelve el PDF (RIDE) de la nota de crédito */
    async getPdf(id: string): Promise<{ pdf: Buffer; documentNumber: string }> {
        const { billingNC, documentNumber } = await this.buildBillingCreditNote(id);

        const pdf = await this.pdfService.generateCreditNotePDF(billingNC);
        return { pdf, documentNumber };
    }

    /**
     * Reconstruye el objeto de dominio de la NC desde la entidad persistida,
     * la factura original y la configuración — mismo mapeo que GenerateCreditNote.
     */
    private async buildBillingCreditNote(id: string): Promise<{
        billingNC: BillingCreditNote;
        config: any;
        documentNumber: string;
    }> {
        const entity = await this.creditNoteRepository.findById(id);
        if (!entity) {
            throw new NotFoundError('Nota de crédito no encontrada', 'CreditNote');
        }

        const config = await this.configRepository.get();
        const originalBill = await this.billRepository.findById(entity.billId);
        if (!originalBill) {
            throw new NotFoundError('Factura original de la nota de crédito no encontrada', 'Bill');
        }

        const info: any = config || {};
        const taxRate: number = info.billing?.taxRate ?? 15;

        // Mismo cálculo de detalles que la emisión original
        const details = this.billingService.calculateDetails(originalBill.items, taxRate);
        const subtotal = details.reduce((sum, d) => sum + d.precioTotalSinImpuesto, 0);
        const totalImpuestos = details.reduce((sum, d) => sum + d.impuestos[0].valor, 0);
        const total = subtotal + totalImpuestos;

        const [estab, ptoEmi, secuencial] = entity.documentNumber.split('-');
        // Fecha en zona horaria Ecuador — coincide con la embebida en la clave de acceso
        const fechaEmision = this.billingService.formatDateToSRI(entity.date);

        logger.debug(`[GetCreditNoteDocument] Rebuilding NC ${entity.documentNumber} (taxRate ${taxRate}%)`);

        const billingNC: BillingCreditNote = {
            billId: entity.billId,
            orderId: entity.orderId,
            status: 'PENDING',
            creationDate: entity.createdAt ? new Date(entity.createdAt) : new Date(entity.date),
            authorizationDate: entity.authorizationDate,
            detalles: details,
            info: {
                ambiente: (entity.environment as '1' | '2') || (process.env.SRI_ENV === '2' ? '2' : '1'),
                tipoEmision: '1',
                razonSocial: info.businessName || process.env.BUSINESS_NAME || 'RESTAURANTE DEMO',
                nombreComercial: info.name || process.env.COMMERCIAL_NAME,
                ruc: info.ruc || process.env.RUC || '0000000000001',
                claveAcceso: entity.accessKey || undefined,
                dirMatriz: info.fiscalAddress || info.address || process.env.DIR_MATRIZ || 'Direccion Matriz',
                dirEstablecimiento: info.fiscalAddress || info.address || process.env.DIR_ESTABLECIMIENTO || process.env.DIR_MATRIZ,
                codDoc: '04',
                estab,
                ptoEmi,
                secuencial,
                fechaEmision,

                codDocModificado: '01',
                numDocModificado: originalBill.documentNumber,
                fechaEmisionDocSustento: this.billingService.formatDateToSRI(originalBill.date),

                obligadoContabilidad: info.obligadoContabilidad ? 'SI' : 'NO',
                tipoIdentificacionComprador: this.billingService.getIdentificacionType(entity.customerIdentification),
                razonSocialComprador: entity.customerName,
                identificacionComprador: entity.customerIdentification,

                motivo: entity.reasonDescription || entity.reason,

                totalSinImpuestos: subtotal,
                totalDescuento: 0,
                totalImpuestos: [],
                importeTotal: total,
                moneda: 'DOLAR',

                emailComprador: entity.customerEmail,
                logoUrl: this.billingService.getLogoUrl(info),
                emailMatriz: info.fiscalEmail || info.email || process.env.SMTP_FROM || 'info@restaurant.com',
                regime: info.billing?.regime,
                agenteRetencion: info.billing?.agenteRetencion
            }
        };

        return { billingNC, config, documentNumber: entity.documentNumber };
    }
}
