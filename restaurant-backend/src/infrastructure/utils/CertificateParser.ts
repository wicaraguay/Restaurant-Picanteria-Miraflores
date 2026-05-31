/**
 * @file CertificateParser.ts
 * @description Utilidad para parsear certificados digitales .p12 y extraer información
 *
 * @purpose
 * Extrae información crítica de certificados digitales:
 * - Fecha de vencimiento (validUntil)
 * - RUC del titular (para validación)
 * - Información del emisor y sujeto
 *
 * @security
 * - Solo lee información pública del certificado
 * - No expone la clave privada
 * - Valida que el certificado sea válido y no esté vencido
 *
 * @layer Infrastructure - Utility
 */

import forge from 'node-forge';
import { logger } from './Logger';

export interface CertificateInfo {
    validUntil: Date;
    validFrom: Date;
    ruc?: string;           // RUC extraído del CN o SN
    subject: string;        // Nombre completo del sujeto
    issuer: string;         // Nombre del emisor (CA)
    serialNumber: string;   // Número de serie del certificado
    isExpired: boolean;     // Si el certificado ya venció
}

export class CertificateParser {
    /**
     * Parsea un certificado .p12 y extrae información relevante
     * @param certificateBase64 Certificado .p12 en base64 (sin encriptar)
     * @param password Contraseña del certificado (sin encriptar)
     * @returns Información del certificado
     */
    static parse(certificateBase64: string, password: string): CertificateInfo {
        try {
            // Decodificar base64 a bytes
            const certBytes = forge.util.decode64(certificateBase64);

            // Convertir a ASN.1
            const asn1 = forge.asn1.fromDer(certBytes);

            // Parsear el PKCS#12
            const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

            // Obtener el certificado del bag
            const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
            const certBag = certBags[forge.pki.oids.certBag];

            if (!certBag || certBag.length === 0) {
                throw new Error('No certificate found in .p12 file');
            }

            // Tomar el primer certificado
            const cert = certBag[0].cert;

            if (!cert) {
                throw new Error('Certificate is empty');
            }

            // Extraer información del subject
            const subject = cert.subject.attributes
                .map((attr: any) => `${attr.shortName}=${attr.value}`)
                .join(', ');

            // Extraer información del issuer
            const issuer = cert.issuer.attributes
                .map((attr: any) => `${attr.shortName}=${attr.value}`)
                .join(', ');

            // Intentar extraer el RUC del Common Name (CN) o Serial Number (SN)
            const ruc = this.extractRUC(cert);

            // Validar que el certificado no esté vencido
            const now = new Date();
            const isExpired = cert.validity.notAfter < now;

            logger.info('[CertificateParser] Certificate parsed successfully', {
                subject,
                validUntil: cert.validity.notAfter,
                isExpired,
                ruc
            });

            return {
                validUntil: cert.validity.notAfter,
                validFrom: cert.validity.notBefore,
                ruc,
                subject,
                issuer,
                serialNumber: cert.serialNumber,
                isExpired
            };
        } catch (error: any) {
            logger.error('[CertificateParser] Failed to parse certificate', error);

            if (error.message?.includes('Invalid password')) {
                throw new Error('Invalid certificate password');
            }

            if (error.message?.includes('Invalid PKCS#12')) {
                throw new Error('Invalid .p12 certificate file');
            }

            throw new Error(`Failed to parse certificate: ${error.message}`);
        }
    }

    /**
     * Extrae el RUC del certificado (busca en CN o serialNumber)
     * En Ecuador, el RUC suele estar en el CN o en el serialNumber
     */
    private static extractRUC(cert: any): string | undefined {
        try {
            // Buscar en Common Name (CN)
            const cnAttr = cert.subject.attributes.find(
                (attr: any) => attr.shortName === 'CN' || attr.name === 'commonName'
            );

            if (cnAttr) {
                // Buscar patrón de RUC (13 dígitos en Ecuador)
                const rucMatch = cnAttr.value.match(/\b(\d{13})\b/);
                if (rucMatch) {
                    return rucMatch[1];
                }
            }

            // Buscar en Serial Number (SN)
            const snAttr = cert.subject.attributes.find(
                (attr: any) => attr.shortName === 'SN' || attr.name === 'serialNumber'
            );

            if (snAttr) {
                const rucMatch = snAttr.value.match(/\b(\d{13})\b/);
                if (rucMatch) {
                    return rucMatch[1];
                }
            }

            // Si no se encuentra, retornar undefined
            logger.warn('[CertificateParser] RUC not found in certificate');
            return undefined;
        } catch (error) {
            logger.warn('[CertificateParser] Failed to extract RUC', error);
            return undefined;
        }
    }
}
