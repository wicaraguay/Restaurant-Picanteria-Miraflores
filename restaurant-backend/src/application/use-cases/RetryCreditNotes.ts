
import { ICreditNoteRepository } from '../../domain/repositories/ICreditNoteRepository';
import { CheckCreditNoteStatus } from './CheckCreditNoteStatus';
import { logger } from '../../infrastructure/utils/Logger';

/**
 * @class RetryCreditNotes
 * @description Use case that identifies and retries sending non-authorized credit notes to the SRI.
 */
export class RetryCreditNotes {
    constructor(
        private creditNoteRepository: ICreditNoteRepository,
        private checkCreditNoteStatus: CheckCreditNoteStatus
    ) { }

    async execute(): Promise<{ processed: number, successes: number, errors: number }> {
        const results = {
            processed: 0,
            successes: 0,
            errors: 0
        };

        try {
            // 1. Identify credit notes to retry
            // Look for non-authorized NCs from the last 48 hours
            const fortyEightHoursAgo = new Date();
            fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

            const statusesToRetry = [
                'PENDIENTE',
                'PENDING',
                'RECIBIDA',
                'DEVUELTA',
                'EN PROCESO',
                'PENDING_RETRY',
                'UNKNOWN',
                'ERROR'
            ];

            const pendingNCs = await this.creditNoteRepository.findPaginated(1, 50, {
                sriStatus: { $in: statusesToRetry },
                createdAt: { $gte: fortyEightHoursAgo }
            });

            logger.info(`[RetryCreditNotes] Found ${pendingNCs.data.length} credit notes to retry.`);

            if (pendingNCs.data.length === 0) {
                return results;
            }

            // 2. Process each credit note
            for (const nc of pendingNCs.data) {
                results.processed++;
                
                if (!nc.accessKey) {
                    logger.warn(`[RetryCreditNotes] NC ${nc.documentNumber} (${nc.id}) has no accessKey. Skipping.`);
                    results.errors++;
                    continue;
                }

                try {
                    logger.info(`[RetryCreditNotes] Retrying NC ${nc.documentNumber} (Key: ${nc.accessKey})...`);
                    
                    const result = await this.checkCreditNoteStatus.execute(nc.accessKey);
                    
                    // We check status from result or re-query if necessary
                    if (result.status === 'AUTORIZADO') {
                        logger.info(`[RetryCreditNotes] Successfully authorized NC ${nc.documentNumber}`);
                        results.successes++;
                    } else {
                        logger.warn(`[RetryCreditNotes] Retry for NC ${nc.documentNumber} finished with state: ${result.status || 'UNKNOWN'}`);
                        results.errors++;
                    }
                } catch (ncError) {
                    logger.error(`[RetryCreditNotes] Failed to retry NC ${nc.documentNumber}:`, ncError);
                    results.errors++;
                }
            }

        } catch (error) {
            logger.error('[RetryCreditNotes] Error during NC retry batch process:', error);
            throw error;
        }

        logger.info(`[RetryCreditNotes] Finished batch: ${results.successes} authorized, ${results.errors} failures/pending, ${results.processed} total processed.`);
        return results;
    }
}
