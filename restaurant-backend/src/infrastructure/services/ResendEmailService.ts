import { Resend } from 'resend';
import { IEmailService } from '../../application/interfaces/IEmailService';
import { Invoice } from '../../domain/billing/invoice';
import { CreditNote } from '../../domain/billing/creditNote';

export class ResendEmailService implements IEmailService {
    private resend: Resend;
    private fromEmail: string;

    constructor() {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.warn('[ResendEmailService] RESEND_API_KEY is not defined in environment variables.');
        }
        this.resend = new Resend(apiKey);
        this.fromEmail = process.env.SMTP_FROM || 'onboarding@resend.dev';
    }

    public async sendInvoiceEmail(to: string, invoice: Invoice, pdfBuffer: Buffer, xmlContent?: string): Promise<void> {
        if (!to) {
            console.warn('[ResendEmailService] No email provided for customer. Skipping email.');
            return;
        }

        try {
            console.log(`[ResendEmailService] Attempting to send invoice email to ${to}`);

            const attachments: any[] = [
                {
                    filename: `Factura_${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}.pdf`,
                    content: pdfBuffer,
                }
            ];

            if (xmlContent) {
                attachments.push({
                    filename: `Factura_${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}.xml`,
                    content: Buffer.from(xmlContent),
                });
            }

            const htmlContent = this.generateHtml(invoice);

            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: [to],
                subject: `Factura Electrónica ${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}`,
                html: htmlContent,
                attachments: attachments,
            });

            if (error) {
                console.error('[ResendEmailService] Error sending email via Resend:', error);
                return;
            }

            console.log(`[ResendEmailService] Email sent successfully via Resend. ID: ${data?.id}`);

        } catch (error) {
            console.error('[ResendEmailService] Unexpected error sending email via Resend:', error);
        }
    }

    public async sendCreditNoteEmail(to: string, creditNote: CreditNote, pdfBuffer: Buffer, xmlContent?: string): Promise<void> {
        if (!to) {
            console.warn('[ResendEmailService] No email provided for customer. Skipping email.');
            return;
        }

        try {
            console.log(`[ResendEmailService] Attempting to send credit note email to ${to}`);

            const attachments: any[] = [
                {
                    filename: `NotaCredito_${creditNote.info.estab}-${creditNote.info.ptoEmi}-${creditNote.info.secuencial}.pdf`,
                    content: pdfBuffer,
                }
            ];

            if (xmlContent) {
                attachments.push({
                    filename: `NotaCredito_${creditNote.info.estab}-${creditNote.info.ptoEmi}-${creditNote.info.secuencial}.xml`,
                    content: Buffer.from(xmlContent),
                });
            }

            const htmlContent = this.generateCreditNoteHtml(creditNote);

            const { data, error } = await this.resend.emails.send({
                from: this.fromEmail,
                to: [to],
                subject: `Nota de Crédito Electrónica ${creditNote.info.estab}-${creditNote.info.ptoEmi}-${creditNote.info.secuencial}`,
                html: htmlContent,
                attachments: attachments,
            });

            if (error) {
                console.error('[ResendEmailService] Error sending email via Resend:', error);
                return;
            }

            console.log(`[ResendEmailService] Email sent successfully via Resend. ID: ${data?.id}`);

        } catch (error) {
            console.error('[ResendEmailService] Unexpected error sending email via Resend:', error);
        }
    }

    private generateHtml(invoice: Invoice): string {
        let logoUrl = invoice.info.logoUrl || '';
        
        // Email clients often block Base64 logos or show them as attachments.
        // We prioritize a public HTTP URL for better visibility in the email body.
        const publicLogo = process.env.BUSINESS_LOGO_URL;
        if (logoUrl.startsWith('data:') && publicLogo) {
            console.log('[ResendEmailService] Base64 logo detected, using public BUSINESS_LOGO_URL for email content.');
            logoUrl = publicLogo;
        }

        const d = invoice.creationDate || new Date();
        const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

        return `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                <div style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 20px;">
                    ${logoUrl ? `<img src="${logoUrl}" alt="${invoice.info.nombreComercial}" height="80" border="0" style="max-height: 80px; height: 80px; display: block; margin: 0 auto 10px auto;">` : ''}
                    <h1 style="margin: 0; font-size: 20px;">${invoice.info.nombreComercial}</h1>
                </div>
                <div style="padding: 20px 0;">
                    <h2>Hola, ${invoice.info.razonSocialComprador}</h2>
                    <p>Adjunto encontrarás tu factura electrónica.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
                        <p><strong>No. Factura:</strong> ${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}</p>
                        <p><strong>Fecha:</strong> ${dateStr}</p>
                        <p><strong>Total:</strong> $${invoice.info.importeTotal.toFixed(2)}</p>
                    </div>
                </div>
                <div style="text-align: center; font-size: 13px; color: #555; border-top: 1px solid #eee; padding-top: 20px;">
                    <p style="margin: 0; font-weight: bold; color: #333;">Gracias por su preferencia.</p>
                    <p style="margin: 5px 0 0 0; font-size: 15px;">${invoice.info.nombreComercial || invoice.info.razonSocial}</p>
                    <p style="margin: 5px 0 0 0; font-size: 11px; color: #888;">${invoice.info.razonSocial}</p>
                </div>
            </div>
        `;
    }

    private generateCreditNoteHtml(creditNote: CreditNote): string {
        let logoUrl = creditNote.info.logoUrl || '';
        const publicLogo = process.env.BUSINESS_LOGO_URL;
        if (logoUrl.startsWith('data:') && publicLogo) {
            logoUrl = publicLogo;
        }

        const d = creditNote.creationDate || new Date();
        const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

        return `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
                <div style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 20px;">
                    ${logoUrl ? `<img src="${logoUrl}" alt="${creditNote.info.nombreComercial}" height="80" border="0" style="max-height: 80px; height: 80px; display: block; margin: 0 auto 10px auto;">` : ''}
                    <h1 style="margin: 0; font-size: 20px;">${creditNote.info.nombreComercial}</h1>
                </div>
                <div style="padding: 20px 0;">
                    <h2>Hola, ${creditNote.info.razonSocialComprador}</h2>
                    <p>Adjunto encontrarás tu nota de crédito electrónica (Anulación parcial o total).</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
                        <p><strong>No. Nota de Crédito:</strong> ${creditNote.info.estab}-${creditNote.info.ptoEmi}-${creditNote.info.secuencial}</p>
                        <p><strong>Documento Modificado:</strong> Factura ${creditNote.info.numDocModificado}</p>
                        <p><strong>Fecha Anulación:</strong> ${dateStr}</p>
                        <p><strong>Monto Reversado:</strong> $${creditNote.info.importeTotal.toFixed(2)}</p>
                        <p><strong>Motivo:</strong> ${creditNote.info.motivo}</p>
                    </div>
                </div>
                <div style="text-align: center; font-size: 13px; color: #555; border-top: 1px solid #eee; padding-top: 20px;">
                    <p style="margin: 0; font-weight: bold; color: #333;">Gracias por su preferencia.</p>
                    <p style="margin: 5px 0 0 0; font-size: 15px;">${creditNote.info.nombreComercial || creditNote.info.razonSocial}</p>
                    <p style="margin: 5px 0 0 0; font-size: 11px; color: #888;">${creditNote.info.razonSocial}</p>
                </div>
            </div>
        `;
    }
}
