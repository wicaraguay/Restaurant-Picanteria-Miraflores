/**
 * Repositorio de Notas de Crédito - Implementación MongoDB
 * 
 * Extiende BaseRepository para heredar operaciones CRUD comunes.
 * Solo implementa la lógica específica de mapeo de CreditNote.
 */

import { ICreditNoteRepository } from '../../domain/repositories/ICreditNoteRepository';
import { CreditNote } from '../../domain/entities/CreditNote';
import { CreditNoteModel } from '../database/schemas/CreditNoteSchema';
import { BaseRepository } from './BaseRepository';

export class MongoCreditNoteRepository extends BaseRepository<CreditNote> implements ICreditNoteRepository {
    constructor() {
        super(CreditNoteModel, 'CreditNote');
    }

    protected mapToEntity(doc: any): CreditNote {
        return new CreditNote(
            doc.id || doc._id.toString(),
            doc.documentNumber,
            doc.billId?.toString() || doc.billId,
            doc.originalAccessKey,
            doc.orderId,
            doc.date,
            doc.reason,
            doc.reasonDescription,
            doc.customerName,
            doc.customerIdentification,
            doc.customerAddress,
            doc.customerEmail,
            doc.items,
            doc.subtotal,
            doc.tax,
            doc.total,
            doc.accessKey,
            doc.sriStatus,
            doc.environment,
            doc.authorizationDate,
            doc.xmlUrl,
            doc.pdfUrl,
            doc.createdAt
        );
    }

    async findByBillId(billId: string): Promise<CreditNote[]> {
        const docs = await this.model.find({ billId }).sort({ createdAt: -1 });
        return docs.map(doc => this.mapToEntity(doc));
    }

    async findByAccessKey(accessKey: string): Promise<CreditNote | null> {
        const doc = await this.model.findOne({ accessKey });
        return doc ? this.mapToEntity(doc) : null;
    }



    async upsert(creditNote: Partial<CreditNote>): Promise<CreditNote> {
        let doc;
        if (creditNote.accessKey) {
            doc = await this.model.findOneAndUpdate(
                { accessKey: creditNote.accessKey },
                { $set: creditNote },
                { new: true, upsert: true }
            );
        } else if (creditNote.id) {
            doc = await this.model.findByIdAndUpdate(
                creditNote.id,
                { $set: creditNote },
                { new: true, upsert: true }
            );
        } else {
            throw new Error('CreditNote upsert requires id or accessKey');
        }

        if (!doc) throw new Error('Failed to upsert credit note');
        return this.mapToEntity(doc);
    }
}
