/**
 * Tipos e Interfaces del Frontend
 * 
 * Define todas las interfaces y tipos utilizados en la aplicación.
 * Incluye tipos para entidades del dominio y respuestas de API.
 */

import type { Dispatch, SetStateAction } from 'react';

/**
 * Tipo para vistas de la aplicación
 */
export type ViewType = 'dashboard' | 'orders' | 'customers' | 'menu' | 'categories' | 'kitchen' | 'hr' | 'settings' | 'billing' | 'whatsapp' | 'website';

/**
 * Tipo helper para setState de React
 */
export type SetState<T> = Dispatch<SetStateAction<T>>;






/**
 * Configuración del Restaurante - White Label
 * Permite personalizar completamente el sistema para cada restaurante
 */
export interface RestaurantConfig {
  // Información básica
  name: string;
  logo?: string; // URL o base64 de la imagen
  slogan?: string;

  // Información de contacto
  phone: string;
  email: string;
  address: string;
  websiteUrl?: string;  // URL del sitio web del restaurante (ej: "https://mirestaurante.com")

  // Información fiscal (Ecuador) - CENTRALIZADA
  ruc: string;
  businessName: string;
  fiscalEmail?: string;
  fiscalLogo?: string; // Logo específico para facturas
  fiscalAddress?: string; // Dirección que aparece en la factura electrónica
  obligadoContabilidad?: boolean;
  contribuyenteEspecial?: string; // Número de resolución (opcional)

  // Configuración regional
  currency: string; // 'USD', 'EUR', etc.
  currencySymbol: string; // '$', '€', etc.
  timezone: string; // 'America/Guayaquil'
  locale: string; // 'es-EC'

  // Personalización de marca
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };

  // Configuración de facturación SRI - TODO CENTRALIZADO AQUÍ
  billing: {
    establishment: string;
    emissionPoint: string;
    regime: 'General' | 'RIMPE - Negocio Popular' | 'RIMPE - Emprendedor';
    // Secuenciales
    currentSequenceFactura: number;
    currentSequenceNotaCredito: number;
    currentSequenceNotaVenta: number;
    // Impuestos
    taxRate?: number; // Porcentaje (e.g., 15 for 15%)
    environment?: '1' | '2'; // 1: Pruebas, 2: Producción
  };

  // Certificado Digital SRI (firma electrónica .p12)
  sriCertificate?: {
    certificateBase64: string;      // Certificado .p12 en base64 ENCRIPTADO (solo para lectura)
    passwordEncrypted: string;      // Contraseña ENCRIPTADA (solo para lectura)
    environment: '1' | '2';         // 1 = Pruebas, 2 = Producción
    uploadedAt: Date;
    validUntil?: Date;              // Fecha de expiración
    rucInCertificate?: string;      // RUC del certificado
  };

  // Configuración del Sitio Web Público (CMS)
  website?: WebsiteConfig;
}

/**
 * Configuración del Sitio Web Público
 * Permite personalizar el contenido de la página pública del menú
 */
export interface WebsiteConfig {
  // Hero / Carrusel
  hero: {
    slides: HeroSlide[];
    badge?: string;           // Texto del badge (ej: "🍲 Tradición desde el 2000 🍲")
    ctaText?: string;         // Texto del botón CTA
    autoplay?: boolean;
    interval?: number;        // Milisegundos entre slides
  };

  // Footer
  footer: {
    aboutText?: string;       // Descripción del restaurante
    schedules: Schedule[];    // Horarios de atención
    socialLinks: SocialLink[];
  };

  // Tema / Colores extendidos
  theme: {
    colors: {
      primary: string;        // Color principal (ej: #E65100)
      secondary: string;      // Color secundario (ej: #F57C00)
      accent: string;         // Color de acento (ej: #FFB74D)
      background: string;     // Fondo de página (ej: #FFF8E1)
      text: string;           // Color de texto (ej: #5D4037)
    };
    fonts?: {
      heading: string;        // Fuente para títulos (ej: "Fredoka")
      body: string;           // Fuente para cuerpo (ej: "Nunito")
    };
  };

  // Secciones visibles
  sections?: {
    showHero?: boolean;
    showMenu?: boolean;
    showFooter?: boolean;
  };
}

/**
 * Slide del carrusel Hero
 */
export interface HeroSlide {
  id: string;
  imageUrl: string;           // URL de Cloudinary
  title: string;
  subtitle: string;
}

/**
 * Horario de atención
 */
export interface Schedule {
  days: string;               // "Viernes a Domingo"
  hours: string;              // "09:00 AM - 09:00 PM"
  isClosed?: boolean;
}

/**
 * Link a red social
 */
export interface SocialLink {
  platform: 'whatsapp' | 'instagram' | 'facebook' | 'twitter' | 'tiktok';
  url: string;
}