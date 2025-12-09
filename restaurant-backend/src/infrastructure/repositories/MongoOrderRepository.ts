/**
 * Repositorio de Órdenes - Implementación MongoDB
 * 
 * Extiende BaseRepository para heredar operaciones CRUD comunes.
 * Solo implementa la lógica específica de mapeo de Order.
 */

import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { Order } from '../../domain/entities/Order';
import { OrderModel } from '../database/schemas/OrderSchema';
import { BaseRepository } from './BaseRepository';

export class MongoOrderRepository extends BaseRepository<Order> implements IOrderRepository {
    constructor() {
        super(OrderModel, 'Order');
    }

    protected mapToEntity(doc: any): Order {
        return {
            id: doc.id || doc._id.toString(),
            customerName: doc.customerName,
            items: doc.items,
            type: doc.type,
            status: doc.status,
            createdAt: doc.createdAt,
            billed: doc.billed
        };
    }
}
