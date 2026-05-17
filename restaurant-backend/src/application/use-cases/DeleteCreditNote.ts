import { ICreditNoteRepository } from '../../domain/repositories/ICreditNoteRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { logger } from '../../infrastructure/utils/Logger';

export class DeleteCreditNote {
    constructor(
        private creditNoteRepository: ICreditNoteRepository,
        private billRepository: IBillRepository
    ) { }

    async execute(id: string): Promise<boolean> {
        logger.info('Deleting credit note', { id });

        // Find the credit note to get the associated bill
        const creditNote = await this.creditNoteRepository.findById(id);

        if (!creditNote) {
            logger.warn('Credit note not found for deletion', { id });
            return false;
        }

        // Delete the credit note
        const deleted = await this.creditNoteRepository.delete(id);

        if (deleted && creditNote.billId) {
            // Update the associated bill to remove the hasCreditNote flag
            const bill = await this.billRepository.findById(creditNote.billId);
            if (bill) {
                await this.billRepository.upsert({ ...bill, hasCreditNote: false });
                logger.info('Bill hasCreditNote flag reset', { billId: creditNote.billId });
            }
        }

        logger.info('Credit note deleted successfully', { id });
        return deleted;
    }
}
