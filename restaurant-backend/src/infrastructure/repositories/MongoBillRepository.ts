/**
 * Repositorio de Facturas - Implementación MongoDB
 * 
 * Extiende BaseRepository para heredar operaciones CRUD comunes.
 * Solo implementa la lógica específica de mapeo de Bill.
 */

import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { Bill } from '../../domain/entities/Bill';
import { BillModel } from '../database/schemas/BillSchema';
import { BaseRepository } from './BaseRepository';

export class MongoBillRepository extends BaseRepository<Bill> implements IBillRepository {
    constructor() {
        super(BillModel, 'Bill');
    }

    protected mapToEntity(doc: any): Bill {
        return new Bill(
            doc.id || doc._id.toString(),
            doc.documentNumber,
            doc.orderId,
            doc.date,
            doc.documentType,
            doc.customerName,
            doc.customerIdentification,
            doc.customerAddress,
            doc.customerEmail,
            doc.items,
            doc.subtotal,
            doc.tax,
            doc.total,
            doc.regime,
            doc.accessKey,
            doc.sriStatus,
            doc.environment,
            doc.authorizationDate,
            doc.xmlUrl,
            doc.pdfUrl,
            doc.createdAt
        );
    }

    async upsert(bill: Partial<Bill>): Promise<Bill> {
        let doc;
        if (bill.accessKey) {
            doc = await this.model.findOneAndUpdate(
                { accessKey: bill.accessKey },
                { $set: bill },
                { new: true, upsert: true }
            );
        } else if (bill.id) {
            doc = await this.model.findByIdAndUpdate(
                bill.id,
                { $set: bill },
                { new: true, upsert: true }
            );
        } else {
            throw new Error('Bill upsert requires id or accessKey');
        }

        if (!doc) throw new Error('Failed to upsert bill');
        return this.mapToEntity(doc);
    }
}
