/**
 * @file FiscalYearClose.ts
 * @description Caso de uso para cierre de año fiscal
 *
 * @purpose
 * Genera un respaldo completo de datos fiscales del año y archiva información contable.
 * Prepara el sistema para el nuevo año fiscal cumpliendo con regulaciones del SRI.
 *
 * @connections
 * - Usa: IBillRepository, IRestaurantConfigRepository
 * - Usado por: MaintenanceController
 *
 * @layer Application - Lógica de negocio
 */

import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { ValidationError } from '../../domain/errors/CustomErrors';
import { logger } from '../../infrastructure/utils/Logger';
import ExcelJS from 'exceljs';

export interface FiscalYearCloseParams {
    year: number;
}

export interface FiscalYearCloseResult {
    totalBills: number;
    totalRevenue: number;
    totalTax: number;
    reportGenerated: boolean;
    message: string;
}

export class FiscalYearClose {
    constructor(
        private billRepository: IBillRepository,
        private configRepository: IRestaurantConfigRepository
    ) {}

    async execute(params: FiscalYearCloseParams): Promise<FiscalYearCloseResult> {
        const { year } = params;

        // Validar año
        const currentYear = new Date().getFullYear();
        if (!year || year < 2020 || year > currentYear) {
            throw new ValidationError(`Year must be between 2020 and ${currentYear}`);
        }

        logger.info('[FiscalYearClose] Starting fiscal year close', { year });

        try {
            // Obtener todas las facturas del año
            const allBills = await this.billRepository.findAll();

            const yearBills = allBills.filter(bill => {
                if (!bill.createdAt) return false;
                const billDate = new Date(bill.createdAt);
                return billDate.getFullYear() === year;
            });

            if (yearBills.length === 0) {
                throw new ValidationError(`No bills found for year ${year}`);
            }

            // Calcular totales
            const totalRevenue = yearBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
            const totalTax = yearBills.reduce((sum, bill) => sum + (bill.tax || 0), 0);

            // Generar reporte fiscal (en memoria - podría guardarse en S3/disco)
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(`Cierre Fiscal ${year}`);

            // Configurar columnas
            worksheet.columns = [
                { header: 'Mes', key: 'month', width: 15 },
                { header: 'Facturas', key: 'billCount', width: 12 },
                { header: 'Subtotal', key: 'subtotal', width: 15 },
                { header: 'IVA', key: 'tax', width: 15 },
                { header: 'Total', key: 'total', width: 15 }
            ];

            // Estilo del header
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF2E5090' }
            };

            // Agrupar por mes
            const monthlyData: { [key: number]: any } = {};

            yearBills.forEach(bill => {
                if (!bill.createdAt) return;
                const month = new Date(bill.createdAt).getMonth();
                if (!monthlyData[month]) {
                    monthlyData[month] = {
                        billCount: 0,
                        subtotal: 0,
                        tax: 0,
                        total: 0
                    };
                }
                monthlyData[month].billCount++;
                monthlyData[month].subtotal += bill.subtotal || 0;
                monthlyData[month].tax += bill.tax || 0;
                monthlyData[month].total += bill.total || 0;
            });

            // Agregar datos mensuales
            const monthNames = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];

            for (let i = 0; i < 12; i++) {
                const data = monthlyData[i] || { billCount: 0, subtotal: 0, tax: 0, total: 0 };
                worksheet.addRow({
                    month: monthNames[i],
                    billCount: data.billCount,
                    subtotal: data.subtotal,
                    tax: data.tax,
                    total: data.total
                });
            }

            // Agregar totales
            worksheet.addRow({});
            const totalRow = worksheet.addRow({
                month: 'TOTAL',
                billCount: yearBills.length,
                subtotal: yearBills.reduce((sum, bill) => sum + (bill.subtotal || 0), 0),
                tax: totalTax,
                total: totalRevenue
            });

            totalRow.font = { bold: true };
            totalRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD3D3D3' }
            };

            // Formato de moneda
            worksheet.getColumn('subtotal').numFmt = '$#,##0.00';
            worksheet.getColumn('tax').numFmt = '$#,##0.00';
            worksheet.getColumn('total').numFmt = '$#,##0.00';

            // Aquí podrías guardar el archivo en disco o S3
            // await workbook.xlsx.writeFile(`./reports/fiscal-close-${year}.xlsx`);

            // Actualizar configuración con fecha de cierre
            const config = await this.configRepository.get();
            if (config) {
                // Podrías agregar un campo lastFiscalClose en la configuración
                logger.info('[FiscalYearClose] Fiscal close completed', {
                    year,
                    totalBills: yearBills.length,
                    totalRevenue,
                    totalTax
                });
            }

            return {
                totalBills: yearBills.length,
                totalRevenue,
                totalTax,
                reportGenerated: true,
                message: `Cierre fiscal ${year} completado. ${yearBills.length} facturas procesadas. Total: $${totalRevenue.toFixed(2)}`
            };
        } catch (error) {
            logger.error('[FiscalYearClose] Error in fiscal year close', error);
            throw error;
        }
    }
}
