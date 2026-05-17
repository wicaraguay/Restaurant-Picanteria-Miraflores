import { IEmailService } from '../../application/interfaces/IEmailService';
import { Invoice } from '../../domain/billing/invoice';
import { CreditNote } from '../../domain/billing/creditNote';
import { logger } from '../utils/Logger';

/**
 * No-Op Email Service
 * Used when RESEND_API_KEY is not configured (development environment)
 * Logs email attempts but doesn't actually send anything
 */
export class NoOpEmailService implements IEmailService {
    constructor() {
        logger.warn('[NoOpEmailService] Email service disabled - RESEND_API_KEY not configured');
    }

    public async sendInvoiceEmail(to: string, invoice: Invoice, _pdfBuffer: Buffer, _xmlContent?: string): Promise<void> {
        logger.info('[NoOpEmailService] Would send invoice email (disabled)', {
            to,
            invoice: `${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}`
        });
    }

    public async sendCreditNoteEmail(to: string, creditNote: CreditNote, _pdfBuffer: Buffer, _xmlContent?: string): Promise<void> {
        logger.info('[NoOpEmailService] Would send credit note email (disabled)', {
            to,
            creditNote: `${creditNote.info.estab}-${creditNote.info.ptoEmi}-${creditNote.info.secuencial}`
        });
    }
}
