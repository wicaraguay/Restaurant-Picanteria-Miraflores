/**
 * Contexto de Configuración del Restaurante
 * 
 * Proporciona configuración global del restaurante a toda la aplicación.
 * Maneja persistencia en MongoDB a través de la API del backend.
 * Permite personalización completa del sistema (white-label).
 */

import React, { createContext, useContext, useEffect, ReactNode, useState, useCallback } from 'react';
import { RestaurantConfig } from '../types';
import { defaultRestaurantConfig, defaultWebsiteConfig } from '../utils/defaultConfig';
import { applyBrandTheme } from '../utils/themeUtils';
import { logger } from '../utils/logger';
import { api } from '../api';

/**
 * Migra configuración legacy (website como string) al nuevo formato (objeto WebsiteConfig)
 * Esto es necesario porque en producción puede haber datos antiguos con website como URL string
 */
const migrateConfig = (config: any): RestaurantConfig => {
    const migrated = { ...config };

    // Si website es string (formato antiguo), reemplazar con defaultWebsiteConfig
    if (migrated.website && typeof migrated.website === 'string') {
        logger.warn('Migrating legacy website string to WebsiteConfig object');
        migrated.website = defaultWebsiteConfig;
    }

    // Si website no existe, es null, o no es objeto válido, usar default
    if (!migrated.website || typeof migrated.website !== 'object') {
        migrated.website = defaultWebsiteConfig;
    }

    return migrated as RestaurantConfig;
};

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
                    // Migrar website si es string (formato antiguo) a objeto WebsiteConfig
                    const migrated = migrateConfig(parsed);
                    if (migrated !== parsed) {
                        localStorage.setItem('restaurant_config', JSON.stringify(migrated));
                    }
                    return migrated;
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
            // ✅ Migrar configuración legacy (website como string → objeto)
            const migratedConfig = migrateConfig(fetchedConfig);
            setConfig(migratedConfig);
            // ✅ Actualizar caché con config migrada
            localStorage.setItem('restaurant_config', JSON.stringify(migratedConfig));
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
            // ✅ Migrar por si el backend devuelve formato legacy
            const migratedConfig = migrateConfig(savedConfig);
            setConfig(migratedConfig);
            // ✅ Actualizar caché
            localStorage.setItem('restaurant_config', JSON.stringify(migratedConfig));
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
            // ✅ Migrar por si el backend devuelve formato legacy
            const migratedConfig = migrateConfig(savedConfig);
            setConfig(migratedConfig);
            // ✅ Actualizar caché
            localStorage.setItem('restaurant_config', JSON.stringify(migratedConfig));
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
