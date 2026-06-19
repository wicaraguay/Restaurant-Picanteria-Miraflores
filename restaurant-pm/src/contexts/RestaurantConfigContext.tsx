/**
 * Contexto de Configuración del Restaurante
 * 
 * Proporciona configuración global del restaurante a toda la aplicación.
 * Maneja persistencia en MongoDB a través de la API del backend.
 * Permite personalización completa del sistema (white-label).
 */

import React, { createContext, useContext, useEffect, ReactNode, useState, useCallback } from 'react';
import { RestaurantConfig } from '../types';
import { defaultRestaurantConfig } from '../utils/defaultConfig';
import { applyBrandTheme } from '../utils/themeUtils';
import { logger } from '../utils/logger';
import { api } from '../api';

/**
 * Interfaz del contexto
 */
interface RestaurantConfigContextType {
    config: RestaurantConfig;
    updateConfig: (newConfig: Partial<RestaurantConfig>) => Promise<void>;
    resetConfig: () => Promise<void>;
    refreshConfig: () => Promise<void>;
    loading: boolean;
}

/**
 * Contexto de configuración
 */
const RestaurantConfigContext = createContext<RestaurantConfigContextType | undefined>(
    undefined
);

/**
 * Props del Provider
 */
interface RestaurantConfigProviderProps {
    children: ReactNode;
}

/**
 * Provider de configuración del restaurante
 */
export const RestaurantConfigProvider: React.FC<RestaurantConfigProviderProps> = ({
    children,
}) => {
    // ✅ Cargar configuración inicial desde LocalStorage si existe (Evita el "flash" de defaults)
    const [config, setConfig] = useState<RestaurantConfig>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('restaurant_config');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    // Validate sriCertificate - remove if corrupted (missing required fields or empty values)
                    // A valid certificate MUST have: uploadedAt (Date), certificateBase64 (non-empty string)
                    if (parsed.sriCertificate) {
                        const cert = parsed.sriCertificate;
                        const isValid = cert.uploadedAt &&
                                       cert.certificateBase64 &&
                                       typeof cert.certificateBase64 === 'string' &&
                                       cert.certificateBase64.length > 0;
                        if (!isValid) {
                            console.warn('Removing corrupted/empty sriCertificate from cache');
                            delete parsed.sriCertificate;
                            localStorage.setItem('restaurant_config', JSON.stringify(parsed));
                        }
                    }
                    // Validate website - if it's a string (old format), remove it so default CMS config is used
                    if (parsed.website && typeof parsed.website === 'string') {
                        console.warn('Removing legacy website string from cache (now uses WebsiteConfig object)');
                        delete parsed.website;
                        localStorage.setItem('restaurant_config', JSON.stringify(parsed));
                    }
                    return parsed;
                } catch (e) {
                    console.error('Error parsing cached config', e);
                }
            }
        }
        return defaultRestaurantConfig;
    });

    const [loading, setLoading] = useState(true);

    /**
     * Cargar configuración desde el backend al montar (y actualizar caché)
     */
    const fetchConfig = useCallback(async () => {
        try {
            // logger.info('Fetching restaurant config from backend'); // Reduce log noise
            const fetchedConfig = await api.config.get();
            setConfig(fetchedConfig);
            // ✅ Actualizar caché
            localStorage.setItem('restaurant_config', JSON.stringify(fetchedConfig));
            // logger.info('Restaurant config loaded successfully');
        } catch (error) {
            logger.error('Failed to fetch restaurant config, using defaults', error);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Cargar configuración desde el backend al montar (y actualizar caché)
     */
    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    /**
     * Actualiza la configuración (merge con la existente y guarda en backend)
     * IMPORTANT: sriCertificate is stripped - use dedicated certificate endpoints
     */
    const updateConfig = useCallback(async (newConfig: Partial<RestaurantConfig>) => {
        // Strip sriCertificate from updates - it should only be modified via dedicated endpoints
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { sriCertificate: _, ...safeConfig } = config;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { sriCertificate: __, ...safeNewConfig } = newConfig;

        const updatedConfig: RestaurantConfig = {
            ...safeConfig,
            ...safeNewConfig,
            // Merge profundo para objetos anidados
            brandColors: {
                ...config.brandColors,
                ...(newConfig.brandColors || {}),
            },
            billing: {
                ...config.billing,
                ...(newConfig.billing || {}),
            },
            // Merge profundo para website (CMS)
            website: newConfig.website ? {
                hero: {
                    ...(config.website?.hero || {}),
                    ...(newConfig.website.hero || {}),
                },
                footer: {
                    ...(config.website?.footer || {}),
                    ...(newConfig.website.footer || {}),
                },
                theme: {
                    colors: {
                        ...(config.website?.theme?.colors || {}),
                        ...(newConfig.website.theme?.colors || {}),
                    },
                    fonts: {
                        ...(config.website?.theme?.fonts || {}),
                        ...(newConfig.website.theme?.fonts || {}),
                    },
                },
                sections: {
                    ...(config.website?.sections || {}),
                    ...(newConfig.website.sections || {}),
                },
            } : config.website,
        } as RestaurantConfig;

        try {
            logger.info('Updating restaurant config', { changes: Object.keys(safeNewConfig) });
            const savedConfig = await api.config.update(updatedConfig);
            setConfig(savedConfig);
            // ✅ Actualizar caché
            localStorage.setItem('restaurant_config', JSON.stringify(savedConfig));
            logger.info('Restaurant config updated successfully');
        } catch (error) {
            logger.error('Failed to update restaurant config', error);
            throw error;
        }
    }, [config]);

    /**
     * Resetea la configuración a valores por defecto
     */
    const resetConfig = useCallback(async () => {
        try {
            logger.info('Resetting restaurant config to defaults');
            const savedConfig = await api.config.update(defaultRestaurantConfig);
            setConfig(savedConfig);
            // ✅ Actualizar caché
            localStorage.setItem('restaurant_config', JSON.stringify(savedConfig));
            logger.info('Restaurant config reset successfully');
        } catch (error) {
            logger.error('Failed to reset restaurant config', error);
            throw error;
        }
    }, []);

    /**
     * Aplicar tema de marca cuando cambia la configuración
     */
    useEffect(() => {
        applyBrandTheme(config);
    }, [config.brandColors.primary, config.brandColors.secondary, config.brandColors.accent]);

    const value: RestaurantConfigContextType = {
        config,
        updateConfig,
        resetConfig,
        refreshConfig: fetchConfig,
        loading,
    };

    return (
        <RestaurantConfigContext.Provider value={value}>
            {children}
        </RestaurantConfigContext.Provider>
    );
};

/**
 * Hook para usar la configuración del restaurante
 */
export const useRestaurantConfig = (): RestaurantConfigContextType => {
    const context = useContext(RestaurantConfigContext);

    if (context === undefined) {
        throw new Error(
            'useRestaurantConfig must be used within a RestaurantConfigProvider'
        );
    }

    return context;
};
