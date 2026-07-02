import { Invoice } from '../../domain/billing/invoice';
import { CreditNote } from '../../domain/billing/creditNote';

export interface EmailSendResult {
    success: boolean;
    error?: string;
    messageId?: string;
}

export interface IEmailService {
    sendInvoiceEmail(to: string, invoice: Invoice, pdfBuffer: Buffer, xmlContent?: string): Promise<EmailSendResult>;
    sendCreditNoteEmail(to: string, creditNote: CreditNote, pdfBuffer: Buffer, xmlContent?: string): Promise<EmailSendResult>;
    sendPasswordResetEmail?(to: string, userName: string, resetUrl: string): Promise<EmailSendResult>;
}
