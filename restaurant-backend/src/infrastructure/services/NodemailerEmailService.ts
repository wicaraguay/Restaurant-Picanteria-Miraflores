import nodemailer from 'nodemailer';
import { IEmailService } from '../../application/interfaces/IEmailService';
import { Invoice } from '../../domain/billing/invoice';
import { CreditNote } from '../../domain/billing/creditNote';

export class NodemailerEmailService implements IEmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    public async sendInvoiceEmail(to: string, invoice: Invoice, pdfBuffer: Buffer, xmlContent?: string): Promise<void> {
        if (!to) {
            console.warn('[EmailService] No email provided for customer. Skipping email.');
            return;
        }

        try {
            console.log(`[EmailService] Attempting to send invoice email to ${to}`);

            const attachments: any[] = [
                {
                    filename: `Factura_${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ];

            if (xmlContent) {
                console.log('[EmailService] XML Content provided, adding attachment. Length:', xmlContent.length);
                attachments.push({
                    filename: `Factura_${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}.xml`,
                    content: xmlContent,
                    contentType: 'application/xml'
                });
            } else {
                console.warn('[EmailService] No XML Content provided for email attachment.');
            }

            const mailOptions = {
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: to,
                subject: `Factura Electrónica ${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}`,
                text: `Estimado cliente,\n\nAdjunto encontrará su factura electrónica Nro. ${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial} (PDF y XML).\n\nGracias por su preferencia.`,
                html: this.generateHtml(invoice),
                attachments: attachments
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Email sent successfully to ${to}. MessageId: ${info.messageId}`);

        } catch (error) {
            console.error('[EmailService] Error sending email:', error);
        }
    }

    public async sendCreditNoteEmail(to: string, creditNote: CreditNote, pdfBuffer: Buffer, xmlContent?: string): Promise<void> {
        if (!to) {
            console.warn('[EmailService] No email provided for customer. Skipping email.');
            return;
        }

        try {
            console.log(`[EmailService] Attempting to send credit note email to ${to}`);

            const attachments: any[] = [
                {
                    filename: `NotaCredito_${creditNote.info.estab}-${creditNote.info.ptoEmi}-${creditNote.info.secuencial}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ];

            if (xmlContent) {
                attachments.push({
                    filename: `NotaCredito_${creditNote.info.estab}-${creditNote.info.ptoEmi}-${creditNote.info.secuencial}.xml`,
                    content: xmlContent,
                    contentType: 'application/xml'
                });
            }

            const mailOptions = {
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: to,
                subject: `Nota de Crédito Electrónica ${creditNote.info.estab}-${creditNote.info.ptoEmi}-${creditNote.info.secuencial}`,
                text: `Estimado cliente,\n\nAdjunto encontrará su nota de crédito electrónica Nro. ${creditNote.info.estab}-${creditNote.info.ptoEmi}-${creditNote.info.secuencial} (PDF y XML).\n\nGracias por su preferencia.`,
                html: this.generateCreditNoteHtml(creditNote),
                attachments: attachments
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Email sent successfully to ${to}. MessageId: ${info.messageId}`);

        } catch (error) {
            console.error('[EmailService] Error sending credit note email:', error);
        }
    }

    private generateHtml(invoice: Invoice): string {
        let logoUrl = invoice.info.logoUrl || '';

        // Email clients often block Base64 logos or show them as attachments.
        // We prioritize a public HTTP URL for better visibility in the email body.
        const publicLogo = process.env.BUSINESS_LOGO_URL;
        if (logoUrl.startsWith('data:') && publicLogo) {
            console.log('[NodemailerEmailService] Base64 logo detected, using public BUSINESS_LOGO_URL for email content.');
            logoUrl = publicLogo;
        }

        const d = invoice.creationDate || new Date();
        const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

        return `
            <div style="font-family: 'Helvetica', 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <!-- Header with Logo -->
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                    ${logoUrl
                ? `<img src="${logoUrl}" alt="${invoice.info.nombreComercial}" style="max-height: 80px; max-width: 200px; display: block; margin: 0 auto 10px auto;">`
                : ''
            }
                    <h1 style="margin: 0; color: #111827; font-size: 22px; font-weight: bold; text-transform: uppercase;">${invoice.info.nombreComercial}</h1>
                </div>

                <!-- Body -->
                <div style="padding: 30px;">
                    <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Hola, ${invoice.info.razonSocialComprador}</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
                        Gracias por tu visita. Adjunto encontrarás el detalle de tu factura electrónica (PDF y XML).
                    </p>
                    
                    <!-- Invoice Details Box -->
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">No. Factura:</td>
                                <td style="padding: 5px 0; color: #111827; font-weight: bold; text-align: right;">${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Fecha de Emisión:</td>
                                <td style="padding: 5px 0; color: #111827; font-weight: bold; text-align: right;">${dateStr}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0 0 0; color: #111827; font-size: 16px; font-weight: bold; border-top: 1px solid #d1d5db; margin-top: 10px;">Valor Total:</td>
                                <td style="padding: 10px 0 0 0; color: #059669; font-size: 20px; font-weight: bold; text-align: right; border-top: 1px solid #d1d5db; margin-top: 10px;">$${invoice.info.importeTotal.toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb; color: #4b5563;">
                    <p style="margin: 0; font-weight: bold; font-size: 14px;">Gracias por elegirnos.</p>
                    <p style="margin: 8px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">${invoice.info.nombreComercial || invoice.info.razonSocial}</p>
                    <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 11px;">${invoice.info.razonSocial}</p>
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
            <div style="font-family: 'Helvetica', 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <!-- Header with Logo -->
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                    ${logoUrl
                ? `<img src="${logoUrl}" alt="${creditNote.info.nombreComercial}" style="max-height: 80px; max-width: 200px; display: block; margin: 0 auto 10px auto;">`
                : ''
            }
                    <h1 style="margin: 0; color: #111827; font-size: 22px; font-weight: bold; text-transform: uppercase;">${creditNote.info.nombreComercial}</h1>
                </div>

                <!-- Body -->
                <div style="padding: 30px;">
                    <h2 style="color: #111827; margin-top: 0; font-size: 20px;">Hola, ${creditNote.info.razonSocialComprador}</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
                        Adjuntamos tu nota de crédito electrónica (Anulación parcial o total).
                    </p>
                    
                    <!-- Details Box -->
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">No. Nota de Crédito:</td>
                                <td style="padding: 5px 0; color: #111827; font-weight: bold; text-align: right;">${creditNote.info.estab}-${creditNote.info.ptoEmi}-${creditNote.info.secuencial}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Doc. Modificado:</td>
                                <td style="padding: 5px 0; color: #111827; font-weight: bold; text-align: right;">Factura ${creditNote.info.numDocModificado}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #6b7280; font-size: 14px;">Fecha:</td>
                                <td style="padding: 5px 0; color: #111827; font-weight: bold; text-align: right;">${dateStr}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0 0 0; color: #111827; font-size: 16px; font-weight: bold; border-top: 1px solid #d1d5db; margin-top: 10px;">Valor Reversado:</td>
                                <td style="padding: 10px 0 0 0; color: #dc2626; font-size: 20px; font-weight: bold; text-align: right; border-top: 1px solid #d1d5db; margin-top: 10px;">$${creditNote.info.importeTotal.toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb; color: #4b5563;">
                    <p style="margin: 0; font-weight: bold; font-size: 14px;">Gracias por su preferencia.</p>
                    <p style="margin: 8px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">${creditNote.info.nombreComercial || creditNote.info.razonSocial}</p>
                    <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 11px;">${creditNote.info.razonSocial}</p>
                </div>
            </div>
        `;
    }
}
