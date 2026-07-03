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

    /**
     * Al listar, populamos billId con el documentNumber de la factura original
     * para poder mostrar "Factura Asociada" con el número real (numDocModificado)
     * en lugar del ObjectId interno.
     */
    protected applyQueryEnhancements(query: any): any {
        return query.populate('billId', 'documentNumber');
    }

    protected mapToEntity(doc: any): CreditNote {
        // billId puede venir como ObjectId (sin populate), como objeto poblado
        // { _id, documentNumber }, o null si la factura original fue eliminada.
        const billRef: any = doc.billId;
        const billId = billRef?._id?.toString() || billRef?.toString() || billRef;
        const billDocumentNumber = (billRef && typeof billRef === 'object' && billRef.documentNumber)
            ? billRef.documentNumber
            : undefined;

        return new CreditNote(
            doc.id || doc._id.toString(),
            doc.documentNumber,
            billId,
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
            doc.retryCount,
            doc.lastRetryDate,
            doc.createdAt,
            doc.sriMessage,
            doc.errorLog || [],
            billDocumentNumber
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
        try {
            if (creditNote.accessKey && creditNote.accessKey.length > 0) {
                // Actualizar por accessKey si existe
                doc = await this.model.findOneAndUpdate(
                    { accessKey: creditNote.accessKey },
                    { $set: creditNote },
                    { new: true, upsert: true }
                );
            } else if (creditNote.id) {
                // Actualizar por id si existe
                doc = await this.model.findByIdAndUpdate(
                    creditNote.id,
                    { $set: creditNote },
                    { new: true, upsert: true }
                );
            } else if (creditNote.documentNumber) {
                // Buscar por documentNumber (puede existir de un intento previo fallido)
                doc = await this.model.findOneAndUpdate(
                    { documentNumber: creditNote.documentNumber },
                    { $set: creditNote },
                    { new: true, upsert: true }
                );
            } else {
                // Crear nuevo documento como último recurso
                doc = await this.model.create(creditNote);
            }
        } catch (error: any) {
            // E11000 = duplicate key error - el documento ya existe, actualizar en vez de insertar
            if (error.code === 11000 && creditNote.documentNumber) {
                doc = await this.model.findOneAndUpdate(
                    { documentNumber: creditNote.documentNumber },
                    { $set: creditNote },
                    { new: true }  // Sin upsert, solo update
                );
            } else {
                throw error;
            }
        }

        if (!doc) throw new Error('Failed to upsert credit note');
        return this.mapToEntity(doc);
    }

    /**
     * Añade una entrada al historial de errores del SRI para una nota de crédito.
     * Usa $push de MongoDB para garantizar que el log sea acumulativo e inmutable.
     */
    async pushErrorLog(creditNoteId: string, entry: {
        timestamp: string;
        sriStatus: string;
        message: string;
        attempt: number;
    }): Promise<void> {
        await this.model.findByIdAndUpdate(
            creditNoteId,
            {
                $push: { errorLog: entry },
                $set:  { sriMessage: entry.message, sriStatus: entry.sriStatus }
            }
        );
    }
}
