/**
 * @file CreateCustomer.ts
 * @description Caso de uso para crear un nuevo cliente
 * 
 * @purpose
 * Crea un nuevo cliente en el sistema. Puede incluir validaciones como verificar email duplicado.
 * 
 * @connections
 * - Usa: ICustomerRepository (domain/repositories)
 * - Usa: Customer entity (domain/entities)
 * - Usado por: customerRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Application - Lógica de negocio
 */

import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { Customer } from '../../domain/entities/Customer';

export class CreateCustomer {
    constructor(private customerRepository: ICustomerRepository) { }

    async execute(customerData: Customer): Promise<Customer> {
        // Here we can add validations (e.g. check if email exists)
        return this.customerRepository.create(customerData);
    }
}
