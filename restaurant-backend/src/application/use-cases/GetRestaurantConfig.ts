/**
 * Use Case: Obtener Configuración del Restaurante
 *
 * Retorna la configuración actual o crea una por defecto si no existe.
 * IMPORTANTE: Elimina datos sensibles del certificado antes de devolver al frontend.
 */

import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { RestaurantConfig } from '../../domain/entities/RestaurantConfig';

export class GetRestaurantConfig {
    constructor(private configRepository: IRestaurantConfigRepository) { }

    async execute(): Promise<RestaurantConfig> {
        const config = await this.configRepository.getOrCreate();

        // Si existe certificado, eliminar datos sensibles antes de devolver
        // El frontend solo necesita ver la metadata, no el certificado encriptado
        if (config.sriCertificate) {
            return {
                ...config,
                sriCertificate: {
                    // Solo devolver metadata visible (sin certificado ni contraseña)
                    environment: config.sriCertificate.environment,
                    uploadedAt: config.sriCertificate.uploadedAt,
                    validUntil: config.sriCertificate.validUntil,
                    rucInCertificate: config.sriCertificate.rucInCertificate,
                    // NO devolver certificateBase64 ni passwordEncrypted
                    certificateBase64: '', // Vacío por seguridad
                    passwordEncrypted: ''  // Vacío por seguridad
                }
            };
        }

        return config;
    }
}
