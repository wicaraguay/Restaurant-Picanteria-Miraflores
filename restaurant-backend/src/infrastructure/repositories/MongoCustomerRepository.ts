/**
 * Repositorio de Clientes - Implementación MongoDB
 * 
 * Extiende BaseRepository para heredar operaciones CRUD comunes.
 * Solo implementa la lógica específica de mapeo de Customer.
 */

import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { Customer } from '../../domain/entities/Customer';
import { CustomerModel } from '../database/schemas/CustomerSchema';
import { BaseRepository } from './BaseRepository';

export class MongoCustomerRepository extends BaseRepository<Customer> implements ICustomerRepository {
    constructor() {
        super(CustomerModel, 'Customer');
    }

    protected mapToEntity(doc: any): Customer {
        return {
            id: doc.id || doc._id.toString(),
            name: doc.name,
            email: doc.email,
            phone: doc.phone,
            loyaltyPoints: doc.loyaltyPoints,
            lastVisit: doc.lastVisit,
            identification: doc.identification,
            address: doc.address
        };
    }
}
