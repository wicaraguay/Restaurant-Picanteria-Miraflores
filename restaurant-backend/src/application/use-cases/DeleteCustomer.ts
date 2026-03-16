/**
 * @file DeleteCustomer.ts
 * @description Caso de uso para eliminar un cliente
 */

import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';

export class DeleteCustomer {
    constructor(private customerRepository: ICustomerRepository) { }

    async execute(id: string): Promise<boolean> {
        return this.customerRepository.delete(id);
    }
}
