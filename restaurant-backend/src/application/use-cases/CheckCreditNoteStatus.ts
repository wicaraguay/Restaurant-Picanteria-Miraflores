import { SRIService } from '../../infrastructure/services/SRIService';
import { ICreditNoteRepository } from '../../domain/repositories/ICreditNoteRepository';

export class CheckCreditNoteStatus {
    constructor(
        private creditNoteRepository: ICreditNoteRepository,
        private sriService: SRIService
    ) { }

    async execute(accessKey: string): Promise<any> {
        console.log(`[CheckCreditNoteStatus] Checking status for access key: ${accessKey}`);

        // 1. Find credit note in database
        const creditNote = await this.creditNoteRepository.findByAccessKey(accessKey);
        if (!creditNote) {
            throw new Error('Nota de crédito no encontrada');
        }

        // 2. Query SRI for authorization status
        const isProd = process.env.SRI_ENV === '2';
        const authResult = await this.sriService.authorizeCreditNote(accessKey, isProd);

        console.log(`[CheckCreditNoteStatus] SRI Response: ${authResult.estado}`);

        // 3. Update database with latest status
        if (authResult.estado && authResult.estado !== creditNote.sriStatus) {
            await this.creditNoteRepository.update(creditNote.id, {
                sriStatus: authResult.estado,
                authorizationDate: authResult.fechaAutorizacion
            });
            console.log(`[CheckCreditNoteStatus] Updated credit note status to: ${authResult.estado}`);
        }

        return {
            creditNoteId: creditNote.id,
            documentNumber: creditNote.documentNumber,
            accessKey: accessKey,
            status: authResult.estado,
            authorizationNumber: authResult.numeroAutorizacion,
            authorizationDate: authResult.fechaAutorizacion,
            sriResponse: authResult
        };
    }
}
