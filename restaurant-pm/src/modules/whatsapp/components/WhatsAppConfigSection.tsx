/**
 * WhatsApp Connection Section - Baileys
 * Ligero y rápido, sin Chromium
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { whatsappService, WhatsAppStatus } from '../services/whatsappService';
import { whatsappSocket } from '../services/whatsappSocket';

export const WhatsAppConfigSection: React.FC = () => {
    const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
    const [status, setStatus] = useState<WhatsAppStatus | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Verificar si está habilitado
    const checkEnabled = useCallback(async () => {
        try {
            const response = await whatsappService.isEnabled();
            setIsEnabled(response.enabled);
            return response.enabled;
        } catch {
            setIsEnabled(false);
            return false;
        }
    }, []);

    // Cargar estado
    const loadStatus = useCallback(async () => {
        try {
            const statusData = await whatsappService.getStatus();
            setStatus(statusData);

            if (!statusData.isConnected && statusData.hasQR) {
                const qr = await whatsappService.getQR();
                if (qr.qrCode) {
                    setQrCode(qr.qrCode);
                    setConnecting(false);
                }
            } else if (statusData.isConnected) {
                setQrCode(null);
                setConnecting(false);
            }
        } catch (err) {
            console.error('Error loading status:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Inicializar
    useEffect(() => {
        // Funciones de desuscripción de los listeners de esta vista
        const unsubscribers: Array<() => void> = [];

        const init = async () => {
            const enabled = await checkEnabled();
            if (enabled) {
                await loadStatus();

                // WebSocket para actualizaciones en tiempo real
                whatsappSocket.connect();

                unsubscribers.push(whatsappSocket.on('qr', (data: { qrCode: string }) => {
                    if (data.qrCode) {
                        setQrCode(data.qrCode);
                        setConnecting(false);
                    }
                }));

                unsubscribers.push(whatsappSocket.on('connected', () => {
                    setStatus(prev => prev ? { ...prev, isConnected: true } : null);
                    setQrCode(null);
                    setConnecting(false);
                    setMessage({ type: 'success', text: 'WhatsApp conectado!' });
                }));

                unsubscribers.push(whatsappSocket.on('disconnected', () => {
                    setStatus(prev => prev ? { ...prev, isConnected: false } : null);
                }));

                // Polling de respaldo cada 3 segundos
                pollingRef.current = setInterval(loadStatus, 3000);
            } else {
                setLoading(false);
            }
        };

        init();

        return () => {
            // Solo quitamos los listeners de esta vista — NO desconectamos el socket:
            // la conexión es compartida con la alerta global de "cliente escribiendo"
            // que vive en AdminApp y debe seguir activa en todo el admin.
            unsubscribers.forEach(unsub => unsub());
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [checkEnabled, loadStatus]);

    const handleConnect = async () => {
        try {
            setConnecting(true);
            setMessage({ type: 'info', text: 'Conectando... el QR aparecera en segundos' });
            await whatsappService.connect();

            // Polling para obtener el QR (cada 1s por 30 segundos)
            let attempts = 0;
            const maxAttempts = 30;
            const pollForQR = async () => {
                if (attempts >= maxAttempts) {
                    setMessage({ type: 'error', text: 'Timeout esperando QR. Intenta de nuevo.' });
                    setConnecting(false);
                    return;
                }
                attempts++;

                try {
                    const qrResponse = await whatsappService.getQR();
                    if (qrResponse.qrCode) {
                        setQrCode(qrResponse.qrCode);
                        setConnecting(false);
                        setMessage(null);
                        return;
                    }

                    const statusResponse = await whatsappService.getStatus();
                    if (statusResponse.isConnected) {
                        setStatus(statusResponse);
                        setQrCode(null);
                        setConnecting(false);
                        setMessage({ type: 'success', text: 'WhatsApp conectado!' });
                        return;
                    }
                } catch {
                    // Ignorar errores, seguir intentando
                }

                setTimeout(pollForQR, 1000);
            };

            setTimeout(pollForQR, 1000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error al conectar' });
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            setLoading(true);
            await whatsappService.disconnect();
            setMessage({ type: 'success', text: 'Sesion cerrada' });
            setQrCode(null);
            setStatus(prev => prev ? { ...prev, isConnected: false } : null);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error' });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!confirm('¿Cerrar sesion y generar nuevo QR?')) return;

        try {
            setLoading(true);
            await whatsappService.resetSession();
            setMessage({ type: 'info', text: 'Sesion reiniciada' });
            setQrCode(null);
            setStatus(prev => prev ? { ...prev, isConnected: false } : null);
            setTimeout(loadStatus, 2000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error' });
        } finally {
            setLoading(false);
        }
    };

    // Loading
    if (loading && isEnabled === null) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        );
    }

    // Deshabilitado
    if (isEnabled === false) {
        return (
            <div className="p-6 bg-gray-100 dark:bg-dark-800 rounded-xl text-center">
                <p className="text-gray-600 dark:text-gray-400">
                    WhatsApp no esta habilitado en el servidor.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                    Configura WHATSAPP_ENABLED=true
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Estado */}
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
                                : 'Escanea el codigo QR'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Mensaje */}
            {message && (
                <div className={`p-3 rounded-lg ${
                    message.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/30' :
                    message.type === 'error' ? 'bg-red-500/10 text-red-600 border border-red-500/30' :
                    'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                }`}>
                    {message.text}
                </div>
            )}

            {/* QR / Conectar */}
            {!status?.isConnected && (
                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-dark-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                        Conectar WhatsApp
                    </h3>

                    {qrCode ? (
                        <div className="flex flex-col items-center space-y-4">
                            <div className="bg-white p-4 rounded-xl shadow-lg">
                                <img src={qrCode} alt="QR" className="w-64 h-64" />
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                Abre WhatsApp → Dispositivos vinculados → Escanea
                            </p>
                            <button
                                onClick={loadStatus}
                                className="text-sm text-green-600 hover:underline"
                            >
                                Refrescar QR
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-64 h-64 bg-gray-100 dark:bg-dark-700 rounded-xl flex items-center justify-center">
                                {connecting ? (
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-3"></div>
                                        <p className="text-gray-500 text-sm">Generando QR...</p>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center px-4">
                                        Presiona Conectar
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={handleConnect}
                                disabled={connecting}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
                            >
                                {connecting ? 'Conectando...' : 'Conectar WhatsApp'}
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
                            >
                                Reiniciar Sesion
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Acciones cuando conectado */}
            {status?.isConnected && (
                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-dark-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Acciones</h3>
                    <div className="flex gap-3">
                        <button
                            onClick={handleDisconnect}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                        >
                            Cerrar Sesion
                        </button>
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                        >
                            Reiniciar
                        </button>
                    </div>
                </div>
            )}

            {/* Instrucciones */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">
                    Como funciona
                </h3>
                <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>1. Presiona "Conectar WhatsApp"</li>
                    <li>2. El QR aparece en segundos</li>
                    <li>3. Abre WhatsApp → Dispositivos vinculados</li>
                    <li>4. Escanea el codigo</li>
                    <li>5. Listo! El chatbot responde automaticamente</li>
                </ol>
            </div>
        </div>
    );
};
