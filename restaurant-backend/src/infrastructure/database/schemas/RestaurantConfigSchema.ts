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
    websiteUrl: { type: String },  // URL del sitio web (ej: "https://mirestaurante.com")

    // Información fiscal
    ruc: { type: String, required: true },
    businessName: { type: String, required: true },
    fiscalEmail: { type: String },
    fiscalLogo: { type: String },
    fiscalAddress: { type: String }, // Dirección que aparece en las facturas electrónicas
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
        agenteRetencion: { type: String },
        taxRate: { type: Number, default: 15, min: 0, max: 100 }, // Tarifa IVA configurable (ej: 15, 12, 8, 0)
        // Secuenciales de PRODUCCIÓN (ambiente '2')
        currentSequenceFactura: { type: Number, required: true, default: 1 },
        currentSequenceNotaCredito: { type: Number, required: true, default: 1 },
        currentSequenceNotaVenta: { type: Number, required: true, default: 1 },
        // Secuenciales de PRUEBAS (ambiente '1') - separados para no afectar producción
        testSequenceFactura: { type: Number, default: 1 },
        testSequenceNotaCredito: { type: Number, default: 1 },
        testSequenceNotaVenta: { type: Number, default: 1 }
    },

    // Certificado Digital SRI (firma electrónica .p12)
    sriCertificate: {
        certificateBase64: { type: String },       // Certificado .p12 en base64 ENCRIPTADO
        passwordEncrypted: { type: String },       // Contraseña del certificado ENCRIPTADA
        environment: { type: String, enum: ['1', '2'] }, // 1 = Pruebas, 2 = Producción
        uploadedAt: { type: Date },
        validUntil: { type: Date },                // Fecha de expiración del certificado
        rucInCertificate: { type: String }         // RUC extraído del certificado (validación)
    },

    // Configuración del Sitio Web Público (CMS)
    website: {
        // Hero / Carrusel
        hero: {
            slides: [{
                id: { type: String, required: true },
                imageUrl: { type: String, required: true },
                title: { type: String, required: true },
                subtitle: { type: String }
            }],
            badge: { type: String },
            ctaText: { type: String },
            autoplay: { type: Boolean, default: true },
            interval: { type: Number, default: 6000 }
        },
        // Footer
        footer: {
            aboutText: { type: String },
            schedules: [{
                days: { type: String, required: true },
                hours: { type: String, required: true },
                isClosed: { type: Boolean, default: false }
            }],
            socialLinks: [{
                platform: { type: String, enum: ['whatsapp', 'instagram', 'facebook', 'twitter', 'tiktok'], required: true },
                url: { type: String, required: true }
            }]
        },
        // Tema / Colores
        theme: {
            colors: {
                primary: { type: String },
                secondary: { type: String },
                accent: { type: String },
                background: { type: String },
                text: { type: String }
            },
            fonts: {
                heading: { type: String },
                body: { type: String }
            }
        },
        // Secciones visibles
        sections: {
            showHero: { type: Boolean, default: true },
            showMenu: { type: Boolean, default: true },
            showFooter: { type: Boolean, default: true }
        }
    },

    // Metadata para migraciones y configuraciones internas
    metadata: { type: Object, default: {} }
}, {
    timestamps: true,
    collection: 'restaurantconfig'
});

export const RestaurantConfigModel = mongoose.model('RestaurantConfig', RestaurantConfigSchema);
