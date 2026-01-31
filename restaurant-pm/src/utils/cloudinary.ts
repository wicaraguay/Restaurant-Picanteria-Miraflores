import { logger } from './logger';

export const CLOUDINARY_CLOUD_NAME = 'dxxf1gy0f';
export const CLOUDINARY_UPLOAD_PRESET = 'picanteria-miraflores';

export const uploadToCloudinary = async (file: File): Promise<string> => {
    // Validación básica
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        throw new Error('CONFIG_MISSING');
    }

    const formData = new FormData();
    formData.append('file', file);
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
