/**
 * Configuración por Defecto del Restaurante
 * 
 * Define los valores iniciales para un nuevo restaurante.
 * Estos valores se usan cuando no hay configuración guardada.
 */

import { RestaurantConfig } from '../types';

/**
 * Configuración por defecto del sistema
 */
export const defaultRestaurantConfig: RestaurantConfig = {
    // Información básica
    name: 'RestoAI',
    logo: undefined,
    slogan: 'Sistema de Gestión Gastronómica',

    // Información de contacto
    phone: '+593 99 123 4567',
    email: 'contacto@restoai.com',
    address: 'Av. Principal 123, Quito, Ecuador',
    website: 'https://restoai.com',

    // Información fiscal (Ecuador)
    ruc: '1790012345001',
    businessName: 'Restaurante Ejemplo CIA LTDA',

    // Configuración regional
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/Guayaquil',
    locale: 'es-EC',

    // Personalización de marca
    brandColors: {
        primary: '#3B82F6', // Azul
        secondary: '#8B5CF6', // Púrpura
        accent: '#10B981', // Verde
    },

    // Configuración de facturación SRI - TODO CENTRALIZADO
    billing: {
        establishment: '001',
        emissionPoint: '001',
        regime: 'General',
        // Secuenciales
        currentSequenceFactura: 1,
        currentSequenceNotaVenta: 1,
    },
};
