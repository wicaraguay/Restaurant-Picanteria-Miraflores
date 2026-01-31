/**
 * Componente de Gestión de Configuración - White Label
 * 
 * Permite configurar completamente el restaurante:
 * - Información del negocio
 * - Personalización de marca (logo, colores)
 * - Información fiscal
 * - Configuración regional
 */

import React, { useState, useRef, useEffect } from 'react';
import { useRestaurantConfig } from '../contexts/RestaurantConfigContext';
import { processImage } from '../utils/imageUtils';
import { ErrorHandler } from '../utils/errorHandler';
import Modal from './Modal';
import { QRCodeCanvas } from 'qrcode.react';
import { uploadToCloudinary } from '../utils/cloudinary';
import { api } from '../api';

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

interface ResetBillingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const ResetBillingModal: React.FC<ResetBillingModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const requiredText = "ELIMINAR TODO";

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
        <Modal isOpen={isOpen} onClose={handleClose} title="PELIGRO: Reiniciar Sistema de Facturación">
            <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400 font-bold">
                        ⚠️ ¡ACCIÓN DESTRUCTIVA E IRREVERSIBLE! ⚠️
                    </p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Esta acción eliminará permanentemente:
                </p>
                <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside space-y-1 ml-2 font-medium">
                    <li>TODAS las facturas emitidas</li>
                    <li>TODAS las notas de crédito</li>
                    <li>Historial de facturación completo</li>
                </ul>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Además:
                </p>
                <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1 ml-2">
                    <li>Se reiniciarán los contadores de secuencia a 0 (la próxima será 001).</li>
                    <li>Se marcarán todas las órdenes como "No Facturadas".</li>
                </ul>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-4">
                    Para confirmar, por favor escribe <code className="font-mono bg-red-100 dark:bg-red-900/50 p-1 rounded text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-800">{requiredText}</code> en el campo de abajo.
                </p>
                <div>
                    <input
                        type="text"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        className={`${inputClass} border-red-300 focus:border-red-500 focus:ring-red-500/20`}
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
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed dark:disabled:bg-red-900/50 font-bold transition-colors shadow-lg shadow-red-500/30"
                    >
                        ELIMINAR TODO Y REINICIAR
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const SettingsManagement: React.FC = () => {
    const { config, updateConfig, resetConfig } = useRestaurantConfig();
    const [isResetConfigModalOpen, setIsResetConfigModalOpen] = useState(false);
    const [isResetBillingModalOpen, setIsResetBillingModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fiscalLogoInputRef = useRef<HTMLInputElement>(null);

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

    const [regionalConfig, setRegionalConfig] = useState({
        currency: config.currency,
        currencySymbol: config.currencySymbol,
        timezone: config.timezone,
        locale: config.locale,
    });

    const [billingConfig, setBillingConfig] = useState(config.billing);

    // Sincronizar estado local cuando llega la configuración del backend
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
        setRegionalConfig({
            currency: config.currency,
            currencySymbol: config.currencySymbol,
            timezone: config.timezone,
            locale: config.locale,
        });
        setBillingConfig(config.billing);
    }, [config]);

    // Guardar información del negocio
    const handleSaveBusinessInfo = (e: React.FormEvent) => {
        e.preventDefault();
        updateConfig(businessInfo);
        alert('Información del negocio guardada correctamente');
    };

    // Guardar colores de marca
    const handleSaveBrandColors = (e: React.FormEvent) => {
        e.preventDefault();
        updateConfig({ brandColors });
        alert('Colores de marca guardados correctamente');
    };

    // Guardar información unificada de Facturación y SRI
    const handleSaveUnifiedBilling = (e: React.FormEvent) => {
        e.preventDefault();
        updateConfig({
            ...fiscalInfo,
            billing: billingConfig
        });
        alert('Información de Facturación y SRI guardada correctamente');
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

    // Manejar carga de logo fiscal
    const handleFiscalLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // Usamos Cloudinary para subir la imagen, igual que en el menú
            const imageUrl = await uploadToCloudinary(file);

            if (imageUrl) {
                // Actualizamos directamente el config con el nuevo logo fiscal
                // IMPORTANTE: Pasamos SOLO lo que queremos actualizar para evitar conflictos
                const newFiscalInfo = { ...fiscalInfo, fiscalLogo: imageUrl };
                // 1. Actualizar estado local inmediato (optimistic UI)
                setFiscalInfo(newFiscalInfo);

                console.log('Subida exitosa. URL Cloudinary:', imageUrl);

                // 2. Guardar en backend
                // CORRECCION: fiscalLogo debe ir DESPUÉS del spread para asegurar que no se sobrescriba con el valor antiguo
                await updateConfig({
                    ...fiscalInfo,
                    fiscalLogo: imageUrl
                });
                alert('Logo Fiscal cargado correctamente en la nube\nURL: ' + imageUrl);
            }
        } catch (error: any) {
            ErrorHandler.showError(error, 'Error al cargar logo fiscal');
            if (error.message === 'CONFIG_MISSING') {
                alert('Faltan credenciales de Cloudinary.');
            }
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
            fiscalEmail: config.fiscalEmail,
            fiscalLogo: config.fiscalLogo,
            obligadoContabilidad: config.obligadoContabilidad,
            contribuyenteEspecial: config.contribuyenteEspecial,
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

    // Manejar reinicio de sistema de facturación
    const handleResetBilling = async () => {
        try {
            await api.bills.resetSystem();
            alert('Sistema de facturación reiniciado correctamente.\n\n- Facturas eliminadas\n- Secuencias en 0\n- Órdenes reseteadas');
            // Recargar configuración para ver la secuencia en 0 (aunque el context debería actualizarse si hiciéramos un fetch, forzamos recarga simple o dejamos que el usuario navegue)
            window.location.reload();
        } catch (error: any) {
            ErrorHandler.showError(error, 'Error al reiniciar sistema de facturación');
        }
    };

    return (
        <div>
            <ResetConfigModal
                isOpen={isResetConfigModalOpen}
                onClose={() => setIsResetConfigModalOpen(false)}
                onConfirm={handleResetConfig}
            />
            <ResetBillingModal
                isOpen={isResetBillingModalOpen}
                onClose={() => setIsResetBillingModalOpen(false)}
                onConfirm={handleResetBilling}
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
                                    placeholder="Sabor Tradicional"
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

                {/* Código QR del Menú */}
                <Card title="Código QR del Menú">
                    <div className="flex flex-col items-center justify-center p-6 space-y-4">
                        {businessInfo.website ? (
                            <>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                    <QRCodeCanvas
                                        id="qr-code-canvas"
                                        value={businessInfo.website.trim().startsWith('http') ? businessInfo.website.trim() : `https://${businessInfo.website.trim()}`}
                                        size={200}
                                        level={"H"}
                                        includeMargin={true}
                                    />
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
                                    Este código QR dirige a los clientes a: <br />
                                    <a href={businessInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium break-all">
                                        {businessInfo.website}
                                    </a>
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
                                        if (canvas) {
                                            const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                                            const downloadLink = document.createElement("a");
                                            downloadLink.href = pngUrl;
                                            downloadLink.download = `menu-qr-${businessInfo.name.replace(/\s+/g, '-').toLowerCase()}.png`;
                                            document.body.appendChild(downloadLink);
                                            downloadLink.click();
                                            document.body.removeChild(downloadLink);
                                        }
                                    }}
                                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    <span>Descargar QR</span>
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-orange-500 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">URL no configurada</h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
                                    Para generar el código QR, primero debes configurar la URL de "Sitio Web" en la sección de Información del Negocio.
                                </p>
                            </div>
                        )}
                    </div>
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

                {/* Datos de Facturación y SRI (Unificado) */}
                <Card title="Datos de Facturación y SRI">
                    <form onSubmit={handleSaveUnifiedBilling} className="space-y-6">

                        {/* Sección: Información Fiscal */}
                        <div>
                            <h3 className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-3 border-b border-gray-200 dark:border-gray-700 pb-1">Información Fiscal (RUC)</h3>

                            {/* Logo Fiscal */}
                            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Logo para Facturas</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Opcional. Si no se sube, se usará el logo del negocio.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {config.fiscalLogo ? (
                                        <div className="relative group">
                                            <img src={config.fiscalLogo} alt="Logo Fiscal" className="w-12 h-12 object-contain bg-white rounded border border-gray-200" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (confirm('¿Eliminar logo fiscal?')) updateConfig({ ...fiscalInfo, billing: billingConfig, fiscalLogo: '' });
                                                }}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        </div>
                                    )}
                                    <input
                                        ref={fiscalLogoInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFiscalLogoUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fiscalLogoInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="text-sm bg-white dark:bg-dark-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-dark-500 transition-colors"
                                    >
                                        {config.fiscalLogo ? 'Cambiar' : 'Subir'}
                                    </button>
                                </div>
                            </div>
                            {config.fiscalLogo && (
                                <div className="mb-4 text-xs text-gray-500 dark:text-gray-400 font-mono break-all bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
                                    URL Externa: {config.fiscalLogo}
                                </div>
                            )}

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
                                        placeholder="0999999999001"
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
                                        placeholder="Nombre Legal Completo"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Nombre que consta en el RUC (Persona Natural o Jurídica).</p>
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="fiscalEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico del RUC (Fiscal)</label>
                                    <input
                                        type="email"
                                        id="fiscalEmail"
                                        value={fiscalInfo.fiscalEmail || ''}
                                        onChange={(e) => setFiscalInfo({ ...fiscalInfo, fiscalEmail: e.target.value })}
                                        className={inputClass}
                                        placeholder="ejemplo@sri.com"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Correo registrado en el SRI para notificaciones electrónicas.</p>
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="contribuyenteEspecial" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nro. de Resolución de Contribuyente Especial (Opcional)</label>
                                    <input
                                        type="text"
                                        id="contribuyenteEspecial"
                                        value={fiscalInfo.contribuyenteEspecial || ''}
                                        onChange={(e) => setFiscalInfo({ ...fiscalInfo, contribuyenteEspecial: e.target.value })}
                                        className={inputClass}
                                        placeholder="Ej: 5368 (Dejar vacío si no aplica)"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <input
                                            type="checkbox"
                                            id="obligadoContabilidad"
                                            checked={fiscalInfo.obligadoContabilidad || false}
                                            onChange={(e) => setFiscalInfo({ ...fiscalInfo, obligadoContabilidad: e.target.checked })}
                                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="obligadoContabilidad" className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-200 cursor-pointer select-none">
                                            Obligado a llevar contabilidad
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sección: Configuración Técnica */}
                        <div>
                            <h3 className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-3 border-b border-gray-200 dark:border-gray-700 pb-1">Configuración Técnica (Puntos de Emisión)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="establishment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Establecimiento</label>
                                    <input
                                        type="text"
                                        id="establishment"
                                        value={billingConfig.establishment}
                                        onChange={(e) => setBillingConfig({ ...billingConfig, establishment: e.target.value })}
                                        className={`${inputClass} font-mono tracking-widest text-center`}
                                        maxLength={3}
                                        placeholder="001"
                                    />
                                    <p className="text-xs text-gray-500 mt-1 text-center">Ej: 001, 002...</p>
                                </div>
                                <div>
                                    <label htmlFor="emissionPoint" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Punto de Emisión</label>
                                    <input
                                        type="text"
                                        id="emissionPoint"
                                        value={billingConfig.emissionPoint}
                                        onChange={(e) => setBillingConfig({ ...billingConfig, emissionPoint: e.target.value })}
                                        className={`${inputClass} font-mono tracking-widest text-center`}
                                        maxLength={3}
                                        placeholder="001"
                                    />
                                    <p className="text-xs text-gray-500 mt-1 text-center">Ej: 001 (Caja 1)</p>
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
                        </div>

                        {/* Secuencias de Facturación (Avanzado) */}
                        <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-800/30">
                            <h4 className="text-sm font-bold text-orange-800 dark:text-orange-400 mb-2 flex items-center gap-2">
                                <span className="text-lg">⚠️</span> Configuración de Secuenciales (Avanzado)
                            </h4>
                            <p className="text-xs text-orange-700 dark:text-orange-300 mb-4 leading-relaxed">
                                Modifique estos valores <strong>SOLO</strong> si necesita sincronizar el sistema con una facturación física o electrónica anterior.
                                El número ingresado será el <strong>ÚLTIMO</strong> emitido (el sistema usará el siguiente: n+1).
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="seqFactura" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Secuencia Actual Facturas
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 font-mono text-sm">{billingConfig.establishment}-{billingConfig.emissionPoint}-</span>
                                        <input
                                            type="number"
                                            id="seqFactura"
                                            value={billingConfig.currentSequenceFactura}
                                            onChange={(e) => setBillingConfig({ ...billingConfig, currentSequenceFactura: parseInt(e.target.value) || 0 })}
                                            className={`${inputClass} font-mono`}
                                            min="0"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Siguiente a emitir: <strong>{(billingConfig.currentSequenceFactura || 0) + 1}</strong>
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="seqNC" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Secuencia Actual Notas de Crédito
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 font-mono text-sm">{billingConfig.establishment}-{billingConfig.emissionPoint}-</span>
                                        <input
                                            type="number"
                                            id="seqNC"
                                            value={billingConfig.currentSequenceNotaCredito || 0}
                                            onChange={(e) => setBillingConfig({ ...billingConfig, currentSequenceNotaCredito: parseInt(e.target.value) || 0 })}
                                            className={`${inputClass} font-mono`}
                                            min="0"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Siguiente a emitir: <strong>{(billingConfig.currentSequenceNotaCredito || 0) + 1}</strong>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button type="submit" className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm transition-all transform hover:scale-[1.02]">
                                Guardar Datos Facturación
                            </button>
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

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-red-600 dark:text-red-400">Reiniciar Sistema de Facturación (Limpiar Datos)</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Elimina <strong>TODAS</strong> las facturas y notas de crédito, y reinicia los contadores secuenciales a 0. Las órdenes se marcan como "no facturadas".
                                <br />
                                <span className="font-bold">Úsalo solo antes de entregar al cliente final.</span>
                            </p>
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={() => setIsResetBillingModalOpen(true)}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-bold transition-colors shadow-sm shadow-red-500/30 border border-red-700"
                                >
                                    Reiniciar Facturación (001)
                                </button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SettingsManagement;