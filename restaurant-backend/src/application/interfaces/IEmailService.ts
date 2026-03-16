import { Invoice } from '../../domain/billing/invoice';

export interface IEmailService {
    sendInvoiceEmail(to: string, invoice: Invoice, pdfBuffer: Buffer, xmlContent?: string): Promise<void>;
}
