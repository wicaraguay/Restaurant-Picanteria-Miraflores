import * as fs from 'fs';
import * as path from 'path';
import { signInvoiceXml, signCreditNoteXml } from 'ec-sri-invoice-signer';
import { logger } from '../../utils/Logger';
import { certificateEncryption } from '../../utils/CertificateEncryption';
import { RestaurantConfig } from '../../../domain/entities/RestaurantConfig';
import { SRIError } from '../../../domain/errors/CustomErrors';

/**
 * Handles digital signature of XML documents using P12 certificates
 * Implements XAdES-BES signature standard required by SRI
 * FIX S-03: Includes secure certificate buffer cleanup
 */
export class SRISigner {
    /**
     * Signs an invoice XML with digital certificate
     * @param xmlContent Unsigned XML content
     * @param config Optional restaurant config with certificate
     * @returns Signed XML with XAdES-BES signature
     */
    public async signInvoiceXml(xmlContent: string, config?: RestaurantConfig): Promise<string> {
        logger.info('[SRISigner] Signing invoice XML');
        return this.signXML(xmlContent, 'invoice', config);
    }

    /**
     * Signs a credit note XML with digital certificate
     * @param xmlContent Unsigned XML content
     * @param config Optional restaurant config with certificate
     * @returns Signed XML with XAdES-BES signature
     */
    public async signCreditNoteXml(xmlContent: string, config?: RestaurantConfig): Promise<string> {
        logger.info('[SRISigner] Signing credit note XML');
        return this.signXML(xmlContent, 'creditNote', config);
    }

    /**
     * Internal signing implementation
     * Handles certificate loading from database or filesystem
     * FIX S-03: Clears certificate buffer from memory after use
     */
    private async signXML(
        xmlContent: string,
        docType: 'invoice' | 'creditNote',
        config?: RestaurantConfig
    ): Promise<string> {
        let p12Buffer: Buffer | null = null;

        try {
            const { p12Base64, signaturePassword } = await this.loadCertificateCredentials(config);

            // Convert base64 to buffer
            logger.debug('[SRISigner] Converting P12 from base64 to buffer');
            p12Buffer = Buffer.from(p12Base64, 'base64');

            if (p12Buffer.length === 0) {
                throw new SRIError(
                    'El certificado .p12 está vacío o no se pudo cargar. Suba nuevamente el certificado.',
                    'SRI_CERTIFICATE_EMPTY'
                );
            }

            // Sign using appropriate function
            let signedXml: string;
            try {
                signedXml = docType === 'invoice'
                    ? signInvoiceXml(xmlContent, p12Buffer, { pkcs12Password: signaturePassword })
                    : signCreditNoteXml(xmlContent, p12Buffer, { pkcs12Password: signaturePassword });
            } catch (signingError: any) {
                // FIX S-03: Clear certificate buffer from memory on error
                if (p12Buffer) p12Buffer.fill(0);

                logger.error('[SRISigner] Critical signing error', { error: signingError.message });

                // Detect common node-forge errors related to bad password or corrupt file
                if (signingError.message?.includes('Only 8, 16, 24, or 32 bits supported') ||
                    signingError.message?.includes('Too few bytes to parse') ||
                    signingError.message?.includes('Invalid password')) {
                    throw new SRIError(
                        'Error de Firma Electrónica: La CONTRASEÑA del certificado es incorrecta o el archivo .p12 está CORRUPTO. ' +
                        'Por favor, suba nuevamente el certificado con la contraseña correcta en Configuración → Certificado.',
                        'SRI_CERTIFICATE_PASSWORD_INVALID'
                    );
                }
                // Re-throw as SRIError for other signing errors
                throw new SRIError(
                    `Error al firmar el documento: ${signingError.message}`,
                    'SRI_SIGNING_ERROR'
                );
            }

            // FIX S-03: Clear certificate buffer from memory after successful use
            // This prevents the private key material from lingering in memory
            if (p12Buffer) p12Buffer.fill(0);

            logger.info('[SRISigner] XML signed successfully');
            if (process.env.NODE_ENV === 'development') {
                logger.debug('[SRISigner] Signed XML preview', { preview: signedXml.substring(0, 200) });
            }

            return signedXml;

        } catch (error: any) {
            // Ensure buffer cleanup even in unexpected errors
            if (p12Buffer) p12Buffer.fill(0);

            logger.error('[SRISigner] Error signing XML', { error: error.message });
            throw error;
        }
    }

    /**
     * Loads certificate credentials from database or environment variables
     * Priority: 1. Database (encrypted), 2. Environment variables (legacy)
     */
    private async loadCertificateCredentials(
        config?: RestaurantConfig
    ): Promise<{ p12Base64: string; signaturePassword: string }> {
        let p12Base64: string;
        let signaturePassword: string;

        // 1. Try to load from database (encrypted)
        if (config?.sriCertificate) {
            logger.info('[SRISigner] Loading certificate from database');
            try {
                p12Base64 = certificateEncryption.decrypt(config.sriCertificate.certificateBase64);
                signaturePassword = certificateEncryption.decrypt(config.sriCertificate.passwordEncrypted);
            } catch (decryptError: any) {
                logger.error('[SRISigner] Failed to decrypt certificate', { error: decryptError.message });
                throw new SRIError(
                    'Error al desencriptar el certificado. Es posible que la clave maestra del servidor haya cambiado. ' +
                    'Por favor, suba nuevamente el certificado en Configuración → Certificado.',
                    'SRI_CERTIFICATE_DECRYPT_ERROR'
                );
            }
        } else {
            // 2. Fallback to environment variables (legacy)
            logger.warn('[SRISigner] Certificate not found in database, falling back to environment variables');
            const result = this.loadFromEnvironment();
            p12Base64 = result.p12Base64;
            signaturePassword = result.signaturePassword;
        }

        return { p12Base64, signaturePassword };
    }

    /**
     * Loads certificate from environment variables or filesystem
     * Legacy fallback for backward compatibility
     */
    private loadFromEnvironment(): { p12Base64: string; signaturePassword: string } {
        const signaturePath = process.env.SRI_SIGNATURE_PATH;
        const p12Base64Env = process.env.SRI_SIGNATURE_BASE64;
        const signaturePasswordEnv = process.env.SRI_SIGNATURE_PASSWORD;

        if ((!signaturePath && !p12Base64Env) || !signaturePasswordEnv) {
            throw new SRIError(
                'No se encontró configuración de firma electrónica. ' +
                'Por favor, suba su certificado .p12 en Configuración → Certificado.',
                'SRI_CERTIFICATE_NOT_CONFIGURED'
            );
        }

        let p12Base64: string;

        if (p12Base64Env) {
            p12Base64 = p12Base64Env;
        } else {
            // Read from file system
            let p12Path = path.resolve(process.cwd(), signaturePath!);

            // Smart Fallback for Render/Cloud Environments
            if (!fs.existsSync(p12Path)) {
                const filename = path.basename(signaturePath!);
                const renderSecretPath = path.join('/etc/secrets', filename);

                if (fs.existsSync(renderSecretPath)) {
                    logger.debug('[SRISigner] Using Render secret path for P12');
                    p12Path = renderSecretPath;
                } else {
                    throw new SRIError(
                        'No se encontró el archivo de certificado .p12. ' +
                        'Por favor, suba su certificado en Configuración → Certificado.',
                        'SRI_CERTIFICATE_FILE_NOT_FOUND'
                    );
                }
            }

            const p12FileBuffer = fs.readFileSync(p12Path);
            p12Base64 = p12FileBuffer.toString('base64');

            // FIX S-03: Clear file buffer immediately after converting to base64
            p12FileBuffer.fill(0);
        }

        return { p12Base64, signaturePassword: signaturePasswordEnv! };
    }
}
