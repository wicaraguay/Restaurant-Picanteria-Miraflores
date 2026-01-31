import PDFDocument from 'pdfkit';
import { Invoice } from '../../domain/billing/invoice';
import axios from 'axios';

export class PDFService {
    public async generateInvoicePDF(invoice: Invoice, format: 'A4' | 'ticket' = 'A4'): Promise<Buffer> {
        if (format === 'ticket') {
            return this.generateTicketPDF(invoice);
        }
        return this.generateA4PDF(invoice);
    }

    private async generateA4PDF(invoice: Invoice): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            const doc = new PDFDocument({ margin: 30, size: 'A4' });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            doc.on('error', reject);

            try {
                await this.generateHeader(doc, invoice);
                this.generateCustomerInformation(doc, invoice);
                this.generateInvoiceTable(doc, invoice);
                this.generateFooter(doc, invoice);

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    private async generateTicketPDF(invoice: Invoice): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            // 80mm is approx 226 points. Standard margin 10.
            // We use a long height to simulate roll paper, most printers handle the cut.
            const doc = new PDFDocument({ margin: 10, size: [226, 1200] });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            doc.on('error', reject);

            try {
                const centerX = 113;
                const leftMargin = 10;
                const rightMargin = 216;
                let y = 10;

                // --- Logo ---
                if (invoice.info.logoUrl) {
                    try {
                        let logo: Buffer;
                        if (invoice.info.logoUrl.startsWith('data:')) {
                            const base64Data = invoice.info.logoUrl.split(';base64,').pop();
                            logo = Buffer.from(base64Data || '', 'base64');
                        } else {
                            const response = await axios.get(invoice.info.logoUrl, { responseType: 'arraybuffer' });
                            logo = Buffer.from(response.data);
                        }
                        // Fit logo in 160px width centered (approx 70% of ticket width)
                        doc.image(logo, (226 - 160) / 2, y, { fit: [160, 100], align: 'center' });
                        y += 105;
                    } catch (e) {
                        console.warn('Ticket Logo Error', e);
                    }
                }

                // --- Invoice Header Info ---
                doc.font('Helvetica-Bold').fontSize(10).text((invoice.info.nombreComercial || '').toUpperCase(), leftMargin, y, { align: 'center', width: 206 });
                y = doc.y + 5;

                doc.font('Helvetica').fontSize(8).text(invoice.info.razonSocial || '', { align: 'center', width: 206 });
                doc.text(`RUC: ${invoice.info.ruc}`, { align: 'center', width: 206 });
                doc.text(invoice.info.dirMatriz, { align: 'center', width: 206 });

                y = doc.y + 8;

                // --- Document Info ---
                doc.font('Helvetica-Bold').fontSize(9).text('FACTURA ELECTRÓNICA', { align: 'center' });
                doc.fontSize(8).text(`No. ${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}`, { align: 'center' });

                doc.fontSize(7).text(`Ambiente: ${invoice.info.ambiente === '2' ? 'Producción' : 'Pruebas'}`, { align: 'center' });
                y = doc.y + 10;

                // --- Access Key ---
                doc.font('Helvetica-Bold').fontSize(8).text('CLAVE DE ACCESO:', { align: 'center' });
                y += 2;
                doc.font('Courier').fontSize(6.5).text(invoice.info.claveAcceso || '', { align: 'center', characterSpacing: 0 });
                y += 5;

                const authDate = this.formatDateTime(invoice.authorizationDate || invoice.info.fechaEmision);
                doc.font('Helvetica').fontSize(6).text(`Fecha y Hora de Autorización:\n${authDate}`, { align: 'center' });
                y = doc.y + 5;
                doc.moveTo(leftMargin, y).lineTo(rightMargin, y).lineWidth(0.5).dash(2, { space: 2 }).stroke();
                doc.undash();
                y += 5;

                // --- Customer Info ---
                const creationDate = this.formatDateTime(invoice.creationDate || invoice.info.fechaEmision);

                doc.font('Helvetica-Bold').fontSize(8).text('CLIENTE:', leftMargin, y);
                y = doc.y + 2;

                doc.font('Helvetica').fontSize(7);
                // Name
                doc.text(`${invoice.info.razonSocialComprador.substring(0, 40)}`, { width: 206 });
                // RUC/CI
                doc.text(`RUC/CI: ${invoice.info.identificacionComprador}`, { width: 206 });
                // Emission Date
                doc.text(`Fecha Emisión: ${creationDate}`, { width: 206 });
                // Address
                if (invoice.info.direccionComprador && invoice.info.direccionComprador !== 'S/N') {
                    doc.text(`Dir: ${invoice.info.direccionComprador.substring(0, 50)}`, { width: 206 });
                } else {
                    doc.text(`Dir: S/N`);
                }
                // Phone
                if (invoice.info.telefonoComprador && invoice.info.telefonoComprador !== 'S/N') {
                    doc.text(`Tel: ${invoice.info.telefonoComprador}`);
                }
                // Email
                if (invoice.info.emailComprador && invoice.info.emailComprador !== 'S/N') {
                    doc.text(`Email: ${invoice.info.emailComprador.substring(0, 35)}`);
                }
                // Payment Method
                const paymentMethod = this.getPaymentMethodText(invoice.info.formaPago);
                doc.text(`Forma Pago: ${paymentMethod}`);

                y = doc.y + 5;
                doc.moveTo(leftMargin, y).lineTo(rightMargin, y).lineWidth(0.5).dash(2, { space: 2 }).stroke();
                doc.undash();
                y += 5;

                // --- Items Header ---
                doc.font('Helvetica-Bold').fontSize(7);
                doc.text('CANT', leftMargin, y, { width: 25, align: 'left' });
                doc.text('DESC', leftMargin + 30, y, { width: 125, align: 'left' });
                doc.text('TOT', leftMargin + 155, y, { width: 51, align: 'right' });
                y = doc.y + 2;
                doc.moveTo(leftMargin, y).lineTo(rightMargin, y).lineWidth(0.5).stroke();
                y += 5;

                // --- Items List ---
                doc.font('Helvetica').fontSize(8);
                invoice.detalles.forEach(item => {
                    const taxValue = (item.impuestos && item.impuestos.length > 0) ? item.impuestos[0].valor : 0;
                    const totalItem = (item.precioTotalSinImpuesto + taxValue).toFixed(2);

                    doc.text(item.cantidad.toString(), leftMargin, y, { width: 25, align: 'center' });
                    doc.text(item.descripcion, leftMargin + 30, y, { width: 125, align: 'left' });
                    doc.text(totalItem, leftMargin + 155, y, { width: 51, align: 'right' });

                    y = doc.y + 3;
                });

                y += 5;
                doc.moveTo(leftMargin, y).lineTo(rightMargin, y).lineWidth(0.5).stroke();
                y += 5;

                // --- Totals Breakdown ---
                const taxRate = invoice.info.tasaIva || '15';
                const subtotalBase = invoice.info.totalSinImpuestos.toFixed(2);
                const ivaValue = (invoice.info.importeTotal - invoice.info.totalSinImpuestos).toFixed(2);
                const totalValue = invoice.info.importeTotal.toFixed(2);

                doc.fontSize(8);
                const totalsLabelX = 60;
                const totalsValueX = 155;
                const labelW = 90;

                const drawRow = (label: string, val: string, bold: boolean = false) => {
                    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
                    doc.text(label, totalsLabelX, y, { width: labelW, align: 'right' });
                    doc.text(`$${val}`, totalsValueX, y, { width: 51, align: 'right' });
                    y += 10;
                };

                drawRow(`SUBTOTAL ${taxRate}%`, subtotalBase);
                drawRow(`SUBTOTAL 0%`, '0.00');
                drawRow(`SUBTOTAL`, subtotalBase);
                drawRow(`DESCUENTO`, '0.00');
                drawRow(`IVA ${taxRate}%`, ivaValue);
                drawRow(`PROPINA`, '0.00');

                y += 3;
                doc.fontSize(10);
                drawRow(`VALOR TOTAL`, totalValue, true);

                y += 20;

                // --- Footer ---
                doc.font('Helvetica').fontSize(7)
                    .text('Descargue su documento en:', { align: 'center' })
                    .text('www.sri.gob.ec', { align: 'center', underline: true });

                y += 15;
                doc.text('Gracias por su compra', { align: 'center' });

                doc.end();
            } catch (error) {
                console.error('Error generating ticket PDF:', error);
                reject(error);
            }
        });
    }

    private async generateHeader(doc: PDFKit.PDFDocument, invoice: Invoice): Promise<void> {
        const leftMargin = 30;
        const rightMargin = 565;
        const topY = 30;

        // --- Logo Section (Left) ---
        let currentLeftY = topY;

        if (invoice.info.logoUrl) {
            try {
                let logo: Buffer;
                if (invoice.info.logoUrl.startsWith('data:')) {
                    const base64Data = invoice.info.logoUrl.split(';base64,').pop();
                    logo = Buffer.from(base64Data || '', 'base64');
                } else {
                    const response = await axios.get(invoice.info.logoUrl, { responseType: 'arraybuffer' });
                    logo = Buffer.from(response.data);
                }

                // Frontend: max 250x120. Approx 50% width of the page content.
                doc.image(logo, leftMargin, currentLeftY, { fit: [250, 120] });
                currentLeftY += 130; // Height 120 + 10 margin
            } catch (error) {
                console.warn('Failed to load logo for PDF:', error);
                // Fallback text if logo fails? Or just skip.
                currentLeftY = topY + 10;
            }
        } else {
            currentLeftY = topY + 10;
        }

        // --- Left Information Column ---
        // Adjusted sizes: 20px -> ~15/16pt, 11px -> ~8.5/9pt

        // 1. Commercial Name (Large, Bold, Uppercase)
        doc.fillColor('#111827')
            .font('Helvetica-Bold')
            .fontSize(16) // Adjusted from 20
            .text((invoice.info.nombreComercial || '').toUpperCase(), leftMargin, currentLeftY);

        currentLeftY = doc.y + 2;

        // 2. Legal Name (Normal)
        doc.fontSize(9) // Adjusted from 11
            .font('Helvetica')
            .fillColor('#4b5563')
            .text(invoice.info.razonSocial || '', leftMargin, currentLeftY);

        currentLeftY = doc.y + 1;

        // 3. RUC (Bold)
        doc.font('Helvetica-Bold')
            .fillColor('#4b5563')
            .text(`RUC: ${invoice.info.ruc}`, leftMargin, currentLeftY);

        currentLeftY = doc.y + 1;

        // 4. Matrix Address
        doc.font('Helvetica')
            .fillColor('#4b5563')
            .text(invoice.info.dirMatriz, leftMargin, currentLeftY, { width: 300, align: 'left' });

        currentLeftY = doc.y + 1;

        // 5. Business Email
        if (invoice.info.emailMatriz) {
            doc.text(invoice.info.emailMatriz, leftMargin, currentLeftY, { width: 300 });
            currentLeftY = doc.y;
        }

        // --- Right Information Column ---
        let currentRightY = topY;
        const rightColWidth = 250;
        const rightColX = rightMargin - rightColWidth;

        // 1. Ambiente
        doc.fillColor('#1f2937')
            .fontSize(9) // 10px -> 9pt - Adjusted
            .font('Helvetica')
            .text(`Ambiente: ${invoice.info.ambiente === '2' ? 'Producción' : 'Pruebas'}`, rightColX, currentRightY, { align: 'right', width: rightColWidth });

        currentRightY += 12;

        // 2. FACTURA N°
        doc.fontSize(12) // 16px -> 12pt approx
            .font('Helvetica-Bold')
            .text('FACTURA N°', rightColX, currentRightY, { align: 'right', width: rightColWidth });

        currentRightY += 15;

        // 3. Number
        doc.fontSize(12)
            .text(`${invoice.info.estab}-${invoice.info.ptoEmi}-${invoice.info.secuencial}`, rightColX, currentRightY, { align: 'right', width: rightColWidth });

        currentRightY += 20;

        // 4. Clave de Acceso Label
        doc.fontSize(8) // 10px -> 8pt
            .font('Helvetica-Bold')
            .text('CLAVE DE ACCESO:', rightColX, currentRightY, { align: 'right', width: rightColWidth });

        currentRightY += 10;

        // 5. Clave de Acceso Value
        doc.font('Courier')
            .fontSize(7)
            .text(invoice.info.claveAcceso || '', rightColX, currentRightY, { align: 'right', width: rightColWidth, characterSpacing: 0 });

        currentRightY += 12;

        // 6. Authorization Date Label
        doc.font('Helvetica-Bold')
            .fontSize(8)
            .text('FECHA Y HORA DE AUTORIZACIÓN:', rightColX, currentRightY, { align: 'right', width: rightColWidth });

        currentRightY += 10;

        // 7. Authorization Date Value
        // Format Authorization Date to 12h AM/PM
        const authDateText = this.formatDateTime(invoice.authorizationDate || invoice.info.fechaEmision);

        doc.font('Helvetica')
            .text(authDateText, rightColX, currentRightY, { align: 'right', width: rightColWidth });

        // Determine max Y for divider
        // We take the maximum of where the Left logic ended vs where the Right logic ended (doc.y)
        const headerBottomY = Math.max(currentLeftY, doc.y) + 10;
        this.generateHr(doc, headerBottomY);

        // CRITICAL: Move the cursor to below the HR line so the next section respects it
        doc.y = headerBottomY;
    }

    private generateCustomerInformation(doc: PDFKit.PDFDocument, invoice: Invoice): void {
        const startY = doc.y + 25;
        const boxHeight = 140;  // Reduced height back since we saved a row
        const boxWidth = 535;
        const boxX = 30;

        // Background box
        doc.rect(boxX, startY, boxWidth, boxHeight)
            .fillColor('#f9fafb')
            .fill();

        // Title
        doc.fillColor('#1f2937')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('Facturado a', boxX + 15, startY + 15);

        const col1X = boxX + 15;
        const col2X = 310;
        const colWidth = 250;

        let currentY = startY + 35;

        // Row 1: Cliente | RUC/CI
        this.drawClientField(doc, 'Cliente', invoice.info.razonSocialComprador, col1X, currentY, colWidth);
        this.drawClientField(doc, 'RUC / CI', invoice.info.identificacionComprador, col2X, currentY, colWidth);
        currentY += 25;

        // Row 2: Fecha | Teléfono
        // Format creationDate or fechaEmision to show time if available
        const fechaEmisionText = this.formatDateTime(invoice.creationDate || invoice.info.fechaEmision);

        this.drawClientField(doc, 'Fecha de Emisión', fechaEmisionText, col1X, currentY, colWidth);
        this.drawClientField(doc, 'Teléfono', invoice.info.telefonoComprador || 'S/N', col2X, currentY, colWidth);
        currentY += 25;

        // Row 3: Email | Forma de Pago (Moved here)
        this.drawClientField(doc, 'Email', invoice.info.emailComprador || 'S/N', col1X, currentY, colWidth);

        const paymentText = this.getPaymentMethodText(invoice.info.formaPago);
        this.drawClientField(doc, 'Forma de Pago', paymentText, col2X, currentY, colWidth);

        currentY += 25;

        // Row 4: Dirección (Full width)
        // Optional Separator before address? No, looks cleaner without if grid is balanced.
        this.drawClientField(doc, 'Dirección', invoice.info.direccionComprador || 'S/N', col1X, currentY, 500);

        // Update doc.y to end of box so next section flows correctly
        doc.y = startY + boxHeight;
    }

    private getPaymentMethodText(code?: string): string {
        switch (code) {
            case '01': return 'SIN SISTEMA FINANCIERO';
            case '19': return 'TARJETA DE CREDITO';
            case '20': return 'OTROS CON SISTEMA FINANCIERO';
            default: return 'EFECTIVO';
        }
    }

    private drawClientField(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number = 250) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#1f2937').text(label, x, y); // 10px -> 7-8pt
        doc.fontSize(9).font('Helvetica').text(value, x, y + 9, { width }); // 12px -> 9pt
    }

    private generateInvoiceTable(doc: PDFKit.PDFDocument, invoice: Invoice): void {
        const invoiceTableTop = doc.y + 20;

        const colQty = 50;
        const colDesc = 100;
        const colPrice = 380;
        const colTotal = 480;

        // Table Header
        doc.fillColor('#f9fafb')
            .rect(30, invoiceTableTop, 535, 20)
            .fill();

        doc.font('Helvetica-Bold').fontSize(8).fillColor('#1f2937'); // 10px -> 8pt
        doc.text('Cant.', colQty, invoiceTableTop + 6, { width: 50, align: 'center' });
        doc.text('Descripción', colDesc, invoiceTableTop + 6);
        doc.text('P. Unit', colPrice, invoiceTableTop + 6, { width: 80, align: 'right' });
        doc.text('Total', colTotal, invoiceTableTop + 6, { width: 85, align: 'right' });

        this.generateHr(doc, invoiceTableTop + 20);
        doc.font('Helvetica').fontSize(9); // 11px -> 9pt

        let position = invoiceTableTop + 30;

        const taxRate = parseFloat(invoice.info.tasaIva || '15') / 100;

        for (let i = 0; i < invoice.detalles.length; i++) {
            const item = invoice.detalles[i];

            if (position > 700) {
                doc.addPage();
                position = 50;
            }

            const taxValue = item.impuestos && item.impuestos.length > 0 ? item.impuestos[0].valor : 0;
            const displayUnitPrice = item.precioUnitario * (1 + taxRate);
            const displayTotal = item.precioTotalSinImpuesto + taxValue;

            doc.text(item.cantidad.toString(), colQty, position, { width: 50, align: 'center' });
            doc.text(item.descripcion, colDesc, position, { width: 260 });
            doc.text(`$${displayUnitPrice.toFixed(2)}`, colPrice, position, { width: 80, align: 'right' });
            doc.text(`$${displayTotal.toFixed(2)}`, colTotal, position, { width: 85, align: 'right' });

            position += 18; // Reduced row height slightly
        }

        this.generateHr(doc, position + 5);
        this.generateTotals(doc, position + 20, invoice);
    }

    private generateTotals(doc: PDFKit.PDFDocument, y: number, invoice: Invoice): void {
        const labelX = 350;
        const valueX = 480;
        const step = 12;

        doc.fontSize(9).font('Helvetica'); // 12px -> 9pt

        const drawTotalRow = (label: string, value: string, isBold: boolean = false) => {
            doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                .text(label, labelX, y, { width: 120, align: 'left' })
                .text(`$${value}`, valueX, y, { width: 85, align: 'right' });
            y += step;
        };

        const taxRate = invoice.info.tasaIva || '15';
        const ivaValue = invoice.info.importeTotal - invoice.info.totalSinImpuestos;

        drawTotalRow(`SUBTOTAL ${taxRate}%`, invoice.info.totalSinImpuestos.toFixed(2));
        drawTotalRow('SUBTOTAL 0%', '0.00');
        drawTotalRow('DESCUENTO', '0.00');
        drawTotalRow(`IVA ${taxRate}%`, ivaValue.toFixed(2));
        drawTotalRow('PROPINA', '0.00');

        y += 8;
        doc.fontSize(11); // 14px -> 11pt
        drawTotalRow('VALOR TOTAL', invoice.info.importeTotal.toFixed(2), true);
    }

    private generateFooter(doc: PDFKit.PDFDocument, invoice: Invoice): void {
        const bottomY = 730;

        doc.fontSize(8) // 10px -> 8pt
            .font('Helvetica')
            .fillColor('#4b5563')
            .text('Gracias por su compra', 30, bottomY, { align: 'left' });

        doc.text('Este documento es una representación impresa de un documento electrónico.', 30, bottomY + 12)
            .text('No tiene validez tributaria oficial hasta ser autorizado por el SRI.', 30, bottomY + 24);
    }

    private generateHr(doc: PDFKit.PDFDocument, y: number) {
        doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(30, y).lineTo(565, y).stroke();
    }

    private formatDateTime(input: string | Date | undefined): string {
        if (!input) return '';

        let d: Date;
        if (input instanceof Date) {
            d = input;
        } else {
            // Try SRI format: DD/MM/YYYY HH:mm:ss
            const sriPattern = /^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})$/;
            const match = input.match(sriPattern);
            if (match) {
                let hours = parseInt(match[4], 10);
                const ampm = hours >= 12 ? 'pm' : 'am';
                hours = hours % 12 || 12;
                return `${match[1]}/${match[2]}/${match[3]} ${hours.toString().padStart(2, '0')}:${match[5]} ${ampm}`;
            }
            d = new Date(input);
        }

        if (isNaN(d.getTime())) {
            // If it's just a date DD/MM/YYYY, return it as is
            return input instanceof Date ? '' : input;
        }

        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const mins = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12 || 12;

        return `${day}/${month}/${year} ${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
    }
}
