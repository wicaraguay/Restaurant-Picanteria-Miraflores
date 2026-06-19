import { logger } from './logger';

export const CLOUDINARY_CLOUD_NAME = 'dxxf1gy0f';
export const CLOUDINARY_UPLOAD_PRESET = 'picanteria-miraflores';

// Límite de Cloudinary free tier: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const TARGET_FILE_SIZE = 8 * 1024 * 1024; // 8MB target para margen de seguridad

/**
 * Comprime una imagen usando Canvas API
 * Reduce dimensiones y calidad hasta alcanzar el tamaño objetivo
 */
const compressImage = async (file: File, maxSizeMB: number = 8): Promise<File> => {
    const maxSize = maxSizeMB * 1024 * 1024;

    // Si ya está dentro del límite, retornar original
    if (file.size <= maxSize) {
        return file;
    }

    logger.info(`Comprimiendo imagen: ${(file.size / 1024 / 1024).toFixed(2)}MB → objetivo: ${maxSizeMB}MB`);

    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            // Calcular factor de escala basado en el tamaño
            const scaleFactor = Math.sqrt(maxSize / file.size);
            let width = Math.floor(img.width * Math.min(scaleFactor, 1));
            let height = Math.floor(img.height * Math.min(scaleFactor, 1));

            // Limitar dimensiones máximas (1920px para web es suficiente)
            const maxDimension = 1920;
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.floor((height / width) * maxDimension);
                    width = maxDimension;
                } else {
                    width = Math.floor((width / height) * maxDimension);
                    height = maxDimension;
                }
            }

            canvas.width = width;
            canvas.height = height;

            if (!ctx) {
                reject(new Error('No se pudo crear contexto de canvas'));
                return;
            }

            // Dibujar imagen redimensionada
            ctx.drawImage(img, 0, 0, width, height);

            // Probar diferentes calidades hasta alcanzar el tamaño objetivo
            const tryCompress = (quality: number) => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Error al comprimir imagen'));
                            return;
                        }

                        if (blob.size <= maxSize || quality <= 0.3) {
                            // Éxito o calidad mínima alcanzada
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            logger.info(`Imagen comprimida: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (calidad: ${(quality * 100).toFixed(0)}%)`);
                            resolve(compressedFile);
                        } else {
                            // Reducir calidad y reintentar
                            tryCompress(quality - 0.1);
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };

            // Comenzar con calidad 0.85
            tryCompress(0.85);
        };

        img.onerror = () => reject(new Error('Error al cargar imagen para compresión'));
        img.src = URL.createObjectURL(file);
    });
};

export const uploadToCloudinary = async (file: File): Promise<string> => {
    // Validación básica
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        throw new Error('CONFIG_MISSING');
    }

    // Comprimir si excede el límite
    let fileToUpload = file;
    if (file.size > TARGET_FILE_SIZE) {
        try {
            fileToUpload = await compressImage(file);
        } catch (compressError) {
            logger.error('Error al comprimir imagen, intentando subir original', compressError);
            // Si falla la compresión, intentar con el original
        }
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            logger.error('Error Cloudinary Response', errorData);
            throw new Error(`Error al subir imagen a Cloudinary: ${response.statusText}`);
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        logger.error('Error uploading to Cloudinary', error);
        throw error;
    }
};
