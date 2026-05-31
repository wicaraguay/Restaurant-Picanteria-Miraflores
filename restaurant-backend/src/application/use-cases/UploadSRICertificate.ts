/**
 * @file UploadSRICertificate.ts
 * @description Caso de uso para subir y validar certificado digital SRI (.p12)
 *
 * @purpose
 * Recibe un certificado digital .p12, lo valida, lo encripta y lo guarda en MongoDB.
 * Valida que el RUC del certificado coincida con el RUC de la configuración.
 *
 * @connections
 * - Usa: IRestaurantConfigRepository
 * - Usa: CertificateEncryption (utils)
 * - Usado por: ConfigController
 *
 * @layer Application - Lógica de negocio
 */

import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { certificateEncryption } from '../../infrastructure/utils/CertificateEncryption';
import { CertificateParser } from '../../infrastructure/utils/CertificateParser';
import { ValidationError, NotFoundError } from '../../domain/errors/CustomErrors';
import { logger } from '../../infrastructure/utils/Logger';

export interface UploadCertificateParams {
    certificateBase64: string;   // Certificado .p12 en base64 (SIN encriptar)
    password: string;            // Contraseña del certificado (SIN encriptar)
    environment: '1' | '2';      // 1 = Pruebas, 2 = Producción
}

export class UploadSRICertificate {
    constructor(
        private configRepository: IRestaurantConfigRepository
    ) {}

    async execute(params: UploadCertificateParams): Promise<{ success: boolean; message: string }> {
        const { certificateBase64, password, environment } = params;

        // Validar parámetros
        if (!certificateBase64 || !password || !environment) {
            throw new ValidationError('Certificate, password and environment are required');
        }

        if (environment !== '1' && environment !== '2') {
            throw new ValidationError('Environment must be "1" (testing) or "2" (production)');
        }

        // Obtener configuración actual
        const config = await this.configRepository.get();
        if (!config) {
            throw new NotFoundError('Restaurant configuration not found');
        }

        // Validar base64
        try {
            Buffer.from(certificateBase64, 'base64');
        } catch (error) {
            throw new ValidationError('Invalid certificate format - must be valid base64');
        }

        // Validar longitud del certificado (debe ser > 1KB y < 10MB)
        const certSize = Buffer.from(certificateBase64, 'base64').length;
        if (certSize < 1024) {
            throw new ValidationError('Certificate file is too small - minimum 1KB');
        }
        if (certSize > 10 * 1024 * 1024) {
            throw new ValidationError('Certificate file is too large - maximum 10MB');
        }

        // Parsear el certificado para extraer información (fecha de vencimiento, RUC, etc.)
        let certInfo;
        try {
            certInfo = CertificateParser.parse(certificateBase64, password);
        } catch (error: any) {
            logger.error('[UploadSRICertificate] Failed to parse certificate', error);
            throw new ValidationError(error.message || 'Failed to parse certificate - verify file and password');
        }

        // Validar que el certificado no esté vencido
        if (certInfo.isExpired) {
            throw new ValidationError(`Certificate has expired on ${certInfo.validUntil.toISOString().split('T')[0]}`);
        }

        // Validar que el RUC del certificado coincida con el RUC de la configuración
        if (certInfo.ruc && certInfo.ruc !== config.ruc) {
            throw new ValidationError(
                `Certificate RUC (${certInfo.ruc}) does not match restaurant RUC (${config.ruc})`
            );
        }

        logger.info('[UploadSRICertificate] Uploading certificate', {
            environment,
            certSize,
            ruc: config.ruc,
            certRuc: certInfo.ruc,
            validUntil: certInfo.validUntil,
            subject: certInfo.subject
        });

        // Encriptar certificado y contraseña
        const encryptedCert = certificateEncryption.encrypt(certificateBase64);
        const encryptedPassword = certificateEncryption.encrypt(password);

        // Actualizar configuración con toda la información del certificado
        config.sriCertificate = {
            certificateBase64: encryptedCert,
            passwordEncrypted: encryptedPassword,
            environment,
            uploadedAt: new Date(),
            validUntil: certInfo.validUntil,
            rucInCertificate: certInfo.ruc
        };

        await this.configRepository.update(config);

        logger.info('[UploadSRICertificate] Certificate uploaded successfully', {
            environment,
            uploadedAt: config.sriCertificate.uploadedAt,
            validUntil: certInfo.validUntil,
            ruc: certInfo.ruc
        });

        const validUntilFormatted = certInfo.validUntil.toLocaleDateString('es-EC', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return {
            success: true,
            message: `Certificado digital subido correctamente para ambiente ${environment === '1' ? 'Pruebas' : 'Producción'}. Válido hasta: ${validUntilFormatted}`
        };
    }
}
