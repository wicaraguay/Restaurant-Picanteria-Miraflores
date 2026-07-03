/**
 * Repositorio de Configuración del Restaurante - MongoDB
 * 
 * Implementa patrón Singleton para la configuración.
 * Solo existe UN documento de configuración en la BD.
 */

import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { RestaurantConfig } from '../../domain/entities/RestaurantConfig';
import { RestaurantConfigModel } from '../database/schemas/RestaurantConfigSchema';
import { logger } from '../utils/Logger';

const FIXED_CONFIG_ID = 'restaurant-config';

// Configuración por defecto
const DEFAULT_CONFIG: Omit<RestaurantConfig, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Picanteria Miraflores',
    slogan: 'Sabor Tradicional',
    phone: '+593 967812717',
    email: 'picanterimiraflores@gmail.com',
    address: 'Av. Eugenio Espejo Vía Antigua a Catamayo, calles entre collas e inés jiménez',
    websiteUrl: 'https://restoai.com',
    ruc: '1790012345001',
    businessName: 'Restaurante Ejemplo CIA LTDA',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/Guayaquil',
    locale: 'es-EC',
    brandColors: {
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        accent: '#10B981'
    },
    billing: {
        establishment: '001',
        emissionPoint: '001',
        regime: 'General',
        taxRate: 15,                     // IVA por defecto (Ecuador: 15%)
        // Secuenciales de PRODUCCIÓN
        currentSequenceFactura: 1,
        currentSequenceNotaCredito: 1,
        currentSequenceNotaVenta: 1,
        // Secuenciales de PRUEBAS
        testSequenceFactura: 1,
        testSequenceNotaCredito: 1,
        testSequenceNotaVenta: 1
    }
};

export class MongoRestaurantConfigRepository implements IRestaurantConfigRepository {

    private mapToEntity(doc: any): RestaurantConfig {
        return {
            id: doc._id,
            name: doc.name,
            logo: doc.logo,
            slogan: doc.slogan,
            phone: doc.phone,
            email: doc.email,
            address: doc.address,
            websiteUrl: doc.websiteUrl,
            ruc: doc.ruc,
            businessName: doc.businessName,
            fiscalEmail: doc.fiscalEmail,
            fiscalLogo: doc.fiscalLogo,
            fiscalAddress: doc.fiscalAddress,       // ← Dirección para la factura electrónica
            obligadoContabilidad: doc.obligadoContabilidad,
            contribuyenteEspecial: doc.contribuyenteEspecial,
            currency: doc.currency,
            currencySymbol: doc.currencySymbol,
            timezone: doc.timezone,
            locale: doc.locale,
            brandColors: {
                primary: doc.brandColors.primary,
                secondary: doc.brandColors.secondary,
                accent: doc.brandColors.accent
            },
            billing: {
                establishment: doc.billing.establishment,
                emissionPoint: doc.billing.emissionPoint,
                regime: doc.billing.regime,
                agenteRetencion: doc.billing.agenteRetencion,
                taxRate: doc.billing.taxRate ?? 15, // Fallback 15% para registros anteriores
                // Secuenciales de PRODUCCIÓN
                currentSequenceFactura: doc.billing.currentSequenceFactura,
                currentSequenceNotaCredito: doc.billing.currentSequenceNotaCredito,
                currentSequenceNotaVenta: doc.billing.currentSequenceNotaVenta,
                // Secuenciales de PRUEBAS
                testSequenceFactura: doc.billing.testSequenceFactura ?? 1,
                testSequenceNotaCredito: doc.billing.testSequenceNotaCredito ?? 1,
                testSequenceNotaVenta: doc.billing.testSequenceNotaVenta ?? 1
            },
            // Certificado Digital SRI
            // Only include if certificate has VALID data (uploadedAt is required for a valid certificate)
            sriCertificate: (doc.sriCertificate && doc.sriCertificate.uploadedAt && doc.sriCertificate.certificateBase64) ? {
                certificateBase64: doc.sriCertificate.certificateBase64,
                passwordEncrypted: doc.sriCertificate.passwordEncrypted,
                environment: doc.sriCertificate.environment,
                uploadedAt: doc.sriCertificate.uploadedAt,
                validUntil: doc.sriCertificate.validUntil,
                rucInCertificate: doc.sriCertificate.rucInCertificate
            } : undefined,
            // Configuración del Sitio Web Público (CMS)
            website: doc.website ? {
                hero: doc.website.hero,
                footer: doc.website.footer,
                theme: doc.website.theme,
                sections: doc.website.sections
            } : undefined,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt
        };
    }

    async get(): Promise<RestaurantConfig | null> {
        logger.debug('Getting restaurant config');

        const doc = await RestaurantConfigModel.findById(FIXED_CONFIG_ID);

        if (!doc) {
            logger.warn('Restaurant config not found');
            return null;
        }

        return this.mapToEntity(doc);
    }

    async getOrCreate(): Promise<RestaurantConfig> {
        logger.debug('Getting or creating restaurant config');

        let doc = await RestaurantConfigModel.findById(FIXED_CONFIG_ID);

        if (!doc) {
            logger.info('Creating default restaurant config');
            doc = await RestaurantConfigModel.create({
                _id: FIXED_CONFIG_ID,
                ...DEFAULT_CONFIG
            });
        }

        return this.mapToEntity(doc);
    }

    async update(config: Partial<RestaurantConfig>): Promise<RestaurantConfig> {
        logger.info('Updating restaurant config', { fields: Object.keys(config) });

        // Asegurar que existe primero
        await this.getOrCreate();

        // CRITICAL: MongoDB's $set with nested objects REPLACES the entire subdocument.
        // Example: { $set: { billing: { taxRate: 12 } } } would ERASE billing.currentSequenceFactura!
        // We flatten nested objects to dot-notation so MongoDB does a granular field-level merge:
        // { $set: { 'billing.taxRate': 12 } } → only updates taxRate, leaves other billing fields intact.
        //
        // EXCEPTION: Some objects like sriCertificate should be REPLACED entirely, not merged.
        // These are "atomic" objects where partial updates don't make sense.
        const REPLACE_WHOLE_OBJECT = ['sriCertificate', 'website']; // Objects that should be replaced, not merged

        const flatConfig: Record<string, any> = {};
        const unsetFields: Record<string, any> = {};

        // Use Object.keys to iterate, as Object.entries skips undefined values
        for (const key of Object.keys(config)) {
            const value = (config as any)[key];

            // Handle undefined values - need to $unset these fields in MongoDB
            if (value === undefined) {
                unsetFields[key] = '';
                continue;
            }

            // Check if this is an "atomic" object that should be replaced entirely
            if (REPLACE_WHOLE_OBJECT.includes(key)) {
                flatConfig[key] = value;
                continue;
            }

            if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                // Flatten one level deep (billing.*, brandColors.*)
                for (const [subKey, subValue] of Object.entries(value as Record<string, any>)) {
                    flatConfig[`${key}.${subKey}`] = subValue;
                }
            } else {
                flatConfig[key] = value;
            }
        }

        // Build update operation
        const updateOp: Record<string, any> = {};
        if (Object.keys(flatConfig).length > 0) {
            updateOp.$set = flatConfig;
        }
        if (Object.keys(unsetFields).length > 0) {
            updateOp.$unset = unsetFields;
        }

        // Actualizar usando dot-notation para merge granular
        const doc = await RestaurantConfigModel.findByIdAndUpdate(
            FIXED_CONFIG_ID,
            updateOp,
            { new: true, runValidators: false } // runValidators:false to avoid issues with partial updates
        );

        if (!doc) {
            throw new Error('Failed to update restaurant config');
        }

        logger.info('Restaurant config updated successfully');
        return this.mapToEntity(doc);
    }


    /**
     * Obtiene el ambiente SRI activo — FUENTE ÚNICA DE VERDAD.
     * Prioridad: sriCertificate.environment (BD, configurable desde la UI) > process.env.SRI_ENV > '1' (Pruebas)
     */
    public async getEnvironment(): Promise<'1' | '2'> {
        const config = await this.get();
        return (config?.sriCertificate?.environment as '1' | '2') || (process.env.SRI_ENV as '1' | '2') || '1';
    }

    /** @deprecated Alias interno — usar getEnvironment() */
    private async getCurrentEnvironment(): Promise<'1' | '2'> {
        return this.getEnvironment();
    }

    /**
     * Atomically retrieves and increments the sequential number for invoices.
     * Uses MongoDB's $inc operator with findOneAndUpdate to ensure atomicity.
     *
     * IMPORTANTE: Usa secuenciales SEPARADOS por ambiente:
     * - Producción ('2'): billing.currentSequenceFactura
     * - Pruebas ('1'): billing.testSequenceFactura
     *
     * Esto permite alternar entre ambientes sin afectar los secuenciales de producción.
     */
    async getNextSequential(): Promise<number> {
        const environment = await this.getCurrentEnvironment();
        const isProduction = environment === '2';
        const fieldName = isProduction ? 'billing.currentSequenceFactura' : 'billing.testSequenceFactura';

        logger.debug('Getting next sequential number for invoice', { environment, field: fieldName });

        // Ensure config exists first
        await this.getOrCreate();

        // Atomically increment and return the new value
        const doc = await RestaurantConfigModel.findByIdAndUpdate(
            FIXED_CONFIG_ID,
            { $inc: { [fieldName]: 1 } },
            {
                new: true, // Return the updated document
                upsert: true, // Create if doesn't exist
                runValidators: false // Skip validation for performance
            }
        );

        const nextSequential = isProduction
            ? doc?.billing?.currentSequenceFactura
            : doc?.billing?.testSequenceFactura;

        if (!doc || !doc.billing || typeof nextSequential !== 'number') {
            logger.error('Failed to get next sequential number', { environment });
            throw new Error('Failed to increment sequential counter');
        }

        logger.info('Generated new sequential number', {
            sequential: nextSequential,
            environment: isProduction ? 'Producción' : 'Pruebas'
        });

        // Invalidate cache so UI reflects the new sequence immediately
        try {
            const { cacheService } = await import('../utils/CacheService');
            await cacheService.invalidate('config:restaurant');
        } catch (e) {
            logger.warn('Failed to invalidate cache', { error: e });
        }

        return nextSequential;
    }

    /**
     * Atomically retrieves and increments the sequential number for credit notes.
     *
     * IMPORTANTE: Usa secuenciales SEPARADOS por ambiente:
     * - Producción ('2'): billing.currentSequenceNotaCredito
     * - Pruebas ('1'): billing.testSequenceNotaCredito
     */
    async getNextCreditNoteSequential(): Promise<number> {
        const environment = await this.getCurrentEnvironment();
        const isProduction = environment === '2';
        const fieldName = isProduction ? 'billing.currentSequenceNotaCredito' : 'billing.testSequenceNotaCredito';

        logger.debug('Getting next sequential number for credit note', { environment, field: fieldName });

        // Ensure config exists first
        await this.getOrCreate();

        // Atomically increment and return the new value
        const doc = await RestaurantConfigModel.findByIdAndUpdate(
            FIXED_CONFIG_ID,
            { $inc: { [fieldName]: 1 } },
            {
                new: true, // Return the updated document
                upsert: true, // Create if doesn't exist
                runValidators: false // Skip validation for performance
            }
        );

        const nextSequential = isProduction
            ? doc?.billing?.currentSequenceNotaCredito
            : doc?.billing?.testSequenceNotaCredito;

        if (!doc || !doc.billing || typeof nextSequential !== 'number') {
            logger.error('Failed to get next sequential number for credit note', { environment });
            throw new Error('Failed to increment credit note sequential counter');
        }

        logger.info('Generated new sequential number for credit note', {
            sequential: nextSequential,
            environment: isProduction ? 'Producción' : 'Pruebas'
        });

        try {
            const { cacheService } = await import('../utils/CacheService');
            await cacheService.invalidate('config:restaurant');
        } catch (e) {
            logger.warn('Failed to invalidate cache', { error: e });
        }

        return nextSequential;
    }
}
