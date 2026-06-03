/**
 * WhatsApp Connection Section
 * Permite conectar WhatsApp escaneando QR (whatsapp-web.js)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { whatsappService, WhatsAppStatus, WhatsAppQR } from '../services/whatsappService';

export const WhatsAppConfigSection: React.FC = () => {
    const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
    const [disabledMessage, setDisabledMessage] = useState<string>('');
    const [status, setStatus] = useState<WhatsAppStatus | null>(null);
    const [qrData, setQrData] = useState<WhatsAppQR | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    // Check if WhatsApp is enabled on server
    const checkEnabled = useCallback(async () => {
        try {
            const response = await whatsappService.isEnabled();
            setIsEnabled(response.enabled);
            setDisabledMessage(response.message);
            return response.enabled;
        } catch (err) {
            console.error('Error checking if WhatsApp is enabled:', err);
            setIsEnabled(false);
            setDisabledMessage('Error al verificar el estado de WhatsApp');
            return false;
        }
    }, []);

    const loadStatus = useCallback(async () => {
        try {
            // First check if enabled
            const enabled = await checkEnabled();
            if (!enabled) {
                setLoading(false);
                return;
            }

            const statusData = await whatsappService.getStatus();
            setStatus(statusData);

            if (!statusData.isConnected && statusData.hasQR) {
                const qr = await whatsappService.getQR();
                setQrData(qr);
            } else {
                setQrData(null);
            }
        } catch (err) {
            console.error('Error loading status:', err);
        } finally {
            setLoading(false);
        }
    }, [checkEnabled]);

    useEffect(() => {
        loadStatus();

        // Poll every 3 seconds to detect connection changes
        const interval = setInterval(() => {
            if (isEnabled) {
                loadStatus();
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [loadStatus, isEnabled]);

    const handleConnect = async () => {
        try {
            setConnecting(true);
            setMessage({ type: 'info', text: 'Iniciando conexion...' });
            await whatsappService.connect();
            setTimeout(async () => {
                await loadStatus();
                setConnecting(false);
            }, 2000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error al conectar' });
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            setLoading(true);
            await whatsappService.disconnect();
            setMessage({ type: 'success', text: 'Sesion cerrada correctamente' });
            await loadStatus();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error al desconectar' });
        } finally {
            setLoading(false);
        }
    };

    const handleReloadMenu = async () => {
        try {
            const result = await whatsappService.reloadMenu();
            setMessage({ type: 'success', text: `Menu recargado: ${result.itemsLoaded} productos` });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error al recargar menu' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        );
    }

    // Show disabled message if WhatsApp is not enabled on server
    if (isEnabled === false) {
        return (
            <div className="space-y-6">
                {/* Disabled Status Card */}
                <div className="p-4 rounded-lg border bg-gray-500/10 border-gray-500/30">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                                WhatsApp No Disponible
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {disabledMessage}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-3">
                        ¿Por qué está deshabilitado?
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                        WhatsApp requiere recursos adicionales del servidor (Chromium).
                        Para habilitar esta función, el administrador del servidor debe configurar
                        la variable de entorno <code className="bg-gray-200 dark:bg-dark-700 px-2 py-0.5 rounded">WHATSAPP_ENABLED=true</code>.
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Contacta al administrador si necesitas esta funcionalidad.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Status Card */}
            <div className={`p-4 rounded-lg border ${
                status?.isConnected
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                        status?.isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                    }`}></div>
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                            {status?.isConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {status?.isConnected
                                ? `Numero: ${status.phoneNumber || 'N/A'}`
                                : 'Escanea el codigo QR para conectar'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-3 rounded-lg ${
                    message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/30' :
                    message.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/30' :
                    'bg-blue-500/10 text-blue-500 border border-blue-500/30'
                }`}>
                    {message.text}
                </div>
            )}

            {/* QR Code Section */}
            {!status?.isConnected && (
                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-dark-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                        Conectar WhatsApp
                    </h3>

                    {qrData?.qrCode ? (
                        <div className="flex flex-col items-center space-y-4">
                            <div className="bg-white p-4 rounded-xl shadow-lg">
                                <img src={qrData.qrCode} alt="QR Code" className="w-64 h-64" />
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-sm">
                                Abre WhatsApp en tu telefono, ve a <strong>Dispositivos vinculados</strong> y escanea este codigo
                            </p>
                            <button onClick={loadStatus} className="text-sm text-green-600 hover:text-green-700 underline">
                                Refrescar QR
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-64 h-64 bg-gray-100 dark:bg-dark-700 rounded-xl flex items-center justify-center">
                                <p className="text-gray-500 dark:text-gray-400 text-center px-4">
                                    {connecting ? 'Generando QR...' : 'Presiona conectar para generar el codigo QR'}
                                </p>
                            </div>
                            <button
                                onClick={handleConnect}
                                disabled={connecting}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {connecting ? 'Conectando...' : 'Conectar WhatsApp'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Connected Actions */}
            {status?.isConnected && (
                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-dark-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Acciones</h3>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={handleReloadMenu} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
                            Recargar Menu
                        </button>
                        <button onClick={handleDisconnect} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                            Cerrar Sesion
                        </button>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">Como funciona</h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>1. Presiona "Conectar WhatsApp" para generar el codigo QR</li>
                    <li>2. Abre WhatsApp en tu telefono</li>
                    <li>3. Ve a Configuracion &gt; Dispositivos vinculados &gt; Vincular dispositivo</li>
                    <li>4. Escanea el codigo QR</li>
                    <li>5. Listo! El chatbot respondera automaticamente</li>
                </ul>
            </div>
        </div>
    );
};
