/**
 * @file GetBills.ts
 * @description Caso de uso para obtener lista de facturas
 * 
 * @purpose
 * Retorna todas las facturas/notas de venta registradas en el sistema.
 * 
 * @connections
 * - Usa: IBillRepository (domain/repositories)
 * - Usa: Bill entity (domain/entities)
 * - Usado por: billRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Application - Lógica de negocio
 */

import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { Bill } from '../../domain/entities/Bill';
import { PaginatedResult } from '../../infrastructure/repositories/BaseRepository';

export class GetBills {
    constructor(private billRepository: IBillRepository) { }

    /**
     * Get all bills (deprecated - use executePaginated for better performance)
     * @deprecated Use executePaginated instead
     */
    async execute(): Promise<Bill[]> {
        return this.billRepository.findAll();
    }

    /**
     * Get bills with pagination
     * @param page - Page number (default: 1)
     * @param limit - Items per page (default: 50, max: 100)
     * @param filter - Optional filter object
     * @param sort - Optional sort object (default: { createdAt: -1 })
     */
    async executePaginated(
        page: number = 1,
        limit: number = 50,
        filter: any = {},
        sort: any = { createdAt: -1 }
    ): Promise<PaginatedResult<Bill>> {
        return this.billRepository.findPaginated(page, limit, filter, sort);
    }
}
