/**
 * Utilidades para Manejo de Imágenes
 * 
 * Funciones para cargar, validar, redimensionar y comprimir imágenes.
 * Útil para logos y otras imágenes del sistema.
 */

import { logger } from './logger';

/**
 * Tamaño máximo de imagen en bytes (500KB)
 */
const MAX_IMAGE_SIZE = 500 * 1024;

/**
 * Formatos de imagen permitidos
 */
const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

/**
 * Convierte un archivo de imagen a base64
 */
export const imageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Error al leer la imagen'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Error al leer el archivo'));
        };

        reader.readAsDataURL(file);
    });
};

/**
 * Valida formato y tamaño de imagen
 */
export const validateImage = (file: File): { valid: boolean; error?: string } => {
    // Validar formato
    if (!ALLOWED_FORMATS.includes(file.type)) {
        return {
            valid: false,
            error: 'Formato no permitido. Use JPG, PNG, WEBP o SVG.',
        };
    }

    // Validar tamaño
    if (file.size > MAX_IMAGE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return {
            valid: false,
            error: `Imagen demasiado grande (${sizeMB}MB). Máximo 500KB.`,
        };
    }

    return { valid: true };
};

/**
 * Redimensiona una imagen manteniendo la proporción
 */
export const resizeImage = (
    base64: string,
    maxWidth: number,
    maxHeight: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Calcular nuevas dimensiones manteniendo proporción
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }

            // Crear canvas y redimensionar
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('No se pudo crear el contexto del canvas'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Convertir a base64
            const resized = canvas.toDataURL('image/png');
            resolve(resized);
        };

        img.onerror = () => {
            reject(new Error('Error al cargar la imagen'));
        };

        img.src = base64;
    });
};

/**
 * Procesa una imagen: valida, redimensiona y convierte a base64
 */
export const processImage = async (
    file: File,
    maxWidth: number = 200,
    maxHeight: number = 200
): Promise<{ success: boolean; data?: string; error?: string }> => {
    try {
        // Validar
        const validation = validateImage(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Convertir a base64
        const base64 = await imageToBase64(file);

        // Redimensionar si no es SVG
        let processed = base64;
        if (file.type !== 'image/svg+xml') {
            processed = await resizeImage(base64, maxWidth, maxHeight);
        }

        logger.info('Image processed successfully', {
            originalSize: file.size,
            type: file.type,
        });

        return { success: true, data: processed };
    } catch (error) {
        logger.error('Error processing image', error);
        return {
            success: false,
            error: 'Error al procesar la imagen',
        };
    }
};
