/**
 * Componente de Gestión de Configuración - White Label
 * 
 * Permite configurar completamente el restaurante:
 * - Información del negocio
 * - Personalización de marca (logo, colores)
 * - Información fiscal
 * - Configuración regional
 */

import React, { useState, useRef } from 'react';
import { useRestaurantConfig } from '../contexts/RestaurantConfigContext';
import { processImage } from '../utils/imageUtils';
import { ErrorHandler } from '../utils/errorHandler';
import Modal from './Modal';

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

const Card = ({ title, children, actions, danger = false }: { title: string, children?: React.ReactNode, actions?: React.ReactNode, danger?: boolean }) => (
    <div className={`bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-lg shadow-md ${danger ? 'border border-red-500/50 ring-1 ring-red-500/10' : ''}`}>
        <div className="flex justify-between items-center mb-4">
            <h2 className={`text-xl font-semibold ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-light-background'}`}>{title}</h2>
            {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
        {children}
    </div>
);

interface ResetConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ResetConfigModal: React.FC<ResetConfigModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const requiredText = "RESTAURAR CONFIG";

    const handleConfirm = () => {
        onConfirm();
        setConfirmationText('');
        onClose();
    };

    const handleClose = () => {
        setConfirmationText('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Confirmación de Restauración de Configuración">
            <div className="space-y-4">
                <p className="text-sm text-orange-600 dark:text-orange-400">
                    <strong>¡Atención!</strong> Esta acción restaurará toda la configuración del sistema a sus valores por defecto.
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Esto incluye:
                </p>
                <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1 ml-2">
                    <li>Información del negocio</li>
                    <li>Colores de marca y logo</li>
                    <li>Información fiscal</li>
                    <li>Configuración regional</li>
                    <li>Configuración de facturación</li>
                </ul>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Para confirmar, por favor escribe <code className="font-mono bg-gray-100 dark:bg-dark-700 p-1 rounded text-orange-600 dark:text-orange-400 font-bold border border-gray-200 dark:border-dark-600">{requiredText}</code> en el campo de abajo.
                </p>
                <div>
                    <input
                        type="text"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        className={inputClass}
                        placeholder={requiredText}
                        autoFocus
                    />
                </div>
                <div className="flex justify-end pt-2">
                    <button type="button" onClick={handleClose} className="mr-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 dark:bg-dark-600 dark:text-light-background dark:hover:bg-dark-500 font-medium">Cancelar</button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={confirmationText !== requiredText}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed dark:disabled:bg-orange-900/50 font-medium transition-colors"
                    >
                        Restaurar Configuración
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const SettingsManagement: React.FC = () => {
    const { config, updateConfig, resetConfig } = useRestaurantConfig();
    const [isResetConfigModalOpen, setIsResetConfigModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    });

    const [brandColors, setBrandColors] = useState(config.brandColors);

    const [regionalConfig, setRegionalConfig] = useState({
        currency: config.currency,
        currencySymbol: config.currencySymbol,
        timezone: config.timezone,
        locale: config.locale,
    });

    const [billingConfig, setBillingConfig] = useState(config.billing);

    // Guardar información del negocio
    const handleSaveBusinessInfo = (e: React.FormEvent) => {
        e.preventDefault();
        updateConfig(businessInfo);
        alert('Información del negocio guardada correctamente');
    };

    // Guardar información fiscal
    const handleSaveFiscalInfo = (e: React.FormEvent) => {
        e.preventDefault();
        updateConfig(fiscalInfo);
        alert('Información fiscal guardada correctamente');
    };

    // Guardar colores de marca
    const handleSaveBrandColors = (e: React.FormEvent) => {
        e.preventDefault();
        updateConfig({ brandColors });
        alert('Colores de marca guardados correctamente');
    };

    // Guardar configuración regional
    const handleSaveRegionalConfig = (e: React.FormEvent) => {
        e.preventDefault();
        updateConfig(regionalConfig);
        alert('Configuración regional guardada correctamente');
    };

    // Guardar configuración de facturación
    const handleSaveBillingConfig = (e: React.FormEvent) => {
        e.preventDefault();
        updateConfig({ billing: billingConfig });
        alert('Configuración de facturación guardada correctamente');
    };

    // Manejar carga de logo
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const result = await processImage(file, 200, 200);

            if (result.success && result.data) {
                updateConfig({ logo: result.data });
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

    // Eliminar logo
    const handleRemoveLogo = () => {
        if (confirm('¿Deseas eliminar el logo actual?')) {
            updateConfig({ logo: '' });
        }
    };

    // Manejar restauración de configuración
    const handleResetConfig = () => {
        resetConfig();
        // Actualizar estados locales con la configuración por defecto
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
        });
        setBrandColors(config.brandColors);
        setRegionalConfig({
            currency: config.currency,
            currencySymbol: config.currencySymbol,
            timezone: config.timezone,
            locale: config.locale,
        });
        setBillingConfig(config.billing);
        alert('Configuración restaurada a valores por defecto');
    };

    return (
        <div>
            <ResetConfigModal
                isOpen={isResetConfigModalOpen}
                onClose={() => setIsResetConfigModalOpen(false)}
                onConfirm={handleResetConfig}
            />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-light-background mb-6">Configuración del Sistema</h1>
            <div className="space-y-6">
                {/* Información del Negocio */}
                <Card title="Información del Negocio">
                    <form onSubmit={handleSaveBusinessInfo} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del Restaurante *</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={businessInfo.name}
                                    onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="slogan" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slogan</label>
                                <input
                                    type="text"
                                    id="slogan"
                                    value={businessInfo.slogan}
                                    onChange={(e) => setBusinessInfo({ ...businessInfo, slogan: e.target.value })}
                                    className={inputClass}
                                    placeholder="Sistema de Gestión Gastronómica"
                                />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono *</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    value={businessInfo.phone}
                                    onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={businessInfo.email}
                                    onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección *</label>
                                <input
                                    type="text"
                                    id="address"
                                    value={businessInfo.address}
                                    onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sitio Web</label>
                                <input
                                    type="url"
                                    id="website"
                                    value={businessInfo.website}
                                    onChange={(e) => setBusinessInfo({ ...businessInfo, website: e.target.value })}
                                    className={inputClass}
                                    placeholder="https://mirestaurante.com"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">Guardar Información</button>
                        </div>
                    </form>
                </Card>

                {/* Personalización de Marca */}
                <Card title="Personalización de Marca">
                    <div className="space-y-6">
                        {/* Logo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logo del Restaurante</label>
                            <div className="flex items-center space-x-4">
                                {config.logo ? (
                                    <div className="relative">
                                        <img src={config.logo} alt="Logo" className="w-24 h-24 object-contain border-2 border-gray-200 dark:border-gray-600 rounded-lg" />
                                        <button
                                            type="button"
                                            onClick={handleRemoveLogo}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-400">
                                        Sin logo
                                    </div>
                                )}
                                <div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:bg-blue-300"
                                    >
                                        {isUploading ? 'Cargando...' : config.logo ? 'Cambiar Logo' : 'Subir Logo'}
                                    </button>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG, WEBP o SVG. Máx 500KB.</p>
                                </div>
                            </div>
                        </div>

                        {/* Colores de Marca */}
                        <form onSubmit={handleSaveBrandColors}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color Primario</label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="color"
                                            id="primaryColor"
                                            value={brandColors.primary}
                                            onChange={(e) => setBrandColors({ ...brandColors, primary: e.target.value })}
                                            className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={brandColors.primary}
                                            onChange={(e) => setBrandColors({ ...brandColors, primary: e.target.value })}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color Secundario</label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="color"
                                            id="secondaryColor"
                                            value={brandColors.secondary}
                                            onChange={(e) => setBrandColors({ ...brandColors, secondary: e.target.value })}
                                            className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={brandColors.secondary}
                                            onChange={(e) => setBrandColors({ ...brandColors, secondary: e.target.value })}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="accentColor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color de Acento</label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="color"
                                            id="accentColor"
                                            value={brandColors.accent}
                                            onChange={(e) => setBrandColors({ ...brandColors, accent: e.target.value })}
                                            className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={brandColors.accent}
                                            onChange={(e) => setBrandColors({ ...brandColors, accent: e.target.value })}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end mt-4">
                                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">Guardar Colores</button>
                            </div>
                        </form>
                    </div>
                </Card>

                {/* Información Fiscal */}
                <Card title="Información Fiscal (Ecuador)">
                    <form onSubmit={handleSaveFiscalInfo} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="ruc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RUC *</label>
                                <input
                                    type="text"
                                    id="ruc"
                                    value={fiscalInfo.ruc}
                                    onChange={(e) => setFiscalInfo({ ...fiscalInfo, ruc: e.target.value })}
                                    className={inputClass}
                                    required
                                    maxLength={13}
                                />
                            </div>
                            <div>
                                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Razón Social *</label>
                                <input
                                    type="text"
                                    id="businessName"
                                    value={fiscalInfo.businessName}
                                    onChange={(e) => setFiscalInfo({ ...fiscalInfo, businessName: e.target.value })}
                                    className={inputClass}
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">Guardar Información Fiscal</button>
                        </div>
                    </form>
                </Card>

                {/* Configuración Regional */}
                <Card title="Configuración Regional">
                    <form onSubmit={handleSaveRegionalConfig} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Moneda</label>
                                <select
                                    id="currency"
                                    value={regionalConfig.currency}
                                    onChange={(e) => setRegionalConfig({ ...regionalConfig, currency: e.target.value })}
                                    className={inputClass}
                                >
                                    <option value="USD">USD - Dólar Estadounidense</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="COP">COP - Peso Colombiano</option>
                                    <option value="PEN">PEN - Sol Peruano</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="currencySymbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Símbolo de Moneda</label>
                                <input
                                    type="text"
                                    id="currencySymbol"
                                    value={regionalConfig.currencySymbol}
                                    onChange={(e) => setRegionalConfig({ ...regionalConfig, currencySymbol: e.target.value })}
                                    className={inputClass}
                                    maxLength={3}
                                />
                            </div>
                            <div>
                                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zona Horaria</label>
                                <select
                                    id="timezone"
                                    value={regionalConfig.timezone}
                                    onChange={(e) => setRegionalConfig({ ...regionalConfig, timezone: e.target.value })}
                                    className={inputClass}
                                >
                                    <option value="America/Guayaquil">América/Guayaquil (Ecuador)</option>
                                    <option value="America/Bogota">América/Bogotá (Colombia)</option>
                                    <option value="America/Lima">América/Lima (Perú)</option>
                                    <option value="America/New_York">América/Nueva York (USA)</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="locale" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Idioma/Región</label>
                                <select
                                    id="locale"
                                    value={regionalConfig.locale}
                                    onChange={(e) => setRegionalConfig({ ...regionalConfig, locale: e.target.value })}
                                    className={inputClass}
                                >
                                    <option value="es-EC">Español (Ecuador)</option>
                                    <option value="es-CO">Español (Colombia)</option>
                                    <option value="es-PE">Español (Perú)</option>
                                    <option value="en-US">English (USA)</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">Guardar Configuración Regional</button>
                        </div>
                    </form>
                </Card>

                {/* Configuración de Facturación */}
                <Card title="Configuración de Facturación">
                    <form onSubmit={handleSaveBillingConfig} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="establishment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Establecimiento</label>
                                <input
                                    type="text"
                                    id="establishment"
                                    value={billingConfig.establishment}
                                    onChange={(e) => setBillingConfig({ ...billingConfig, establishment: e.target.value })}
                                    className={inputClass}
                                    maxLength={3}
                                    placeholder="001"
                                />
                            </div>
                            <div>
                                <label htmlFor="emissionPoint" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Punto de Emisión</label>
                                <input
                                    type="text"
                                    id="emissionPoint"
                                    value={billingConfig.emissionPoint}
                                    onChange={(e) => setBillingConfig({ ...billingConfig, emissionPoint: e.target.value })}
                                    className={inputClass}
                                    maxLength={3}
                                    placeholder="001"
                                />
                            </div>
                            <div>
                                <label htmlFor="regime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Régimen Tributario</label>
                                <select
                                    id="regime"
                                    value={billingConfig.regime}
                                    onChange={(e) => setBillingConfig({ ...billingConfig, regime: e.target.value as any })}
                                    className={inputClass}
                                >
                                    <option value="General">General</option>
                                    <option value="RIMPE - Negocio Popular">RIMPE - Negocio Popular</option>
                                    <option value="RIMPE - Emprendedor">RIMPE - Emprendedor</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">Guardar Configuración de Facturación</button>
                        </div>
                    </form>
                </Card>

                {/* Zona de Peligro */}
                <Card title="Zona de Peligro" danger>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-gray-800 dark:text-light-background">Restaurar configuración por defecto</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Esto restaurará toda la configuración del sistema a sus valores por defecto (información del negocio, colores, fiscal, regional y facturación). Esta acción es útil al entregar el sistema a un nuevo restaurante.
                            </p>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setIsResetConfigModalOpen(true)}
                                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm font-medium transition-colors shadow-sm shadow-orange-500/30"
                            >
                                Restaurar Configuración
                            </button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SettingsManagement;