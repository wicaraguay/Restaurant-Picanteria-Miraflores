/**
 * @file ICreditNoteRepository.ts
 * @description Repositorio para Notas de Crédito
 * 
 * @purpose
 * Define el contrato que debe cumplir cualquier implementación del repositorio
 * de Notas de Crédito, siguiendo el patrón Repository de Arquitectura Hexagonal.
 * 
 * @layer Domain - Contrato puro sin dependencias de infraestructura
 */

import { CreditNote } from '../entities/CreditNote';

export interface ICreditNoteRepository {
    /**
     * Crear una nueva nota de crédito
     */
    create(creditNote: CreditNote): Promise<CreditNote>;

    /**
     * Buscar nota de crédito por ID
     */
    findById(id: string): Promise<CreditNote | null>;

    /**
     * Buscar todas las notas de crédito de una factura
     */
    findByBillId(billId: string): Promise<CreditNote[]>;

    /**
     * Buscar nota de crédito por clave de acceso
     */
    findByAccessKey(accessKey: string): Promise<CreditNote | null>;

    /**
     * Buscar todas con paginación y filtros
     */
    /**
     * Buscar todas con paginación y filtros
     */
    findPaginated(page: number, limit: number, filter: any, sort?: any): Promise<{
        data: CreditNote[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;

    /**
     * Crear o actualizar (upsert) basado en accessKey
     */
    upsert(creditNote: Partial<CreditNote>): Promise<CreditNote>;

    /**
     * Actualizar nota de crédito existente
     */
    update(id: string, data: Partial<CreditNote>): Promise<CreditNote | null>;
}
