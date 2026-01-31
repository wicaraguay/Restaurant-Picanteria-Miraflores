import { Order, RestaurantConfig } from '../types';
import { generateAccessKey } from './sri';

export interface ClientData {
    identification: string;
    name: string;
    email: string;
    address: string;
    phone: string;
    paymentMethod?: string;
}

const getPaymentMethodText = (code?: string) => {
    switch (code) {
        case '01': return 'SIN SISTEMA FINANCIERO';
        case '19': return 'TARJETA DE CREDITO';
        case '20': return 'OTROS CON SISTEMA FINANCIERO';
        default: return 'EFECTIVO';
    }
};

export const generateInvoiceHtml = (
    order: Order,
    config: RestaurantConfig,
    client: ClientData,
    accessKeyOverride?: string,
    authorizationDate?: string
): string => {
    const taxRate = config.billing?.taxRate || 15;
    const total = order.items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
    const subtotal = total / (1 + (taxRate / 100));
    const tax = total - subtotal;
    // Helper for safe strings
    const safeStr = (str?: string) => str || '';

    const formatDateTime = (input: string | Date | undefined): string => {
        if (!input) return '';
        let d: Date;
        if (input instanceof Date) {
            d = input;
        } else {
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
        if (isNaN(d.getTime())) return input instanceof Date ? '' : input;
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const mins = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12 || 12;
        return `${day}/${month}/${year} ${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
    };

    const date = formatDateTime(authorizationDate || new Date());
    const orderNumber = (order.orderNumber || order.id.slice(-6)).toString().padStart(9, '0');

    // Generate Access Key OR use override
    const now = new Date();
    const accessKey = accessKeyOverride || generateAccessKey(
        now,
        '01', // Factura
        config.ruc,
        (config.billing?.environment as '1' | '2') || '1',
        config.billing?.establishment || '001',
        config.billing?.emissionPoint || '001',
        orderNumber, // sequential
        '12345678' // numeric code (static for view, normally dynamic)
    );

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Factura ${orderNumber}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            
            * {
                box-sizing: border-box;
            }

            body {
                font-family: 'Helvetica', 'Arial', sans-serif;
                background: #f5f5f5;
                margin: 0;
                padding: 30px;
                color: #1f2937;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                font-size: 11px;
            }

            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 30px;
                border-radius: 4px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid #e5e7eb;
            }

            .logo {
                max-height: 150px;
                max-width: 350px;
                object-fit: contain;
                margin-bottom: 15px;
            }

            .company-info h1 {
                font-size: 16px;
                font-weight: 700;
                margin: 0 0 5px 0;
                color: #111827;
                text-transform: uppercase;
            }

            .company-info p {
                margin: 2px 0;
                font-size: 9px;
                color: #4b5563;
                line-height: 1.4;
            }

            .invoice-tag {
                padding: 4px 8px;
                font-size: 9px;
                margin-bottom: 8px;
                display: inline-block;
            }

            .invoice-number {
                font-size: 14px;
                font-weight: 700;
                margin: 0 0 5px 0;
            }

            .bill-to {
                margin-bottom: 30px;
                padding: 15px;
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 4px;
            }

            .bill-to h3 {
                font-size: 9px;
                font-weight: 700;
                margin: 0 0 15px 0;
                text-transform: uppercase;
                color: #1f2937;
            }

            .client-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px 30px;
            }

            .client-item strong {
                display: block;
                font-size: 8px;
                font-weight: 700;
                margin-bottom: 3px;
                text-transform: uppercase;
                color: #4b5563;
            }

            .client-item span {
                font-size: 10px;
                color: #111827;
            }

            table {
                width: 100%;
                margin-bottom: 30px;
                border-collapse: collapse;
            }

            th {
                padding: 8px 10px;
                font-size: 9px;
                font-weight: 700;
                background-color: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
                text-transform: uppercase;
                color: #4b5563;
            }

            td {
                padding: 12px 10px;
                font-size: 10px;
                vertical-align: top;
                border-bottom: 1px solid #f3f4f6;
            }

            .col-qty { width: 10%; text-align: center; }
            .col-desc { width: 50%; text-align: left; }
            .col-price { width: 20%; text-align: right; }
            .col-total { width: 20%; text-align: right; font-weight: 700; }

            .totals-container {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                margin-bottom: 30px;
            }
            
            .totals-table {
                width: 240px;
                border-collapse: collapse;
            }

            .totals-table td {
                padding: 4px 0;
                font-size: 10px;
                color: #4b5563;
                border-bottom: none;
            }

            .totals-table td:last-child {
                text-align: right;
                font-weight: 700;
                color: #111827;
                width: 100px;
            }

            .totals-row-final td {
                font-size: 13px;
                padding-top: 10px !important;
                margin-top: 10px;
                border-top: 2px solid #e5e7eb;
                color: #111827 !important;
                font-weight: 700 !important;
            }

            .footer {
                padding-top: 20px;
                font-size: 9px;
                color: #6b7280;
                line-height: 1.5;
            }

            @media print {
                body {
                    padding: 0;
                    margin: 0;
                    font-size: 11px;
                }
                .invoice-container {
                    width: 100%;
                    max-width: none;
                    padding: 10px;
                    border-radius: 0;
                    box-shadow: none;
                    margin: 0;
                }
                .header, .bill-to, table, .totals-container {
                    margin-bottom: 15px;
                }
                td, th {
                    padding: 4px 2px;
                }
                /* Hide URL/Page info if possible via browser settings, but CSS can't force it */
            }

            /* Responsive design for 80mm thermal printers or small screens */
            @media (max-width: 80mm), (max-width: 480px), print and (max-width: 400px) {
                body {
                    padding: 0;
                    font-size: 10px;
                }
                .invoice-container {
                    padding: 5px;
                    border: none;
                }
                
                /* Header: Centered for Logo/Title */
                .header {
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    margin-bottom: 10px;
                    border-bottom: 1px dashed #000;
                    padding-bottom: 10px;
                }
                .logo-section {
                    margin-bottom: 5px;
                    width: 100%;
                }
                .logo {
                    max-height: 100px;
                    max-width: 100%;
                    margin-bottom: 5px;
                }
                .company-info h1 {
                    font-size: 14px;
                }
                .company-info p {
                    font-size: 9px;
                }
                
                .invoice-details {
                    text-align: center;
                    width: 100%;
                    margin-top: 5px;
                }
                .access-key-section {
                    text-align: center !important; /* Force center for thermal */
                    margin-top: 10px;
                }
                
                /* Bill To: Left Aligned, Compact */
                .bill-to {
                    padding: 5px 0;
                    background: transparent;
                    border-bottom: 1px dashed #000;
                    border-radius: 0;
                    margin-bottom: 10px;
                }
                .client-grid {
                    grid-template-columns: 1fr;
                    gap: 4px;
                }
                .client-item {
                    grid-column: span 1 !important;
                    display: flex;
                    justify-content: space-between; /* Label - Value on same line if fits */
                }
                .client-item strong {
                    margin-right: 5px;
                }

                /* Table: Compact & Adapted */
                table {
                    font-size: 10px;
                    margin-bottom: 10px;
                    border-collapse: collapse;
                }
                th {
                    font-size: 9px;
                    background: transparent;
                    border-bottom: 1px dashed #000;
                    padding: 2px 0;
                    font-weight: bold;
                    color: #000;
                }
                td {
                    padding: 4px 0;
                    border-bottom: none; /* No lines between items for clean thermal look */
                }
                
                /* Specific widths for 80mm */
                .col-qty { width: 10%; text-align: center; }
                .col-desc { width: 45%; } /* Less space for desc */
                .col-price { width: 20%; }
                .col-total { width: 25%; }
                
                /* Ensure long names don't break layout */
                .item-name {
                    overflow: hidden; 
                    text-overflow: ellipsis;
                }
                
                /* Totals: Full Width, Right Aligned values */
                .totals-container {
                    display: block;
                    width: 100%;
                }
                .totals-table {
                    width: 100%;
                }
                .totals-table td:last-child {
                    width: auto;
                }
                .totals-row {
                    padding: 2px 0;
                    font-size: 10px;
                }
                .totals-row span:first-child {
                    font-weight: 600;
                }

                .footer {
                    margin-top: 10px;
                    border-top: 1px dashed #000;
                }
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <header class="header">
                <div class="logo-section">
                    ${config.fiscalLogo || config.logo ? `<img src="${config.fiscalLogo || config.logo}" class="logo" alt="Logo" />` : ''}
                    <div class="company-info">
                        <h1>${safeStr(config.name)}</h1>
                        <p>${safeStr(config.businessName)}</p>
                        <p><strong>RUC:</strong> ${safeStr(config.ruc)}</p>
                        <p>${safeStr(config.address)}</p>
                        ${(config.fiscalEmail || config.email) ? `<p>${config.fiscalEmail || config.email}</p>` : ''}
                    </div>
                </div>
                <div class="invoice-details">
                    <span class="invoice-tag">Ambiente: ${config.billing?.environment === '2' ? 'Producción' : 'Pruebas'}</span>
                    <h2 class="invoice-number">FACTURA N° <br/>001-001-${orderNumber}</h2>
                    <div class="access-key-section" style="margin-top: 10px; font-size: 10px; text-align: right;">
                        <p style="margin: 0; font-weight: bold;">CLAVE DE ACCESO:</p>
                        <p style="margin: 0; font-family: monospace; letter-spacing: 1px;">${accessKey}</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold;">FECHA Y HORA DE AUTORIZACIÓN:</p>
                        <p style="margin: 0;">${date}</p>
                    </div>
                </div>
            </header>

            <section class="bill-to">
                <h3>Información del Cliente</h3>
                <div class="client-grid">
                    <div class="client-item">
                        <strong>Cliente</strong>
                        <span>${client.name || 'CONSUMIDOR FINAL'}</span>
                    </div>
                    <div class="client-item">
                        <strong>RUC / CI</strong>
                        <span>${client.identification || '9999999999999'}</span>
                    </div>
                    
                    <div class="client-item">
                        <strong>Fecha de Emisión</strong>
                        <span>${date}</span>
                    </div>
                    <div class="client-item">
                        <strong>Teléfono</strong>
                        <span>${client.phone || 'S/N'}</span>
                    </div>

                    <div class="client-item">
                        <strong>Email</strong>
                        <span>${client.email || 'S/N'}</span>
                    </div>

                    <div class="client-item">
                        <strong>Forma de Pago</strong>
                        <span>${getPaymentMethodText(client.paymentMethod)}</span>
                    </div>

                    <div class="client-item" style="grid-column: span 2;">
                        <strong>Dirección</strong>
                        <span>${client.address || 'S/N'}</span>
                    </div>
                </div>
            </section>

            <table>
                <thead>
                    <tr>
                        <th class="col-qty">Cant.</th>
                        <th class="col-desc">Descripción</th>
                        <th class="col-price">P. Unit</th>
                        <th class="col-total">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                    <tr>
                        <td class="col-qty">${item.quantity}</td>
                        <td class="col-desc item-name">${item.name}</td>
                        <td class="col-price">$${(item.price || 0).toFixed(2)}</td>
                        <td class="col-total">$${((item.price || 0) * item.quantity).toFixed(2)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals-container">
                <table class="totals-table">
                    <tr>
                        <td>SUBTOTAL ${taxRate}%</td>
                        <td>$${subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>SUBTOTAL 0%</td>
                        <td>$0.00</td>
                    </tr>
                    <tr>
                        <td>DESCUENTO</td>
                        <td>$0.00</td>
                    </tr>
                    <tr>
                        <td>IVA ${taxRate}%</td>
                        <td>$${tax.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>PROPINA</td>
                        <td>$0.00</td>
                    </tr>
                    <tr class="totals-row-final">
                        <td>VALOR TOTAL</td>
                        <td>$${total.toFixed(2)}</td>
                    </tr>
                </table>
            </div>

            <footer class="footer">
                <p>Gracias por su compra</p>
                <p>Este documento es una representación impresa de un documento electrónico.<br/>No tiene validez tributaria oficial hasta ser autorizado por el SRI.</p>
            </footer>
        </div>
        
        <script>
            window.onload = function() { // Wait for images to load
                 setTimeout(function() {
                    window.print();
                    // window.close(); // Optional: close after print
                 }, 500); 
            }
        </script>
    </body>
    </html>
    `;
};
