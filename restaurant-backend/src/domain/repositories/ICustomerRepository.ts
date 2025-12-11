/**
 * @file ICustomerRepository.ts
 * @description Interfaz del repositorio de clientes (Domain Layer)
 * 
 * @purpose
 * Define el contrato para operaciones CRUD de clientes. Sigue el patrón Repository
 * para abstraer la persistencia de datos del dominio.
 * 
 * @connections
 * - Implementado por: MongoCustomerRepository (infrastructure/repositories)
 * - Usa: Customer entity (domain/entities)
 * - Usado por: CreateCustomer, GetCustomers use cases (application/use-cases)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Domain - Define contratos sin implementación
 */

import { Customer } from '../entities/Customer';
import { PaginatedResult } from '../../infrastructure/repositories/BaseRepository';

export interface ICustomerRepository {
    create(customer: Customer): Promise<Customer>;
    findById(id: string): Promise<Customer | null>;
    findAll(): Promise<Customer[]>;
    findPaginated(page: number, limit: number, filter?: any, sort?: any): Promise<PaginatedResult<Customer>>;
    update(id: string, customer: Partial<Customer>): Promise<Customer | null>;
    delete(id: string): Promise<boolean>;
}
