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
import { PaginatedResult } from '../../infrastructure/repositories/BaseRepository';

export class GetCustomers {
    constructor(private customerRepository: ICustomerRepository) { }

    /**
     * Get all customers (deprecated - use executePaginated for better performance)
     * @deprecated Use executePaginated instead
     */
    async execute(): Promise<Customer[]> {
        return this.customerRepository.findAll();
    }

    /**
     * Get customers with pagination
     * @param page - Page number (default: 1)
     * @param limit - Items per page (default: 50, max: 100)
     * @param filter - Optional filter object
     * @param sort - Optional sort object (default: { name: 1 })
     */
    async executePaginated(
        page: number = 1,
        limit: number = 50,
        filter: any = {},
        sort: any = { name: 1 }
    ): Promise<PaginatedResult<Customer>> {
        return this.customerRepository.findPaginated(page, limit, filter, sort);
    }
}
