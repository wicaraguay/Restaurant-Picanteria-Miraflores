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
export type ViewType = 'dashboard' | 'orders' | 'customers' | 'menu' | 'kitchen' | 'hr' | 'settings' | 'billing';

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
  website?: string;

  // Información fiscal (Ecuador) - CENTRALIZADA
  ruc: string;
  businessName: string;
  fiscalEmail?: string;
  fiscalLogo?: string; // Logo específico para facturas
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
}