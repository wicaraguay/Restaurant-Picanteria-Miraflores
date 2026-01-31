import { Request, Response, NextFunction } from 'express';
import { GenerateCreditNote } from '../../application/use-cases/GenerateCreditNote';
import { GetCreditNotes } from '../../application/use-cases/GetCreditNotes';
import { CheckCreditNoteStatus } from '../../application/use-cases/CheckCreditNoteStatus';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';

export class CreditNoteController {
    constructor(
        private generateCreditNote: GenerateCreditNote,
        private getCreditNotes: GetCreditNotes,
        private checkCreditNoteStatus: CheckCreditNoteStatus
    ) { }

    public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { billId, reason, customDescription, taxRate } = req.body;

            if (!billId || !reason) {
                res.status(400).json(ResponseFormatter.error('VALIDATION_ERROR', 'billId y reason son requeridos'));
                return;
            }

            logger.info('Generating credit note', { billId, reason });

            const result = await this.generateCreditNote.execute({
                billId,
                reason,
                customDescription,
                taxRate
            });

            logger.info('Credit note generated successfully', {
                creditNoteId: result.creditNoteId,
                status: result.authorization?.estado
            });

            res.status(201).json(ResponseFormatter.success(result));
        } catch (error) {
            logger.error('Failed to generate credit note', error);
            next(error);
        }
    };

    public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;

            const filter: any = {};
            if (req.query.billId) filter.billId = req.query.billId;
            if (req.query.documentNumber) filter.documentNumber = req.query.documentNumber;
            if (req.query.customerIdentification) filter.customerIdentification = req.query.customerIdentification;
            if (req.query.reason) filter.reason = req.query.reason;

            const sort: any = req.query.sort ? JSON.parse(req.query.sort as string) : { createdAt: -1 };

            logger.info('Fetching credit notes with pagination', { page, limit, filter });

            const result = await this.getCreditNotes.executePaginated(page, limit, filter, sort);

            logger.info('Credit notes fetched successfully', {
                count: result.data.length,
                page: result.pagination.page,
                total: result.pagination.total
            });

            res.json(ResponseFormatter.success(result));
        } catch (error) {
            next(error);
        }
    };

    public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            logger.info('Fetching credit note by ID', { id });

            const creditNote = await this.getCreditNotes.executeById(id);

            if (!creditNote) {
                res.status(404).json(ResponseFormatter.error('NOT_FOUND', 'Nota de crédito no encontrada'));
                return;
            }

            res.json(ResponseFormatter.success(creditNote));
        } catch (error) {
            next(error);
        }
    };

    public checkStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { accessKey } = req.body;

            if (!accessKey) {
                res.status(400).json(ResponseFormatter.error('VALIDATION_ERROR', 'accessKey es requerido'));
                return;
            }

            logger.info('Checking credit note status', { accessKey });

            const result = await this.checkCreditNoteStatus.execute(accessKey);

            logger.info('Credit note status checked', {
                creditNoteId: result.creditNoteId,
                status: result.status
            });

            res.json(ResponseFormatter.success(result));
        } catch (error) {
            logger.error('Failed to check credit note status', error);
            next(error);
        }
    };
}
