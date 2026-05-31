/**
 * @file DeleteSRICertificate.ts
 * @description Caso de uso para eliminar certificado digital SRI (.p12)
 *
 * @purpose
 * Elimina el certificado digital del restaurante, permitiendo subir uno nuevo.
 *
 * @connections
 * - Usa: IRestaurantConfigRepository
 * - Usado por: ConfigController
 *
 * @layer Application - Lógica de negocio
 */

import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { NotFoundError } from '../../domain/errors/CustomErrors';
import { logger } from '../../infrastructure/utils/Logger';

export class DeleteSRICertificate {
    constructor(
        private configRepository: IRestaurantConfigRepository
    ) {}

    async execute(): Promise<{ success: boolean; message: string }> {
        // Obtener configuración actual
        const config = await this.configRepository.get();
        if (!config) {
            throw new NotFoundError('Restaurant configuration not found');
        }

        // Verificar que existe certificado
        if (!config.sriCertificate) {
            throw new NotFoundError('No certificate found to delete');
        }

        logger.info('[DeleteSRICertificate] Deleting certificate', {
            environment: config.sriCertificate.environment,
            uploadedAt: config.sriCertificate.uploadedAt,
            validUntil: config.sriCertificate.validUntil
        });

        // Eliminar certificado usando $unset en MongoDB
        // Pasamos un objeto con sriCertificate explícitamente undefined
        await this.configRepository.update({ sriCertificate: undefined } as any);

        logger.info('[DeleteSRICertificate] Certificate deleted successfully');

        return {
            success: true,
            message: 'Certificado digital eliminado correctamente'
        };
    }
}
