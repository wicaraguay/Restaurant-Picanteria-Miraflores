/**
 * @file UpdateCustomer.ts
 * @description Caso de uso para actualizar un cliente existente
 */

import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { Customer } from '../../domain/entities/Customer';

export class UpdateCustomer {
    constructor(private customerRepository: ICustomerRepository) { }

    async execute(id: string, updates: Partial<Customer>): Promise<Customer | null> {
        return this.customerRepository.update(id, updates);
    }
}
