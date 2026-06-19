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
    websiteUrl?: string;  // URL del sitio web del restaurante (ej: "https://mirestaurante.com")

    // Información fiscal (Ecuador)
    ruc: string;
    businessName: string;
    fiscalEmail?: string;
    fiscalLogo?: string;
    fiscalAddress?: string;         // Dirección que aparece en la factura electrónica
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
        agenteRetencion?: string;
        taxRate: number;               // Tarifa IVA activa (ej: 15, 12, 8, 0)
        currentSequenceFactura: number;
        currentSequenceNotaCredito: number;
        currentSequenceNotaVenta: number;
    };

    // Certificado Digital SRI (firma electrónica .p12)
    sriCertificate?: {
        certificateBase64: string;      // Certificado .p12 en base64 ENCRIPTADO
        passwordEncrypted: string;      // Contraseña del certificado ENCRIPTADA
        environment: '1' | '2';         // 1 = Pruebas, 2 = Producción
        uploadedAt: Date;
        validUntil?: Date;              // Fecha de expiración del certificado
        rucInCertificate?: string;      // RUC extraído del certificado (validación)
    };

    // Configuración del Sitio Web Público (CMS)
    website?: WebsiteConfig;

    // Metadata
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Configuración del Sitio Web Público
 */
export interface WebsiteConfig {
    hero: {
        slides: HeroSlide[];
        badge?: string;
        ctaText?: string;
        autoplay?: boolean;
        interval?: number;
    };
    footer: {
        aboutText?: string;
        schedules: Schedule[];
        socialLinks: SocialLink[];
    };
    theme: {
        colors: {
            primary: string;
            secondary: string;
            accent: string;
            background: string;
            text: string;
        };
        fonts?: {
            heading: string;
            body: string;
        };
    };
    sections?: {
        showHero?: boolean;
        showMenu?: boolean;
        showFooter?: boolean;
    };
}

export interface HeroSlide {
    id: string;
    imageUrl: string;
    title: string;
    subtitle: string;
}

export interface Schedule {
    days: string;
    hours: string;
    isClosed?: boolean;
}

export interface SocialLink {
    platform: 'whatsapp' | 'instagram' | 'facebook' | 'twitter' | 'tiktok';
    url: string;
}
