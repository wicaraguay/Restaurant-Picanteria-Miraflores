/**
 * Gestión del Sitio Web Público - CMS
 *
 * Página dedicada para administrar el contenido del sitio web público:
 * - Hero carousel (imágenes, títulos, subtítulos)
 * - Footer (descripción, horarios, redes sociales)
 * - Tema (colores personalizados)
 */

import React, { useState } from 'react';
import { useRestaurantConfig } from '../../../contexts/RestaurantConfigContext';
import { WebsiteConfig } from '../../../types';
import { defaultWebsiteConfig } from '../../../utils/defaultConfig';
import WebsiteCMSSection from '../../settings/components/sections/WebsiteCMSSection';
import { toast } from '../../../components/ui/AlertProvider';
import { CheckCircleIcon } from '../../../components/ui/Icons';

const WebsiteManagement: React.FC = () => {
    const { config, updateConfig, loading } = useRestaurantConfig();
    const [isSaving, setIsSaving] = useState(false);

    // Mostrar loading mientras se carga la configuración del backend
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Cargando configuración...</p>
                </div>
            </div>
        );
    }

    const handleSaveWebsiteConfig = async (partialWebsiteConfig: Partial<WebsiteConfig>) => {
        setIsSaving(true);
        try {
            // Merge con config actual
            const currentWebsite = config.website || defaultWebsiteConfig;
            const updatedWebsite = { ...currentWebsite, ...partialWebsiteConfig };
            await updateConfig({ website: updatedWebsite });
            toast.success('Configuración del sitio web guardada correctamente', 'Éxito');
        } catch (error: any) {
            toast.error(error.message || 'Error al guardar configuración del sitio web', 'Error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-900 transition-colors duration-300">
            {/* Header premium */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6 px-1">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Sitio Web</h1>
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                        GESTIÓN DE CONTENIDO PÚBLICO
                    </p>
                </div>

                <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/25 active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver Sitio Público
                </a>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-1">
                <WebsiteCMSSection
                    websiteConfig={config.website || defaultWebsiteConfig}
                    onSave={handleSaveWebsiteConfig}
                    isSaving={isSaving}
                />
            </div>

            <div className="mt-8 py-4 border-t border-gray-100 dark:border-dark-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-3 h-3 text-green-500" />
                    CMS Activo
                </div>
                <div>{config.name} - {new Date().getFullYear()}</div>
            </div>
        </div>
    );
};

export default WebsiteManagement;
