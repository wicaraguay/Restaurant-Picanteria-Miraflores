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
import { logger } from '../../../infrastructure/utils/Logger';

export class ExportController {
    constructor(
        private menuRepository: IMenuRepository,
        private customerRepository: ICustomerRepository,
        private billRepository: IBillRepository,
        private orderRepository: IOrderRepository
    ) {}

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
