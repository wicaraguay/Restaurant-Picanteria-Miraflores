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

export class GetBills {
    constructor(private billRepository: IBillRepository) { }

    async execute(): Promise<Bill[]> {
        return this.billRepository.findAll();
    }
}
