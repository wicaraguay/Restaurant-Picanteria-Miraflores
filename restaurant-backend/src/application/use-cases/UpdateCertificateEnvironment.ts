/**
 * @file UpdateCertificateEnvironment.ts
 * @description Caso de uso para cambiar el ambiente del certificado SRI (Pruebas ↔ Producción)
 *
 * @purpose
 * Permite cambiar el ambiente del SRI sin necesidad de volver a subir el certificado.
 * El certificado .p12 es el mismo para ambos ambientes, solo cambia el endpoint del SRI.
 *
 * @connections
 * - Usa: IRestaurantConfigRepository
 * - Usado por: ConfigController
 *
 * @layer Application - Lógica de negocio
 */

import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { NotFoundError, ValidationError } from '../../domain/errors/CustomErrors';
import { logger } from '../../infrastructure/utils/Logger';

export interface UpdateCertificateEnvironmentParams {
    environment: '1' | '2';  // 1 = Pruebas, 2 = Producción
}

export class UpdateCertificateEnvironment {
    constructor(
        private configRepository: IRestaurantConfigRepository
    ) {}

    async execute(params: UpdateCertificateEnvironmentParams): Promise<{ success: boolean; message: string }> {
        const { environment } = params;

        // Validar ambiente
        if (environment !== '1' && environment !== '2') {
            throw new ValidationError('Environment must be "1" (testing) or "2" (production)');
        }

        // Obtener configuración actual
        const config = await this.configRepository.get();
        if (!config) {
            throw new NotFoundError('Restaurant configuration not found');
        }

        // Verificar que existe certificado
        if (!config.sriCertificate) {
            throw new NotFoundError('No certificate found. Please upload a certificate first.');
        }

        // Verificar si ya está en el mismo ambiente
        if (config.sriCertificate.environment === environment) {
            const envName = environment === '1' ? 'Pruebas' : 'Producción';
            return {
                success: true,
                message: `El certificado ya está configurado para ambiente ${envName}`
            };
        }

        const oldEnv = config.sriCertificate.environment === '1' ? 'Pruebas' : 'Producción';
        const newEnv = environment === '1' ? 'Pruebas' : 'Producción';

        logger.info('[UpdateCertificateEnvironment] Changing environment', {
            from: oldEnv,
            to: newEnv,
            ruc: config.sriCertificate.rucInCertificate
        });

        // Actualizar solo el ambiente del certificado
        config.sriCertificate.environment = environment;

        await this.configRepository.update(config);

        logger.info('[UpdateCertificateEnvironment] Environment updated successfully', {
            environment: newEnv
        });

        return {
            success: true,
            message: `Ambiente cambiado de ${oldEnv} a ${newEnv} correctamente`
        };
    }
}