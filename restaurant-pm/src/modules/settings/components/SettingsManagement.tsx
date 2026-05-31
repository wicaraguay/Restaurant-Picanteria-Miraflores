/**
 * Componente de Gestión de Configuración - White Label Premium
 *
 * Refactorizado según AGENTS.md:
 * - Modularizado en secciones independientes
 * - UX mejorada basada en Gestión de Pedidos (Tabbed navigation, Pulsing status)
 * - Calidad de código y mantenibilidad incrementada
 *
 * @changes v2.1
 * - Separada sección "Avanzado" en 2 pestañas: "Mantenimiento" y "Zona de Peligro"
 * - Eliminada "Purga Nuclear" (incompatible con arquitectura multi-tenant)
 * - Agregada funcionalidad de exportación de datos
 * - Mejorada seguridad con validación por contraseña
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import CertificateSection from './sections/CertificateSection';
import MaintenanceSection from './sections/MaintenanceSection';
import DangerZoneSection from './sections/DangerZoneSection';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { toast } from '../../../components/ui/AlertProvider';

type SettingsTab = 'general' | 'brand' | 'billing' | 'certificate' | 'maintenance' | 'danger';

const SettingsManagement: React.FC = () => {
    const { config, updateConfig, resetConfig, refreshConfig } = useRestaurantConfig();
    const navigate = useNavigate();
    const { tab } = useParams<{ tab?: string }>();

    // Determinar tab activo desde URL o default
    const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
        const validTabs: SettingsTab[] = ['general', 'brand', 'billing', 'certificate', 'maintenance', 'danger'];
        return validTabs.includes(tab as SettingsTab) ? (tab as SettingsTab) : 'general';
    });
    const [isUploading, setIsUploading] = useState(false);

    // Modal states
    const [showRemoveLogoModal, setShowRemoveLogoModal] = useState(false);
    const [showRemoveFiscalLogoModal, setShowRemoveFiscalLogoModal] = useState(false);

    // Sincronizar tab con URL
    useEffect(() => {
        const validTabs: SettingsTab[] = ['general', 'brand', 'billing', 'certificate', 'maintenance', 'danger'];
        if (tab && validTabs.includes(tab as SettingsTab)) {
            setActiveTab(tab as SettingsTab);
        }
    }, [tab]);

    // Función para cambiar de tab y actualizar URL
    const handleTabChange = (newTab: SettingsTab) => {
        setActiveTab(newTab);
        navigate(`/admin/settings/${newTab}`, { replace: true });
    };

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
        fiscalAddress: config.fiscalAddress || '',
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
            fiscalAddress: config.fiscalAddress || '',
            obligadoContabilidad: config.obligadoContabilidad,
            contribuyenteEspecial: config.contribuyenteEspecial,
        });
        setBrandColors(config.brandColors);
        setBillingConfig(config.billing);
    }, [config]);

    // Handlers de configuración básica
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

    const handleUploadCertificate = async (certificateBase64: string, password: string, environment: '1' | '2') => {
        try {
            await api.config.uploadCertificate({ certificateBase64, password, environment });
            await refreshConfig();
        } catch (error) {
            console.error('Error uploading certificate:', error);
            throw error;
        }
    };

    const handleDeleteCertificate = async () => {
        try {
            await api.config.deleteCertificate();
            await refreshConfig();
        } catch (error) {
            console.error('Error deleting certificate:', error);
            throw error;
        }
    };

    const handleChangeCertificateEnvironment = async (environment: '1' | '2') => {
        try {
            await api.config.updateCertificateEnvironment(environment);
            await refreshConfig();
        } catch (error) {
            console.error('Error changing certificate environment:', error);
            throw error;
        }
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

    const handleRemoveLogoClick = () => {
        setShowRemoveLogoModal(true);
    };

    const handleRemoveLogoConfirm = async () => {
        await updateConfig({ logo: '' });
        setShowRemoveLogoModal(false);
        toast.success('Logo eliminado correctamente', 'Éxito');
    };

    const handleRemoveFiscalLogoClick = () => {
        setShowRemoveFiscalLogoModal(true);
    };

    const handleRemoveFiscalLogoConfirm = async () => {
        await updateConfig({ ...fiscalInfo, billing: billingConfig, fiscalLogo: '' });
        setShowRemoveFiscalLogoModal(false);
        toast.success('Logo fiscal eliminado correctamente', 'Éxito');
    };

    // Handlers de Mantenimiento (NUEVOS)
    const handleExportMenu = async () => {
        try {
            const blob = await api.export.menu();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `menu-${Date.now()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Menú exportado correctamente', 'Éxito');
        } catch (error) {
            toast.error('Error al exportar el menú', 'Error');
        }
    };

    const handleExportClients = async () => {
        try {
            const blob = await api.export.clients();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clientes-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Clientes exportados correctamente', 'Éxito');
        } catch (error) {
            toast.error('Error al exportar clientes', 'Error');
        }
    };

    const handleExportBills = async () => {
        try {
            const blob = await api.export.bills();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `facturas-${Date.now()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Facturas exportadas correctamente', 'Éxito');
        } catch (error) {
            toast.error('Error al exportar facturas', 'Error');
        }
    };

    const handleExportOrders = async () => {
        try {
            const blob = await api.export.orders();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ordenes-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Órdenes exportadas correctamente', 'Éxito');
        } catch (error) {
            toast.error('Error al exportar órdenes', 'Error');
        }
    };

    const handleFiscalYearClose = async () => {
        const currentYear = new Date().getFullYear();
        const year = prompt(`¿Qué año fiscal deseas cerrar? (Ej: ${currentYear - 1})`, (currentYear - 1).toString());

        if (!year) return;

        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 2020 || yearNum > currentYear) {
            toast.error(`El año debe estar entre 2020 y ${currentYear}`, 'Error');
            return;
        }

        try {
            const result = await api.maintenance.fiscalYearClose(yearNum);
            toast.success(result.message || 'Cierre fiscal completado correctamente', 'Éxito');
        } catch (error: any) {
            toast.error(error.message || 'Error al cerrar el año fiscal', 'Error');
        }
    };

    // Handlers de Zona de Peligro (REFACTORIZADOS)
    const handleResetAppearance = async () => {
        await resetConfig();
        toast.success('Apariencia visual restaurada a valores por defecto', 'Éxito');
    };

    const handleDeleteOldOrders = async (monthsOld: number) => {
        try {
            const result = await api.maintenance.deleteOldOrders(monthsOld);
            toast.success(result.message || 'Órdenes antiguas eliminadas correctamente', 'Éxito');
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar órdenes antiguas', 'Error');
        }
    };

    const handleDeleteInactiveClients = async (monthsInactive: number) => {
        try {
            const result = await api.maintenance.deleteInactiveClients(monthsInactive);
            toast.success(result.message || 'Clientes inactivos eliminados correctamente', 'Éxito');
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar clientes inactivos', 'Error');
        }
    };

    const handleDeleteDisabledProducts = async () => {
        try {
            const result = await api.maintenance.deleteDisabledProducts();
            toast.success(result.message || 'Productos deshabilitados eliminados correctamente', 'Éxito');
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar productos deshabilitados', 'Error');
        }
    };

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'general', label: 'General', icon: <LayoutIcon className="w-4 h-4" /> },
        { id: 'brand', label: 'Marca', icon: <ChefHatIcon className="w-4 h-4" /> },
        { id: 'billing', label: 'Facturación / SRI', icon: <SettingsIcon className="w-4 h-4" /> },
        { id: 'certificate', label: 'Certificado Digital', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> },
        { id: 'maintenance', label: 'Mantenimiento', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
        { id: 'danger', label: 'Zona de Peligro', icon: <AlertCircleIcon className="w-4 h-4" /> },
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

                <div className="flex bg-gray-100 dark:bg-dark-800 p-1.5 rounded-2xl shadow-inner border border-gray-200 dark:border-dark-700 w-full sm:w-auto overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id
                                ? 'bg-white dark:bg-dark-700 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10 ring-1 ring-black/5'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                        >
                            {tab.icon}
                            <span className="hidden lg:inline whitespace-nowrap">{tab.label}</span>
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
                        onRemoveLogo={handleRemoveLogoClick}
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
                        onRemoveFiscalLogo={handleRemoveFiscalLogoClick}
                        onSave={handleSaveUnifiedBilling}
                    />
                )}
                {activeTab === 'certificate' && (
                    <CertificateSection
                        certificate={config.sriCertificate}
                        onUpload={handleUploadCertificate}
                        onDelete={handleDeleteCertificate}
                        onChangeEnvironment={handleChangeCertificateEnvironment}
                    />
                )}
                {activeTab === 'maintenance' && (
                    <MaintenanceSection
                        onExportMenu={handleExportMenu}
                        onExportClients={handleExportClients}
                        onExportBills={handleExportBills}
                        onExportOrders={handleExportOrders}
                        onFiscalYearClose={handleFiscalYearClose}
                    />
                )}
                {activeTab === 'danger' && (
                    <DangerZoneSection
                        onResetAppearance={handleResetAppearance}
                        onDeleteOldOrders={handleDeleteOldOrders}
                        onDeleteInactiveClients={handleDeleteInactiveClients}
                        onDeleteDisabledProducts={handleDeleteDisabledProducts}
                    />
                )}
            </div>

            <div className="mt-8 py-4 border-t border-gray-100 dark:border-dark-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-3 h-3 text-green-500" />
                    Sistema Listo v2.1
                </div>
                <div>{config.name} - {new Date().getFullYear()}</div>
            </div>

            {/* Modal de confirmación para eliminar logo */}
            <ConfirmModal
                isOpen={showRemoveLogoModal}
                onClose={() => setShowRemoveLogoModal(false)}
                onConfirm={handleRemoveLogoConfirm}
                title="Eliminar Logo"
                message="¿Estás seguro de que deseas eliminar el logo actual?"
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />

            {/* Modal de confirmación para eliminar logo fiscal */}
            <ConfirmModal
                isOpen={showRemoveFiscalLogoModal}
                onClose={() => setShowRemoveFiscalLogoModal(false)}
                onConfirm={handleRemoveFiscalLogoConfirm}
                title="Eliminar Logo Fiscal"
                message="¿Estás seguro de que deseas eliminar el logo fiscal?"
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default SettingsManagement;
