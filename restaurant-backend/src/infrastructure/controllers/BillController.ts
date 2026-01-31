import { Request, Response, NextFunction } from 'express';
import { CreateBill } from '../../application/use-cases/CreateBill';
import { GetBills } from '../../application/use-cases/GetBills';
import { DeleteBill } from '../../application/use-cases/DeleteBill';
import { ResetBillingSystem } from '../../application/use-cases/ResetBillingSystem';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';
import { PDFService } from '../services/PDFService';
import { RestaurantConfigModel } from '../database/schemas/RestaurantConfigSchema';

export class BillController {
    constructor(
        private createBill: CreateBill,
        private getBills: GetBills,
        private deleteBill: DeleteBill,
        private resetBillingSystem: ResetBillingSystem,
    ) { }

    public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;

            const filter: any = {};
            if (req.query.documentNumber) filter.documentNumber = req.query.documentNumber;
            if (req.query.customerIdentification) filter.customerIdentification = req.query.customerIdentification;
            if (req.query.documentType) filter.documentType = req.query.documentType;

            const sort: any = req.query.sort ? JSON.parse(req.query.sort as string) : { createdAt: -1 };

            logger.info('Fetching bills with pagination', { page, limit, filter });

            const result = await this.getBills.executePaginated(page, limit, filter, sort);

            logger.info('Bills fetched successfully', {
                count: result.data.length,
                page: result.pagination.page,
                total: result.pagination.total
            });
            res.json(ResponseFormatter.success(result));
        } catch (error) {
            next(error);
        }
    };

    public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Creating new bill', { data: req.body });
            const createdBill = await this.createBill.execute(req.body);
            logger.info('Bill created successfully', { id: createdBill.id });
            res.status(201).json(ResponseFormatter.success(createdBill));
        } catch (error) {
            next(error);
        }
    };

    public generatePdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            logger.info('Generating PDF for existing bill', { id });

            const billData = await this.getBills.executeById(id);

            if (!billData) {
                res.status(404).json(ResponseFormatter.error('NOT_FOUND', 'La factura no existe en el registro.'));
                return;
            }

            const pdfService = new PDFService();
            const config: any = await RestaurantConfigModel.findOne();
            const [estab, ptoEmi, secuencial] = billData.documentNumber.split('-');

            const invoice: any = {
                orderId: billData.orderId,
                authorizationDate: billData.authorizationDate,
                creationDate: billData.createdAt,
                detalles: billData.items.map(item => ({
                    descripcion: item.name,
                    cantidad: item.quantity,
                    precioUnitario: item.price,
                    precioTotalSinImpuesto: item.price * item.quantity,
                    impuestos: [{
                        codigo: '2',
                        tarifa: config?.billing?.taxRate || 15,
                        valor: Math.max(0, item.total - (item.price * item.quantity))
                    }]
                })),
                info: {
                    estab, ptoEmi, secuencial,
                    fechaEmision: billData.date,
                    razonSocialComprador: billData.customerName,
                    identificacionComprador: billData.customerIdentification,
                    direccionComprador: billData.customerAddress || 'S/N',
                    emailComprador: billData.customerEmail,
                    importeTotal: billData.total,
                    totalSinImpuestos: billData.subtotal,
                    totalDescuento: 0,
                    claveAcceso: billData.accessKey,
                    ambiente: billData.environment || '1',
                    ruc: config?.ruc || process.env.RUC || '0000000000001',
                    razonSocial: config?.businessName || process.env.BUSINESS_NAME || 'RESTAURANTE PICANTERIA',
                    nombreComercial: config?.name || process.env.COMMERCIAL_NAME,
                    dirMatriz: config?.address || process.env.DIR_MATRIZ || 'Guayaquil, Ecuador',
                    dirEstablecimiento: config?.address || process.env.DIR_ESTABLECIMIENTO || process.env.DIR_MATRIZ,
                    tasaIva: (config?.billing?.taxRate || 15).toString(),
                    obligadoContabilidad: config?.obligadoContabilidad ? 'SI' : 'NO',
                    moneda: 'DOLAR',
                    formaPago: '01',
                    telefonoComprador: 'S/N',
                    emailMatriz: config?.fiscalEmail || config?.email || process.env.SMTP_FROM,
                    logoUrl: config?.fiscalLogo || config?.logo
                }
            };

            const format = (req.query.format as 'A4' | 'ticket') || 'A4';
            const pdfBuffer = await pdfService.generateInvoicePDF(invoice, format);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Factura-${billData.documentNumber}.pdf`);
            res.send(pdfBuffer);
        } catch (error) {
            logger.error('Failed to generate PDF for existing bill', error);
            res.status(500).json(ResponseFormatter.error('PDF_GENERATION_FAILED', 'Error al generar el archivo RIDE.'));
        }
    };

    public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            logger.info('Deleting bill', { id });

            const success = await this.deleteBill.execute(id);

            if (!success) {
                res.status(404).json(ResponseFormatter.error('NOT_FOUND', 'La factura no existe o no se pudo eliminar.'));
                return;
            }

            logger.info('Bill deleted successfully', { id });
            res.json(ResponseFormatter.success({ success: true, message: 'Factura eliminada correctamente' }));
        } catch (error) {
            next(error);
        }
    };

    public reset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.warn('⚠️ RESET SYSTEM REQUESTED ⚠️');
            const result = await this.resetBillingSystem.execute();
            logger.info('System reset completed successfully');
            res.json(ResponseFormatter.success(result));
        } catch (error) {
            next(error);
        }
    };
}
