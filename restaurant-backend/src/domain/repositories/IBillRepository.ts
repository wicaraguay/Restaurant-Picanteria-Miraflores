/**
 * @file IBillRepository.ts
 * @description Interfaz del repositorio de facturas (Domain Layer)
 * 
 * @purpose
 * Define el contrato para operaciones de facturación (crear, consultar).
 * 
 * @connections
 * - Implementado por: MongoBillRepository (infrastructure/repositories)
 * - Usa: Bill entity (domain/entities)
 * - Usado por: CreateBill, GetBills use cases (application/use-cases)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Domain - Define contratos sin implementación
 */

import { Bill } from '../entities/Bill';
import { PaginatedResult } from '../../infrastructure/repositories/BaseRepository';

export interface IBillRepository {
    create(bill: Bill): Promise<Bill>;
    findAll(): Promise<Bill[]>;
    findPaginated(page: number, limit: number, filter?: any, sort?: any): Promise<PaginatedResult<Bill>>;
    findById(id: string): Promise<Bill | null>;
    delete(id: string): Promise<boolean>;
    upsert(bill: Partial<Bill>): Promise<Bill>;
}
