/**
 * Entidad de Configuración del Restaurante
 * 
 * Define la estructura de la configuración global del restaurante.
 * Esta configuración es única por restaurante (singleton en BD).
 */

export interface RestaurantConfig {
    id: string;

    // Información básica
    name: string;
    logo?: string;
    slogan?: string;

    // Información de contacto
    phone: string;
    email: string;
    address: string;
    website?: string;

    // Información fiscal (Ecuador)
    ruc: string;
    businessName: string;
    fiscalEmail?: string;
    fiscalLogo?: string;
    obligadoContabilidad?: boolean;
    contribuyenteEspecial?: string;

    // Configuración regional
    currency: string;
    currencySymbol: string;
    timezone: string;
    locale: string;

    // Personalización de marca
    brandColors: {
        primary: string;
        secondary: string;
        accent: string;
    };

    // Configuración de facturación SRI
    billing: {
        establishment: string;
        emissionPoint: string;
        regime: 'General' | 'RIMPE - Negocio Popular' | 'RIMPE - Emprendedor';
        currentSequenceFactura: number;
        currentSequenceNotaCredito: number;
        currentSequenceNotaVenta: number;
    };

    // Metadata
    createdAt?: Date;
    updatedAt?: Date;
}
