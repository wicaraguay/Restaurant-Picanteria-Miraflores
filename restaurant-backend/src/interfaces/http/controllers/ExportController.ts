/**
 * @file ExportController.ts
 * @description Controlador para exportación de datos (Excel/CSV)
 *
 * @purpose
 * Permite a los usuarios exportar datos de su restaurante en formatos Excel y CSV
 * para análisis, respaldos o cumplimiento fiscal.
 *
 * @connections
 * - Usa: IProductRepository, IClientRepository, IBillRepository, IOrderRepository
 * - Usado por: exportRoutes
 *
 * @layer Infrastructure - HTTP Controllers
 */

import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { IMenuRepository } from '../../../domain/repositories/IMenuRepository';
import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';
import { IBillRepository } from '../../../domain/repositories/IBillRepository';
import { IOrderRepository } from '../../../domain/repositories/IOrderRepository';
import { ICreditNoteRepository } from '../../../domain/repositories/ICreditNoteRepository';
import { IRestaurantConfigRepository } from '../../../domain/repositories/IRestaurantConfigRepository';
import { logger } from '../../../infrastructure/utils/Logger';

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Desglose de un documento por tarifa de IVA a partir de sus ítems */
interface TaxBreakdown {
    base0: number;
    base15: number;
    iva: number;
    total: number;
}

/**
 * Calcula base 0%, base gravada e IVA desde los ítems del documento.
 * Los precios del sistema INCLUYEN IVA (total-driven): la base se extrae del total.
 */
export function computeBreakdown(items: any[]): TaxBreakdown {
    let base0 = 0, base15 = 0, iva = 0;

    for (const item of items || []) {
        const totalInclusive = (item.total !== undefined && item.total !== null)
            ? item.total
            : (item.price || 0) * (item.quantity || 1);
        const rate = (item.taxRate !== undefined && item.taxRate !== null) ? item.taxRate : 15;

        if (rate === 0) {
            base0 += totalInclusive;
        } else {
            const base = totalInclusive / (1 + rate / 100);
            base15 += base;
            iva += totalInclusive - base;
        }
    }

    return { base0: r2(base0), base15: r2(base15), iva: r2(iva), total: r2(base0 + base15 + iva) };
}

/** Mes de un documento en zona horaria Ecuador ('YYYY-MM') — el día fiscal es el ecuatoriano */
export function monthKeyEcuador(dateStr: string | Date): string {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    // GOTCHA Intl: si se pide solo año+mes, el 'month: 2-digit' se IGNORA y sale
    // sin cero ('2026-7') — incluir day fuerza el patrón completo con padding.
    // padStart de respaldo por si algún runtime/locale igual lo devuelve sin cero.
    const parts = new Intl.DateTimeFormat('es-EC', {
        timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(d);
    const y = parts.find(p => p.type === 'year')?.value || '';
    const m = parts.find(p => p.type === 'month')?.value || '';
    return `${y}-${m.padStart(2, '0')}`;
}

/** Fecha corta en zona Ecuador (dd/mm/yyyy) */
function dateEcuador(dateStr: string | Date): string {
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('es-EC', {
        timeZone: 'America/Guayaquil', day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(d);
}

export class ExportController {
    constructor(
        private menuRepository: IMenuRepository,
        private customerRepository: ICustomerRepository,
        private billRepository: IBillRepository,
        private orderRepository: IOrderRepository,
        private creditNoteRepository?: ICreditNoteRepository,
        private configRepository?: IRestaurantConfigRepository
    ) {}

    /**
     * Reporte Mensual para Declaración (Formulario 104 — IVA Ecuador).
     * GET /api/export/tax-report?month=MM&year=YYYY
     *
     * Excel con 3 hojas:
     *  1. Resumen — los números netos que van al formulario
     *  2. Facturas AUTORIZADAS del mes con desglose base 0% / base gravada / IVA
     *  3. Notas de crédito AUTORIZADAS del mes (restan)
     *
     * Solo incluye documentos del AMBIENTE ACTIVO del sistema (pruebas o
     * producción) — jamás mezcla comprobantes de prueba en una declaración.
     */
    async exportTaxReport(req: Request, res: Response): Promise<void> {
        try {
            const month = parseInt(req.query.month as string, 10);
            const year = parseInt(req.query.year as string, 10);

            if (!month || month < 1 || month > 12 || !year || year < 2020 || year > 2100) {
                res.status(400).json({ error: 'Parámetros inválidos: se requiere month (1-12) y year' });
                return;
            }

            const targetKey = `${year}-${month.toString().padStart(2, '0')}`;
            const environment = this.configRepository ? await this.configRepository.getEnvironment() : '1';
            const envLabel = environment === '2' ? 'PRODUCCIÓN' : 'PRUEBAS';
            const isProd = environment === '2';

            // Facturas AUTORIZADAS del mes (cualquier ambiente) — para diagnóstico
            const allBills = await this.billRepository.findAll();
            const authorizedBillsInMonth = allBills.filter((b: any) =>
                b.sriStatus === 'AUTORIZADO' &&
                monthKeyEcuador(b.date || b.createdAt) === targetKey
            );
            // Solo las del AMBIENTE ACTIVO entran al reporte (jamás mezclar pruebas/producción)
            const bills = authorizedBillsInMonth.filter((b: any) =>
                isProd ? b.environment === '2' : b.environment !== '2'
            ).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const billsExcludedByEnv = authorizedBillsInMonth.length - bills.length;

            // Notas de crédito AUTORIZADAS del mes, del ambiente activo
            // (la interfaz expone findPaginated; a escala de restaurante una página de 100 basta)
            const allCreditNotes = this.creditNoteRepository
                ? (await this.creditNoteRepository.findPaginated(1, 100, { sriStatus: 'AUTORIZADO' }, { createdAt: -1 })).data
                : [];
            const authorizedNCInMonth = allCreditNotes.filter((cn: any) =>
                cn.sriStatus === 'AUTORIZADO' &&
                monthKeyEcuador(cn.date || cn.createdAt) === targetKey
            );
            const creditNotes = authorizedNCInMonth.filter((cn: any) =>
                isProd ? cn.environment === '2' : cn.environment !== '2'
            ).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const ncExcludedByEnv = authorizedNCInMonth.length - creditNotes.length;

            logger.info('[ExportController] Tax report filter', {
                period: targetKey,
                environment: envLabel,
                billsIncluded: bills.length,
                billsExcludedByEnv,
                ncIncluded: creditNotes.length,
                ncExcludedByEnv
            });

            const workbook = new ExcelJS.Workbook();
            const headerStyle = (row: ExcelJS.Row) => {
                row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
            };
            const moneyCols = (ws: ExcelJS.Worksheet, keys: string[]) =>
                keys.forEach(k => { ws.getColumn(k).numFmt = '$#,##0.00'; });

            // ── Hoja 1: Resumen (creada primero para que abra el Excel; se llena al final) ──
            const wsSummary = workbook.addWorksheet('Resumen');
            wsSummary.columns = [
                { header: 'Concepto', key: 'concept', width: 45 },
                { header: 'Valor', key: 'value', width: 16 }
            ];
            headerStyle(wsSummary.getRow(1));

            // ── Hoja 2: Facturas ─────────────────────────────────────────────
            const wsBills = workbook.addWorksheet('Facturas');
            wsBills.columns = [
                { header: 'Fecha', key: 'date', width: 12 },
                { header: 'Número', key: 'number', width: 20 },
                { header: 'Cliente', key: 'client', width: 30 },
                { header: 'RUC/CI', key: 'identification', width: 15 },
                { header: 'Base 0%', key: 'base0', width: 12 },
                { header: 'Base Gravada', key: 'base15', width: 14 },
                { header: 'IVA', key: 'iva', width: 12 },
                { header: 'Total', key: 'total', width: 12 }
            ];
            headerStyle(wsBills.getRow(1));

            const billTotals = { base0: 0, base15: 0, iva: 0, total: 0 };
            for (const bill of bills as any[]) {
                const bd = computeBreakdown(bill.items);
                billTotals.base0 += bd.base0;
                billTotals.base15 += bd.base15;
                billTotals.iva += bd.iva;
                billTotals.total += bd.total;
                wsBills.addRow({
                    date: dateEcuador(bill.date || bill.createdAt),
                    number: bill.documentNumber,
                    client: bill.customerName,
                    identification: bill.customerIdentification,
                    base0: bd.base0, base15: bd.base15, iva: bd.iva, total: bd.total
                });
            }
            const billTotalRow = wsBills.addRow({
                client: 'TOTALES',
                base0: r2(billTotals.base0), base15: r2(billTotals.base15),
                iva: r2(billTotals.iva), total: r2(billTotals.total)
            });
            billTotalRow.font = { bold: true };
            moneyCols(wsBills, ['base0', 'base15', 'iva', 'total']);

            // ── Hoja 3: Notas de Crédito ─────────────────────────────────────
            const wsNC = workbook.addWorksheet('Notas de Crédito');
            wsNC.columns = [
                { header: 'Fecha', key: 'date', width: 12 },
                { header: 'Número', key: 'number', width: 20 },
                { header: 'Cliente', key: 'client', width: 30 },
                { header: 'RUC/CI', key: 'identification', width: 15 },
                { header: 'Base 0%', key: 'base0', width: 12 },
                { header: 'Base Gravada', key: 'base15', width: 14 },
                { header: 'IVA', key: 'iva', width: 12 },
                { header: 'Total', key: 'total', width: 12 }
            ];
            headerStyle(wsNC.getRow(1));

            const ncTotals = { base0: 0, base15: 0, iva: 0, total: 0 };
            for (const cn of creditNotes as any[]) {
                const bd = computeBreakdown(cn.items);
                ncTotals.base0 += bd.base0;
                ncTotals.base15 += bd.base15;
                ncTotals.iva += bd.iva;
                ncTotals.total += bd.total;
                wsNC.addRow({
                    date: dateEcuador(cn.date || cn.createdAt),
                    number: cn.documentNumber,
                    client: cn.customerName,
                    identification: cn.customerIdentification,
                    base0: bd.base0, base15: bd.base15, iva: bd.iva, total: bd.total
                });
            }
            const ncTotalRow = wsNC.addRow({
                client: 'TOTALES',
                base0: r2(ncTotals.base0), base15: r2(ncTotals.base15),
                iva: r2(ncTotals.iva), total: r2(ncTotals.total)
            });
            ncTotalRow.font = { bold: true };
            moneyCols(wsNC, ['base0', 'base15', 'iva', 'total']);

            // ── Llenar la hoja Resumen (ya creada al inicio) ─────────────────
            const net = {
                base0: r2(billTotals.base0 - ncTotals.base0),
                base15: r2(billTotals.base15 - ncTotals.base15),
                iva: r2(billTotals.iva - ncTotals.iva)
            };

            const monthName = new Intl.DateTimeFormat('es-EC', { month: 'long' }).format(new Date(year, month - 1, 15));
            wsSummary.addRow({ concept: `REPORTE MENSUAL — ${monthName.toUpperCase()} ${year} (ambiente: ${envLabel})`, value: '' }).font = { bold: true };
            wsSummary.addRow({ concept: `Facturas autorizadas: ${bills.length} · Notas de crédito autorizadas: ${creditNotes.length}`, value: '' });
            if (billsExcludedByEnv > 0 || ncExcludedByEnv > 0) {
                const warnRow = wsSummary.addRow({
                    concept: `⚠️ Excluidos por pertenecer a OTRO ambiente: ${billsExcludedByEnv} factura(s), ${ncExcludedByEnv} NC — este reporte solo incluye ${envLabel}`,
                    value: ''
                });
                warnRow.font = { bold: true, color: { argb: 'FFB45309' } };
            }
            wsSummary.addRow({ concept: '', value: '' });
            wsSummary.addRow({ concept: 'VENTAS (facturas autorizadas)', value: '' }).font = { bold: true };
            wsSummary.addRow({ concept: 'Ventas tarifa 0% (base imponible)', value: r2(billTotals.base0) });
            wsSummary.addRow({ concept: 'Ventas tarifa gravada (base imponible)', value: r2(billTotals.base15) });
            wsSummary.addRow({ concept: 'IVA generado en ventas', value: r2(billTotals.iva) });
            wsSummary.addRow({ concept: '', value: '' });
            wsSummary.addRow({ concept: 'NOTAS DE CRÉDITO (restan)', value: '' }).font = { bold: true };
            wsSummary.addRow({ concept: 'NC tarifa 0% (base imponible)', value: r2(ncTotals.base0) });
            wsSummary.addRow({ concept: 'NC tarifa gravada (base imponible)', value: r2(ncTotals.base15) });
            wsSummary.addRow({ concept: 'IVA en notas de crédito', value: r2(ncTotals.iva) });
            wsSummary.addRow({ concept: '', value: '' });
            const netTitle = wsSummary.addRow({ concept: 'NETOS PARA DECLARACIÓN (Formulario 104)', value: '' });
            netTitle.font = { bold: true };
            wsSummary.addRow({ concept: 'Ventas netas tarifa 0%', value: net.base0 }).font = { bold: true };
            wsSummary.addRow({ concept: 'Ventas netas tarifa gravada', value: net.base15 }).font = { bold: true };
            wsSummary.addRow({ concept: 'IVA neto en ventas', value: net.iva }).font = { bold: true };
            wsSummary.getColumn('value').numFmt = '$#,##0.00';

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=declaracion-104-${targetKey}.xlsx`);
            await workbook.xlsx.write(res);
            res.end();

            logger.info('[ExportController] Tax report exported', {
                period: targetKey, environment: envLabel, bills: bills.length, creditNotes: creditNotes.length
            });
        } catch (error) {
            logger.error('[ExportController] Error exporting tax report', error);
            res.status(500).json({ error: 'Error al generar el reporte mensual' });
        }
    }

    /**
     * Exporta el menú completo con categorías, precios e ingredientes en Excel
     */
    async exportMenu(req: Request, res: Response): Promise<void> {
        try {
            const products = await this.menuRepository.findAll();

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Menú Completo');

            // Configurar columnas
            worksheet.columns = [
                { header: 'Categoría', key: 'category', width: 20 },
                { header: 'Nombre', key: 'name', width: 30 },
                { header: 'Precio', key: 'price', width: 12 },
                { header: 'Descripción', key: 'description', width: 40 },
                { header: 'IVA %', key: 'taxRate', width: 10 },
                { header: 'Estado', key: 'status', width: 12 }
            ];

            // Estilo del header
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };

            // Agregar datos
            products.forEach(product => {
                worksheet.addRow({
                    category: product.category,
                    name: product.name,
                    price: product.price,
                    description: product.description || '',
                    taxRate: product.taxRate || 15,
                    status: product.available ? 'Disponible' : 'No Disponible'
                });
            });

            // Auto-ajustar columnas
            worksheet.columns.forEach(column => {
                if (column.header) {
                    column.alignment = { vertical: 'middle', horizontal: 'left' };
                }
            });

            // Enviar archivo
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=menu-${Date.now()}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();

            logger.info('[ExportController] Menu exported successfully', {
                totalProducts: products.length
            });
        } catch (error) {
            logger.error('[ExportController] Error exporting menu', error);
            res.status(500).json({ error: 'Error al exportar el menú' });
        }
    }

    /**
     * Exporta la base de clientes en CSV
     */
    async exportClients(req: Request, res: Response): Promise<void> {
        try {
            const clients = await this.customerRepository.findAll();

            // Generar CSV
            const csvHeader = 'Nombre,Email,Teléfono,Dirección,Última Visita,Puntos Lealtad\n';
            const csvRows = clients.map(client => {
                return [
                    client.name || '',
                    client.email || '',
                    client.phone || '',
                    client.address || '',
                    client.lastVisit ? new Date(client.lastVisit).toLocaleDateString('es-EC') : '',
                    client.loyaltyPoints?.toString() || '0'
                ].map(field => `"${field}"`).join(',');
            }).join('\n');

            const csvContent = csvHeader + csvRows;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=clientes-${Date.now()}.csv`);
            res.send('\ufeff' + csvContent); // UTF-8 BOM for Excel compatibility

            logger.info('[ExportController] Clients exported successfully', {
                totalClients: clients.length
            });
        } catch (error) {
            logger.error('[ExportController] Error exporting clients', error);
            res.status(500).json({ error: 'Error al exportar clientes' });
        }
    }

    /**
     * Exporta facturas con detalle completo en Excel
     */
    async exportBills(req: Request, res: Response): Promise<void> {
        try {
            const bills = await this.billRepository.findAll();

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Facturas');

            // Configurar columnas
            worksheet.columns = [
                { header: 'Número', key: 'number', width: 20 },
                { header: 'Cliente', key: 'client', width: 30 },
                { header: 'Fecha', key: 'date', width: 15 },
                { header: 'Subtotal', key: 'subtotal', width: 12 },
                { header: 'IVA', key: 'tax', width: 12 },
                { header: 'Total', key: 'total', width: 12 },
                { header: 'Estado SRI', key: 'sriStatus', width: 15 },
                { header: 'Método Pago', key: 'paymentMethod', width: 15 }
            ];

            // Estilo del header
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF70AD47' }
            };

            // Agregar datos
            bills.forEach(bill => {
                worksheet.addRow({
                    number: bill.documentNumber || 'N/A',
                    client: bill.customerName || 'Cliente General',
                    date: bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('es-EC') : '',
                    subtotal: bill.subtotal || 0,
                    tax: bill.tax || 0,
                    total: bill.total || 0,
                    sriStatus: bill.sriStatus || 'Pendiente',
                    paymentMethod: bill.paymentMethod || 'Efectivo'
                });
            });

            // Formato de moneda
            worksheet.getColumn('subtotal').numFmt = '$#,##0.00';
            worksheet.getColumn('tax').numFmt = '$#,##0.00';
            worksheet.getColumn('total').numFmt = '$#,##0.00';

            // Enviar archivo
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=facturas-${Date.now()}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();

            logger.info('[ExportController] Bills exported successfully', {
                totalBills: bills.length
            });
        } catch (error) {
            logger.error('[ExportController] Error exporting bills', error);
            res.status(500).json({ error: 'Error al exportar facturas' });
        }
    }

    /**
     * Exporta órdenes de cocina en CSV
     */
    async exportOrders(req: Request, res: Response): Promise<void> {
        try {
            const orders = await this.orderRepository.findAll();

            // Generar CSV
            const csvHeader = 'Número Orden,Cliente,Tipo,Estado,Items,Fecha\n';
            const csvRows = orders.map(order => {
                const itemsNames = order.items?.map(item => item.name).join('; ') || '';

                return [
                    order.orderNumber || '',
                    order.customerName || '',
                    order.type || '',
                    order.status || '',
                    itemsNames,
                    order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-EC') : ''
                ].map(field => `"${field}"`).join(',');
            }).join('\n');

            const csvContent = csvHeader + csvRows;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=ordenes-${Date.now()}.csv`);
            res.send('\ufeff' + csvContent);

            logger.info('[ExportController] Orders exported successfully', {
                totalOrders: orders.length
            });
        } catch (error) {
            logger.error('[ExportController] Error exporting orders', error);
            res.status(500).json({ error: 'Error al exportar órdenes' });
        }
    }
}
