/**
 * Use Case: Actualizar Configuración del Restaurante
 * 
 * Actualiza la configuración del restaurante con los valores proporcionados.
 */

import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { RestaurantConfig } from '../../domain/entities/RestaurantConfig';

export class UpdateRestaurantConfig {
    constructor(private configRepository: IRestaurantConfigRepository) { }

    async execute(config: Partial<RestaurantConfig>): Promise<RestaurantConfig> {
        // Remover campos que no deben ser actualizados por el usuario
        const { id, createdAt, updatedAt, ...updateData } = config as any;

        return await this.configRepository.update(updateData);
    }
}
