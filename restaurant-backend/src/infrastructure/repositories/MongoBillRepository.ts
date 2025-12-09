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
            doc.regime
        );
    }
}
