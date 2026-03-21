/**
 * Componente de Gestión de Configuración - White Label Premium
 * 
 * Refactorizado según AGENTS.md:
 * - Modularizado en secciones independientes
 * - UX mejorada basada en Gestión de Pedidos (Tabbed navigation, Pulsing status)
 * - Calidad de código y mantenibilidad incrementada
 */

import React, { useState, useEffect } from 'react';
import { useRestaurantConfig } from '../../../contexts/RestaurantConfigContext';
import { processImage } from '../../../utils/imageUtils';
import { ErrorHandler } from '../../../utils/errorHandler';
import { uploadToCloudinary } from '../../../utils/cloudinary';
import { api } from '../../../api';

// --- Icons (from UI context) ---
import { 
    SettingsIcon, 
    LayoutIcon, 
    ChefHatIcon, 
    AlertCircleIcon, 
    CheckCircleIcon 
} from '../../../components/ui/Icons';

// --- Sections ---
import BusinessInfoSection from './sections/BusinessInfoSection';
import BrandCustomizationSection from './sections/BrandCustomizationSection';
import BillingSRISection from './sections/BillingSRISection';
import DangerZoneSection from './sections/DangerZoneSection';

type SettingsTab = 'general' | 'brand' | 'billing' | 'danger';

const SettingsManagement: React.FC = () => {
    const { config, updateConfig, resetConfig, refreshConfig } = useRestaurantConfig();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [isUploading, setIsUploading] = useState(false);

    // Estados locales para formularios
    const [businessInfo, setBusinessInfo] = useState({
        name: config.name,
        slogan: config.slogan || '',
        phone: config.phone,
        email: config.email,
        address: config.address,
        website: config.website || '',
    });

    const [fiscalInfo, setFiscalInfo] = useState({
        ruc: config.ruc,
        businessName: config.businessName,
        fiscalEmail: config.fiscalEmail,
        fiscalLogo: config.fiscalLogo,
        obligadoContabilidad: config.obligadoContabilidad,
        contribuyenteEspecial: config.contribuyenteEspecial,
    });

    const [brandColors, setBrandColors] = useState(config.brandColors);
    const [billingConfig, setBillingConfig] = useState(config.billing);

    useEffect(() => {
        setBusinessInfo({
            name: config.name,
            slogan: config.slogan || '',
            phone: config.phone,
            email: config.email,
            address: config.address,
            website: config.website || '',
        });
        setFiscalInfo({
            ruc: config.ruc,
            businessName: config.businessName,
            fiscalEmail: config.fiscalEmail,
            fiscalLogo: config.fiscalLogo,
            obligadoContabilidad: config.obligadoContabilidad,
            contribuyenteEspecial: config.contribuyenteEspecial,
        });
        setBrandColors(config.brandColors);
        setBillingConfig(config.billing);
    }, [config]);

    // Handlers
    const handleSaveBusinessInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateConfig(businessInfo);
        alert('Información del negocio guardada correctamente');
    };

    const handleSaveBrandColors = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateConfig({ brandColors });
        alert('Colores de marca guardados correctamente');
    };

    const handleSaveUnifiedBilling = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateConfig({
            ...fiscalInfo,
            billing: billingConfig
        });
        alert('Información de Facturación y SRI guardada correctamente');
    };

    const handleLogoUpload = async (file: File) => {
        setIsUploading(true);
        try {
            const result = await processImage(file, 200, 200);
            if (result.success && result.data) {
                await updateConfig({ logo: result.data });
                alert('Logo cargado correctamente');
            } else {
                ErrorHandler.showError(new Error(result.error || 'Error al procesar imagen'));
            }
        } catch (error) {
            ErrorHandler.showError(error, 'Error al cargar logo');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFiscalLogoUpload = async (file: File) => {
        setIsUploading(true);
        try {
            const imageUrl = await uploadToCloudinary(file);
            if (imageUrl) {
                const newFiscalInfo = { ...fiscalInfo, fiscalLogo: imageUrl };
                setFiscalInfo(newFiscalInfo);
                await updateConfig({ ...fiscalInfo, fiscalLogo: imageUrl });
                alert('Logo Fiscal cargado correctamente en la nube');
            }
        } catch (error: any) {
            ErrorHandler.showError(error, 'Error al cargar logo fiscal');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveLogo = async () => {
        if (confirm('¿Deseas eliminar el logo actual?')) {
            await updateConfig({ logo: '' });
        }
    };

    const handleRemoveFiscalLogo = async () => {
        if (confirm('¿Eliminar logo fiscal?')) {
            await updateConfig({ ...fiscalInfo, billing: billingConfig, fiscalLogo: '' });
        }
    };

    const handleResetConfig = async () => {
        await resetConfig();
        alert('Configuración restaurada a valores por defecto');
    };

    const handleResetBilling = async () => {
        try {
            await api.bills.resetSystem();
            await refreshConfig();
            alert('Sistema de facturación reiniciado correctamente.\n- Facturas eliminadas\n- Secuencias en 0');
            window.location.reload();
        } catch (error: any) {
            ErrorHandler.showError(error, 'Error al reiniciar sistema de facturación');
        }
    };

    const handleResetFullSystem = async () => {
        try {
            console.warn('🧨 Inicia Purga Total del Sistema 🧨');
            await api.bills.resetAllSystem();
            await refreshConfig();
            alert('SISTEMA PURGADO: El restaurante ha vuelto a su estado original. Todos los datos operativos han sido eliminados.');
            window.location.reload();
        } catch (error: any) {
            ErrorHandler.showError(error, 'Error fatal durante la purga');
        }
    };

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'general', label: 'General', icon: <LayoutIcon className="w-4 h-4" /> },
        { id: 'brand', label: 'Marca', icon: <ChefHatIcon className="w-4 h-4" /> },
        { id: 'billing', label: 'Facturación / SRI', icon: <SettingsIcon className="w-4 h-4" /> },
        { id: 'danger', label: 'Avanzado', icon: <AlertCircleIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-900 transition-colors duration-300">
            {/* Header premium */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6 px-1">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Configuración</h1>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        CENTRO DE CONTROL MAESTRO
                    </p>
                </div>

                <div className="flex bg-gray-100 dark:bg-dark-800 p-1.5 rounded-2xl shadow-inner border border-gray-200 dark:border-dark-700 w-full sm:w-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id 
                                ? 'bg-white dark:bg-dark-700 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10 ring-1 ring-black/5' 
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                        >
                            {tab.icon}
                            <span className="hidden md:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-1">
                {activeTab === 'general' && (
                    <BusinessInfoSection 
                        businessInfo={businessInfo} 
                        onInfoChange={setBusinessInfo} 
                        onSave={handleSaveBusinessInfo} 
                    />
                )}
                {activeTab === 'brand' && (
                    <BrandCustomizationSection 
                        logo={config.logo} 
                        brandColors={brandColors} 
                        isUploading={isUploading}
                        onLogoUpload={handleLogoUpload}
                        onRemoveLogo={handleRemoveLogo}
                        onColorsChange={setBrandColors}
                        onSaveColors={handleSaveBrandColors}
                    />
                )}
                {activeTab === 'billing' && (
                    <BillingSRISection 
                        fiscalInfo={fiscalInfo}
                        billingConfig={billingConfig}
                        isUploading={isUploading}
                        onFiscalInfoChange={setFiscalInfo}
                        onBillingConfigChange={setBillingConfig}
                        onFiscalLogoUpload={handleFiscalLogoUpload}
                        onRemoveFiscalLogo={handleRemoveFiscalLogo}
                        onSave={handleSaveUnifiedBilling}
                    />
                )}
                {activeTab === 'danger' && (
                    <DangerZoneSection 
                        onResetConfig={handleResetConfig}
                        onResetBilling={handleResetBilling}
                        onResetFullSystem={handleResetFullSystem}
                    />
                )}
            </div>
            
            <div className="mt-8 py-4 border-t border-gray-100 dark:border-dark-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-3 h-3 text-green-500" />
                    Sistema Listo v2.0
                </div>
                <div>{config.name} - {new Date().getFullYear()}</div>
            </div>
        </div>
    );
};

export default SettingsManagement;
