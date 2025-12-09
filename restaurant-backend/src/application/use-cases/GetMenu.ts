/**
 * @file GetMenu.ts
 * @description Caso de uso para obtener el menú del restaurante
 * 
 * @purpose
 * Retorna todos los items del menú disponibles en el sistema.
 * 
 * @connections
 * - Usa: IMenuRepository (domain/repositories)
 * - Usa: MenuItem entity (domain/entities)
 * - Usado por: menuRoutes (infrastructure/web/routes)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Application - Lógica de negocio
 */

import { IMenuRepository } from '../../domain/repositories/IMenuRepository';
import { MenuItem } from '../../domain/entities/MenuItem';

export class GetMenu {
    constructor(private menuRepository: IMenuRepository) { }

    async execute(): Promise<MenuItem[]> {
        return this.menuRepository.findAll();
    }
}
