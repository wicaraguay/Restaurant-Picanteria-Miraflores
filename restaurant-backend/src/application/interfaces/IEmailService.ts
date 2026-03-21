import { Invoice } from '../../domain/billing/invoice';
import { CreditNote } from '../../domain/billing/creditNote';

export interface IEmailService {
    sendInvoiceEmail(to: string, invoice: Invoice, pdfBuffer: Buffer, xmlContent?: string): Promise<void>;
    sendCreditNoteEmail(to: string, creditNote: CreditNote, pdfBuffer: Buffer, xmlContent?: string): Promise<void>;
}
