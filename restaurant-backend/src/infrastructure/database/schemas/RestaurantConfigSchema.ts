/**
 * Schema de MongoDB para Configuración del Restaurante
 * 
 * Solo debe existir UN documento de configuración en la colección.
 * Se usa un ID fijo para garantizar singleton.
 */

import mongoose, { Schema } from 'mongoose';

const RestaurantConfigSchema = new Schema({
    _id: { type: String, default: 'restaurant-config', required: true },

    // Información básica
    name: { type: String, required: true },
    logo: { type: String },
    slogan: { type: String },

    // Información de contacto
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    website: { type: String },

    // Información fiscal
    ruc: { type: String, required: true },
    businessName: { type: String, required: true },
    fiscalEmail: { type: String },
    fiscalLogo: { type: String },
    obligadoContabilidad: { type: Boolean, default: false },
    contribuyenteEspecial: { type: String },

    // Configuración regional
    currency: { type: String, required: true, default: 'USD' },
    currencySymbol: { type: String, required: true, default: '$' },
    timezone: { type: String, required: true, default: 'America/Guayaquil' },
    locale: { type: String, required: true, default: 'es-EC' },

    // Colores de marca
    brandColors: {
        primary: { type: String, required: true },
        secondary: { type: String, required: true },
        accent: { type: String, required: true }
    },

    // Configuración de facturación
    billing: {
        establishment: { type: String, required: true },
        emissionPoint: { type: String, required: true },
        regime: {
            type: String,
            required: true,
            enum: ['General', 'RIMPE - Negocio Popular', 'RIMPE - Emprendedor']
        },
        currentSequenceFactura: { type: Number, required: true, default: 1 },
        currentSequenceNotaCredito: { type: Number, required: true, default: 1 },
        currentSequenceNotaVenta: { type: Number, required: true, default: 1 }
    }
}, {
    timestamps: true,
    collection: 'restaurantconfig'
});

export const RestaurantConfigModel = mongoose.model('RestaurantConfig', RestaurantConfigSchema);
