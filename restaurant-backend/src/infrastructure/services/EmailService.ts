import nodemailer from 'nodemailer';
import { Invoice } from '../../domain/billing/invoice';

export class EmailService {
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

            console.log('[EmailService] Attachments prepared:', attachments.map(a => a.filename));

            const mailOptions = {
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to: to,
                subject: `Factura Electrónica ${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}`,
                text: `Estimado cliente,\n\nAdjunto encontrará su factura electrónica Nro. ${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial} (PDF y XML).\n\nGracias por su preferencia.`,
                html: `
                    <div style="font-family: 'Helvetica', 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        
                        <!-- Header with Logo -->
                        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                            ${invoice.info.logoUrl && !invoice.info.logoUrl.startsWith('data:')
                        ? `<img src="${invoice.info.logoUrl}" alt="${invoice.info.nombreComercial}" style="max-height: 80px; max-width: 200px; display: block; margin: 0 auto 10px auto;">`
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
                                        <td style="padding: 5px 0; color: #111827; font-weight: bold; text-align: right;">${(() => {
                        const d = invoice.creationDate || new Date();
                        const day = d.getDate().toString().padStart(2, '0');
                        const month = (d.getMonth() + 1).toString().padStart(2, '0');
                        const year = d.getFullYear();
                        let hours = d.getHours();
                        const ampm = hours >= 12 ? 'pm' : 'am';
                        hours = hours % 12 || 12;
                        return `${day}/${month}/${year} ${hours.toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${ampm}`;
                    })()}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 10px 0 0 0; color: #111827; font-size: 16px; font-weight: bold; border-top: 1px solid #d1d5db; margin-top: 10px;">Valor Total:</td>
                                        <td style="padding: 10px 0 0 0; color: #059669; font-size: 20px; font-weight: bold; text-align: right; border-top: 1px solid #d1d5db; margin-top: 10px;">$${invoice.info.importeTotal.toFixed(2)}</td>
                                    </tr>
                                </table>
                            </div>

                            <div style="text-align: center; margin-top: 30px;">
                                <a href="${process.env.FRONTEND_URL || '#'}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Visitar Sitio Web</a>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
                            <p style="margin: 0;">Gracias por elegirnos.</p>
                            <p style="margin: 5px 0 0 0;">${invoice.info.razonSocial}</p>
                            <p style="margin: 0;">${invoice.info.dirMatriz}</p>
                        </div>
                    </div>
                `,
                attachments: attachments
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Email sent successfully to ${to}. MessageId: ${info.messageId}`);

        } catch (error) {
            console.error('[EmailService] Error sending email:', error);
            // Log error but allow process to continue (optional: throw based on requirements)
        }
    }
}
