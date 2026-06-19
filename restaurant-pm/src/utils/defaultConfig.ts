/**
 * Configuración por Defecto del Restaurante
 *
 * Define los valores iniciales para un nuevo restaurante.
 * Estos valores se usan cuando no hay configuración guardada.
 */

import { RestaurantConfig, WebsiteConfig } from '../types';

/**
 * Configuración por defecto del sitio web público
 */
export const defaultWebsiteConfig: WebsiteConfig = {
    hero: {
        slides: [
            {
                id: 'slide-1',
                imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=2069&auto=format&fit=crop',
                title: 'Fritada Tradicional',
                subtitle: 'El auténtico sabor de nuestra tierra con carne de cerdo premium y sazón artesanal.',
            },
            {
                id: 'slide-2',
                imageUrl: 'https://images.unsplash.com/photo-1599481238640-4c1288750d7a?q=80&w=2070&auto=format&fit=crop',
                title: 'Chicharrones Crujientes',
                subtitle: 'La textura perfecta y el sabor inigualable de la mejor picantería de la ciudad.',
            },
            {
                id: 'slide-3',
                imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=2071&auto=format&fit=crop',
                title: 'Sancocho Especial',
                subtitle: 'Un caldo sustancioso y reconfortante preparado con ingredientes frescos y seleccionados.',
            },
            {
                id: 'slide-4',
                imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=2067&auto=format&fit=crop',
                title: 'Sabor Criollo',
                subtitle: 'Donde la tradición se encuentra con la excelencia en cada bocado de nuestra cocina.',
            },
        ],
        badge: '🍲 Tradición desde el 2000 🍲',
        ctaText: 'Ver Nuestra Carta 🍽️',
        autoplay: true,
        interval: 6000,
    },
    footer: {
        aboutText: 'Tradición familiar desde el 2000. Preparamos cada plato con amor y los mejores ingredientes de nuestra tierra. 🍲',
        schedules: [
            { days: 'Viernes a Domingo', hours: '09:00 AM - 09:00 PM', isClosed: false },
            { days: 'Lunes a Jueves', hours: 'Cerrado', isClosed: true },
        ],
        socialLinks: [
            { platform: 'whatsapp', url: 'https://wa.me/593967812717' },
            { platform: 'instagram', url: 'https://www.instagram.com/picanteriamiraflores/' },
            { platform: 'facebook', url: 'https://www.facebook.com/PicanteriaMiraflores' },
        ],
    },
    theme: {
        colors: {
            primary: '#E65100',
            secondary: '#F57C00',
            accent: '#FFB74D',
            background: '#FFF8E1',
            text: '#5D4037',
        },
        fonts: {
            heading: 'Fredoka',
            body: 'Nunito',
        },
    },
    sections: {
        showHero: true,
        showMenu: true,
        showFooter: true,
    },
};

/**
 * Configuración por defecto del sistema
 */
export const defaultRestaurantConfig: RestaurantConfig = {
    // Información básica
    name: 'Picanteria Miraflores',
    logo: undefined,
    slogan: 'Sabor Tradicional',

    // Información de contacto
    phone: '+593 99 123 4567',
    email: 'picanteriamiraflores@gmail.com',
    address: 'Av. Principal 123, Quito, Ecuador',
    websiteUrl: 'https://restoai.com',

    // Información fiscal (Ecuador)
    ruc: '1790012345001',
    businessName: 'Restaurante Ejemplo CIA LTDA',
    fiscalAddress: '', // Dirección que aparece en las facturas electrónicas

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
        taxRate: 15,               // Tarifa IVA vigente en Ecuador
        // Secuenciales
        currentSequenceFactura: 1,
        currentSequenceNotaVenta: 1,
        currentSequenceNotaCredito: 1,
    },

    // Configuración del Sitio Web Público
    website: defaultWebsiteConfig,
};
