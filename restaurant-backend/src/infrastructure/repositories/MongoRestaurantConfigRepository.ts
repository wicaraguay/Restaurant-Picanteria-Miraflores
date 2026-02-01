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
    website: 'https://restoai.com',
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
        currentSequenceFactura: 1,
        currentSequenceNotaCredito: 1,
        currentSequenceNotaVenta: 1
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
            website: doc.website,
            ruc: doc.ruc,
            businessName: doc.businessName,
            fiscalEmail: doc.fiscalEmail,
            fiscalLogo: doc.fiscalLogo,
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
                currentSequenceFactura: doc.billing.currentSequenceFactura,
                currentSequenceNotaCredito: doc.billing.currentSequenceNotaCredito,
                currentSequenceNotaVenta: doc.billing.currentSequenceNotaVenta
            },
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

        // Actualizar
        const doc = await RestaurantConfigModel.findByIdAndUpdate(
            FIXED_CONFIG_ID,
            { $set: config },
            { new: true, runValidators: true }
        );

        if (!doc) {
            throw new Error('Failed to update restaurant config');
        }

        logger.info('Restaurant config updated successfully');
        return this.mapToEntity(doc);
    }

    /**
     * Atomically retrieves and increments the sequential number for invoices.
     * Uses MongoDB's $inc operator with findOneAndUpdate to ensure atomicity.
     * If config doesn't exist, creates it with default values.
     */
    async getNextSequential(): Promise<number> {
        logger.debug('Getting next sequential number for invoice');

        // Ensure config exists first
        await this.getOrCreate();

        // Atomically increment and return the new value
        const doc = await RestaurantConfigModel.findByIdAndUpdate(
            FIXED_CONFIG_ID,
            { $inc: { 'billing.currentSequenceFactura': 1 } },
            {
                new: true, // Return the updated document
                upsert: true, // Create if doesn't exist
                runValidators: false // Skip validation for performance
            }
        );

        if (!doc || !doc.billing || typeof doc.billing.currentSequenceFactura !== 'number') {
            logger.error('Failed to get next sequential number');
            throw new Error('Failed to increment sequential counter');
        }

        const nextSequential = doc.billing.currentSequenceFactura;
        logger.info('Generated new sequential number', { sequential: nextSequential });

        // Invalidate cache so UI reflects the new sequence immediately
        // Note: Using dynamic import or direct import if cyclic dependency allows, 
        // but robustly we should clear the cache key used in ConfigController.
        try {
            // We need to import cacheService at top of file, or use if available. 
            // Since this is infrastructure repo, it can import cacheService.
            const { cacheService } = await import('../utils/CacheService');
            await cacheService.invalidate('config:restaurant');
        } catch (e) {
            console.error('Failed to invalidate cache', e);
        }

        return nextSequential;
    }

    /**
     * Atomically retrieves and increments the sequential number for credit notes.
     */
    async getNextCreditNoteSequential(): Promise<number> {
        logger.debug('Getting next sequential number for credit note');

        // Ensure config exists first
        await this.getOrCreate();

        // Atomically increment and return the new value
        const doc = await RestaurantConfigModel.findByIdAndUpdate(
            FIXED_CONFIG_ID,
            { $inc: { 'billing.currentSequenceNotaCredito': 1 } },
            {
                new: true, // Return the updated document
                upsert: true, // Create if doesn't exist
                runValidators: false // Skip validation for performance
            }
        );

        if (!doc || !doc.billing || typeof doc.billing.currentSequenceNotaCredito !== 'number') {
            logger.error('Failed to get next sequential number for credit note');
            throw new Error('Failed to increment credit note sequential counter');
        }

        const nextSequential = doc.billing.currentSequenceNotaCredito;
        logger.info('Generated new sequential number for credit note', { sequential: nextSequential });

        try {
            const { cacheService } = await import('../utils/CacheService');
            await cacheService.invalidate('config:restaurant');
        } catch (e) {
            console.error('Failed to invalidate cache', e);
        }

        return nextSequential;
    }
}
