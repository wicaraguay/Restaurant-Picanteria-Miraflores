/**
 * @file CertificateEncryption.ts
 * @description Servicio de encriptación/desencriptación para certificados digitales .p12
 *
 * @purpose
 * Encripta certificados digitales y contraseñas antes de almacenarlos en MongoDB.
 * Usa AES-256-GCM para máxima seguridad.
 * La master key se mantiene en variables de entorno (nunca en código).
 *
 * @security
 * - Algoritmo: AES-256-GCM (Galois/Counter Mode) - autenticado
 * - Key derivation: scrypt con salt fijo
 * - IV único por cada encriptación (16 bytes random)
 * - Auth tag para verificar integridad
 *
 * @layer Infrastructure - Utility
 */

import crypto from 'crypto';
import { logger } from './Logger';

export class CertificateEncryption {
    private algorithm = 'aes-256-gcm';
    private masterKey: Buffer;

    constructor() {
        const key = process.env.MASTER_ENCRYPTION_KEY;

        // Validar que la master key exista y sea suficientemente larga
        if (!key) {
            throw new Error('FATAL: MASTER_ENCRYPTION_KEY environment variable is required');
        }

        if (key.length < 32) {
            throw new Error('FATAL: MASTER_ENCRYPTION_KEY must be at least 32 characters long');
        }

        // Derivar clave de 32 bytes usando scrypt
        // Salt fijo porque no necesitamos salt único (la master key ya es única)
        this.masterKey = crypto.scryptSync(key, 'sri-cert-salt-v1', 32);

        logger.info('CertificateEncryption initialized');
    }

    /**
     * Encripta datos sensibles (certificado o contraseña)
     * @param data Datos en texto plano o base64
     * @returns Datos encriptados en formato: iv:authTag:encrypted (todo en base64)
     */
    encrypt(data: string): string {
        try {
            // Generar IV único para esta encriptación
            const iv = crypto.randomBytes(16);

            // Crear cipher
            const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

            // Encriptar datos
            let encrypted = cipher.update(data, 'utf8', 'base64');
            encrypted += cipher.final('base64');

            // Obtener auth tag para verificación de integridad
            const authTag = (cipher as any).getAuthTag();

            // Retornar: iv + authTag + encrypted (separados por :)
            const result = `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;

            logger.debug('Data encrypted successfully', { length: data.length });
            return result;
        } catch (error) {
            logger.error('Encryption failed', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Desencripta datos sensibles
     * @param encryptedData Datos en formato: iv:authTag:encrypted
     * @returns Datos originales en texto plano o base64
     */
    decrypt(encryptedData: string): string {
        try {
            // Parsear componentes
            const parts = encryptedData.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted data format');
            }

            const [ivBase64, authTagBase64, encrypted] = parts;

            const iv = Buffer.from(ivBase64, 'base64');
            const authTag = Buffer.from(authTagBase64, 'base64');

            // Crear decipher
            const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
            (decipher as any).setAuthTag(authTag);

            // Desencriptar datos
            let decrypted = decipher.update(encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            logger.debug('Data decrypted successfully');
            return decrypted;
        } catch (error) {
            logger.error('Decryption failed', error);
            throw new Error('Failed to decrypt data - certificate may be corrupted or master key changed');
        }
    }

    /**
     * Verifica que la encriptación/desencriptación funcione correctamente
     * Útil para testing y validación en startup
     */
    static test(): boolean {
        try {
            const encryption = new CertificateEncryption();
            const testData = 'test-data-123';
            const encrypted = encryption.encrypt(testData);
            const decrypted = encryption.decrypt(encrypted);

            if (decrypted !== testData) {
                throw new Error('Encryption test failed: data mismatch');
            }

            logger.info('CertificateEncryption test passed');
            return true;
        } catch (error) {
            logger.error('CertificateEncryption test failed', error);
            return false;
        }
    }
}

// Export singleton instance
export const certificateEncryption = new CertificateEncryption();
