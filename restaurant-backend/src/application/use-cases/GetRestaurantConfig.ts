/**
 * Use Case: Obtener Configuración del Restaurante
 * 
 * Retorna la configuración actual o crea una por defecto si no existe.
 */

import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { RestaurantConfig } from '../../domain/entities/RestaurantConfig';

export class GetRestaurantConfig {
    constructor(private configRepository: IRestaurantConfigRepository) { }

    async execute(): Promise<RestaurantConfig> {
        return await this.configRepository.getOrCreate();
    }
}
