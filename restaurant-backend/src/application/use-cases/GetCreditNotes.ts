import { ICreditNoteRepository } from '../../domain/repositories/ICreditNoteRepository';
import { CreditNote } from '../../domain/entities/CreditNote';

export class GetCreditNotes {
    constructor(private creditNoteRepository: ICreditNoteRepository) { }

    async executeById(id: string): Promise<CreditNote | null> {
        return await this.creditNoteRepository.findById(id);
    }

    async executeByBillId(billId: string): Promise<CreditNote[]> {
        return await this.creditNoteRepository.findByBillId(billId);
    }

    async executePaginated(
        page: number = 1,
        limit: number = 50,
        filter: any = {},
        sort: any = { createdAt: -1 }
    ): Promise<{
        data: CreditNote[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        return await this.creditNoteRepository.findPaginated(page, limit, filter, sort);
    }
}
