/**
 * Utilidades para Temas Dinámicos
 * 
 * Funciones para aplicar colores de marca personalizados
 * mediante CSS variables en el documento.
 */

import { RestaurantConfig } from '../types';
import { logger } from './logger';

/**
 * Convierte un color hex a RGB
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
};

/**
 * Genera variantes de un color (hover, disabled, etc.)
 */
const generateColorVariants = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return {};

    return {
        base: hex,
        rgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
        hover: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`,
        light: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
        disabled: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`,
    };
};

/**
 * Aplica el tema personalizado al documento
 */
export const applyBrandTheme = (config: RestaurantConfig): void => {
    try {
        const { brandColors } = config;

        // Generar variantes de colores
        const primaryVariants = generateColorVariants(brandColors.primary);
        const secondaryVariants = generateColorVariants(brandColors.secondary);
        const accentVariants = generateColorVariants(brandColors.accent);

        // Crear o actualizar el style element
        let styleElement = document.getElementById('brand-theme-styles') as HTMLStyleElement;

        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'brand-theme-styles';
            document.head.appendChild(styleElement);
        }

        // Definir CSS con variables personalizadas
        styleElement.textContent = `
      :root {
        /* Colores primarios */
        --brand-primary: ${primaryVariants.base};
        --brand-primary-rgb: ${primaryVariants.rgb};
        --brand-primary-hover: ${primaryVariants.hover};
        --brand-primary-light: ${primaryVariants.light};
        --brand-primary-disabled: ${primaryVariants.disabled};
        
        /* Colores secundarios */
        --brand-secondary: ${secondaryVariants.base};
        --brand-secondary-rgb: ${secondaryVariants.rgb};
        --brand-secondary-hover: ${secondaryVariants.hover};
        --brand-secondary-light: ${secondaryVariants.light};
        
        /* Colores de acento */
        --brand-accent: ${accentVariants.base};
        --brand-accent-rgb: ${accentVariants.rgb};
        --brand-accent-hover: ${accentVariants.hover};
        --brand-accent-light: ${accentVariants.light};
      }
      
      /* Aplicar colores a elementos específicos */
      .bg-blue-600,
      .bg-blue-500 {
        background-color: var(--brand-primary) !important;
      }
      
      .hover\\:bg-blue-700:hover,
      .hover\\:bg-blue-600:hover {
        background-color: var(--brand-primary-hover) !important;
      }
      
      .text-blue-600,
      .text-blue-500 {
        color: var(--brand-primary) !important;
      }
      
      .border-blue-500,
      .border-blue-600 {
        border-color: var(--brand-primary) !important;
      }
      
      .focus\\:border-blue-500:focus,
      .focus\\:ring-blue-500:focus {
        border-color: var(--brand-primary) !important;
        --tw-ring-color: var(--brand-primary-light) !important;
      }
      
      /* Gradientes */
      .bg-gradient-to-r.from-blue-600 {
        background-image: linear-gradient(to right, var(--brand-primary), var(--brand-primary-hover)) !important;
      }
    `;

        logger.info('Brand theme applied', { colors: brandColors });
    } catch (error) {
        logger.error('Error applying brand theme', error);
    }
};

/**
 * Remueve el tema personalizado
 */
export const removeBrandTheme = (): void => {
    const styleElement = document.getElementById('brand-theme-styles');
    if (styleElement) {
        styleElement.remove();
        logger.info('Brand theme removed');
    }
};
