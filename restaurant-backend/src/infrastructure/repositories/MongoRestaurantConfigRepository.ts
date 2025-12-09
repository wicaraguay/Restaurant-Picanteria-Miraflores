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
    name: 'RestoAI',
    slogan: 'Sistema de Gestión Gastronómica',
    phone: '+593 99 123 4567',
    email: 'contacto@restoai.com',
    address: 'Av. Principal 123, Quito, Ecuador',
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
}
