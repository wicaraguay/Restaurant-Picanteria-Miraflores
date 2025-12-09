/**
 * @file GetCustomers.ts
 * @description Caso de uso para obtener lista de clientes
 * 
 * @purpose
 * Retorna todos los clientes registrados en el sistema.
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

export class GetCustomers {
    constructor(private customerRepository: ICustomerRepository) { }

    async execute(): Promise<Customer[]> {
        return this.customerRepository.findAll();
    }
}
