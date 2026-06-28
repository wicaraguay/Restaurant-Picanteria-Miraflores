/**
 * WhatsApp Connection Section
 * Permite conectar WhatsApp escaneando QR (whatsapp-web.js)
 *
 * Usa WebSocket para recibir el QR en tiempo real (sin polling)
 * Con fallback a HTTP polling si WebSocket no está disponible.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { whatsappService, WhatsAppStatus } from '../services/whatsappService';
import { whatsappSocket } from '../services/whatsappSocket';

export const WhatsAppConfigSection: React.FC = () => {
    const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
    const [disabledMessage, setDisabledMessage] = useState<string>('');
    const [status, setStatus] = useState<WhatsAppStatus | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [useWebSocket, setUseWebSocket] = useState(true);
    const [wsConnected, setWsConnected] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

    // Cargar estado via HTTP (fallback)
    const loadStatusHTTP = useCallback(async (skipEnabledCheck = false) => {
        try {
            if (!skipEnabledCheck) {
                const enabled = await checkEnabled();
                if (!enabled) {
                    setLoading(false);
                    return;
                }
            }

            if (isEnabled === false) {
                setLoading(false);
                return;
            }

            const statusData = await whatsappService.getStatus();
            setStatus(statusData);

            if (!statusData.isConnected && statusData.hasQR) {
                const qr = await whatsappService.getQR();
                if (qr.qrCode) {
                    setQrCode(qr.qrCode);
                }
            } else if (statusData.isConnected) {
                setQrCode(null);
            }
        } catch (err) {
            console.error('Error loading status via HTTP:', err);
        } finally {
            setLoading(false);
        }
    }, [checkEnabled, isEnabled]);

    // Iniciar polling HTTP (fallback cuando WebSocket no funciona)
    const startHTTPPolling = useCallback(() => {
        if (pollingIntervalRef.current) return;

        console.log('[WhatsApp] Starting HTTP polling fallback');
        pollingIntervalRef.current = setInterval(() => {
            if (isEnabled) {
                loadStatusHTTP(true);
            }
        }, 5000); // Polling más rápido como fallback (5s)
    }, [isEnabled, loadStatusHTTP]);

    // Detener polling HTTP
    const stopHTTPPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }, []);

    // Conectar WebSocket y configurar listeners
    useEffect(() => {
        if (!isEnabled) return;

        // Primero cargar estado inicial via HTTP
        loadStatusHTTP();

        if (!useWebSocket) {
            startHTTPPolling();
            return () => stopHTTPPolling();
        }

        // Conectar WebSocket
        whatsappSocket.connect();

        // Listener: conexión establecida
        const unsubConnected = whatsappSocket.on('connected', () => {
            console.log('[WhatsApp] WebSocket connected');
            setWsConnected(true);
            stopHTTPPolling(); // Detener polling si estaba activo
        });

        // Listener: QR recibido
        const unsubQR = whatsappSocket.on('qr', (data: { qrCode: string }) => {
            console.log('[WhatsApp] QR received via WebSocket');
            if (data.qrCode) {
                setQrCode(data.qrCode);
                setConnecting(false);
                setStatus(prev => prev ? { ...prev, isConnected: false, hasQR: true } : null);
            }
        });

        // Listener: estado recibido
        const unsubStatus = whatsappSocket.on('status', (data: any) => {
            setStatus({
                isConnected: data.isAuthenticated || data.isReady,
                isAuthenticated: data.isAuthenticated || false,
                phoneNumber: data.phoneNumber || null,
                hasQR: data.hasQR || false,
                lastActivity: data.lastActivity || null
            });
            if (data.isAuthenticated || data.isReady) {
                setQrCode(null);
                setConnecting(false);
            }
        });

        // Listener: autenticado
        const unsubAuth = whatsappSocket.on('authenticated', () => {
            console.log('[WhatsApp] Authenticated via WebSocket');
            setStatus(prev => prev
                ? { ...prev, isConnected: true, isAuthenticated: true }
                : { isConnected: true, isAuthenticated: true, phoneNumber: null, hasQR: false, lastActivity: null }
            );
            setQrCode(null);
            setConnecting(false);
            setMessage({ type: 'success', text: 'WhatsApp conectado exitosamente!' });
        });

        // Listener: listo
        const unsubReady = whatsappSocket.on('ready', (data: { phoneNumber?: string }) => {
            console.log('[WhatsApp] Ready via WebSocket');
            setStatus({
                isConnected: true,
                isAuthenticated: true,
                phoneNumber: data.phoneNumber || null,
                hasQR: false,
                lastActivity: new Date().toISOString()
            });
            setQrCode(null);
            setConnecting(false);
        });

        // Listener: desconectado
        const unsubDisconnected = whatsappSocket.on('disconnected', () => {
            setStatus(prev => prev ? { ...prev, isConnected: false } : null);
            setMessage({ type: 'info', text: 'WhatsApp desconectado' });
        });

        // Listener: fallback a HTTP
        const unsubFallback = whatsappSocket.on('fallback', () => {
            console.log('[WhatsApp] Falling back to HTTP polling');
            setUseWebSocket(false);
            setWsConnected(false);
            startHTTPPolling();
        });

        // Cleanup
        return () => {
            unsubConnected();
            unsubQR();
            unsubStatus();
            unsubAuth();
            unsubReady();
            unsubDisconnected();
            unsubFallback();
            whatsappSocket.disconnect();
            stopHTTPPolling();
        };
    }, [isEnabled, useWebSocket, loadStatusHTTP, startHTTPPolling, stopHTTPPolling]);

    // Verificar si WhatsApp está habilitado al montar
    useEffect(() => {
        checkEnabled();
    }, [checkEnabled]);

    const handleConnect = async () => {
        try {
            setConnecting(true);
            setMessage({ type: 'info', text: 'Iniciando WhatsApp... (puede tomar 30-60 segundos)' });
            await whatsappService.connect();

            // Si tenemos WebSocket, el QR llegará automáticamente
            // Si no, hacer polling más frecuente
            if (!wsConnected) {
                const checkQR = async () => {
                    for (let i = 0; i < 30; i++) { // Máximo 60 segundos
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await loadStatusHTTP(true);
                        if (qrCode || status?.isConnected) break;
                    }
                    setConnecting(false);
                };
                checkQR();
            }
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
            setQrCode(null);
            setStatus(prev => prev ? { ...prev, isConnected: false } : null);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error al desconectar' });
        } finally {
            setLoading(false);
        }
    };

    const handleResetSession = async () => {
        if (!confirm('¿Estás seguro? Esto cerrará la sesión y tendrás que escanear el QR nuevamente.')) {
            return;
        }
        try {
            setLoading(true);
            setMessage({ type: 'info', text: 'Reiniciando sesión...' });
            await whatsappService.resetSession();
            setMessage({ type: 'success', text: 'Sesión reiniciada. Espera unos segundos para el nuevo QR.' });
            setQrCode(null);
            setStatus(prev => prev ? { ...prev, isConnected: false, isAuthenticated: false } : null);
            // Esperar y refrescar
            setTimeout(() => {
                loadStatusHTTP(true);
            }, 3000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error al reiniciar sesión' });
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

    const handleRefreshQR = () => {
        if (wsConnected) {
            whatsappSocket.requestQR();
        } else {
            loadStatusHTTP(true);
        }
    };

    if (loading && isEnabled === null) {
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
            {/* Connection Status Indicator */}
            <div className="flex items-center justify-between">
                <div className={`p-4 rounded-lg border flex-1 ${
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

                {/* WebSocket indicator */}
                <div className="ml-4 flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                    <span className="text-xs text-gray-500 mt-1">
                        {wsConnected ? 'WS' : 'HTTP'}
                    </span>
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

                    {qrCode ? (
                        <div className="flex flex-col items-center space-y-4">
                            <div className="bg-white p-4 rounded-xl shadow-lg">
                                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-sm">
                                Abre WhatsApp en tu telefono, ve a <strong>Dispositivos vinculados</strong> y escanea este codigo
                            </p>
                            <button
                                onClick={handleRefreshQR}
                                className="text-sm text-green-600 hover:text-green-700 underline"
                            >
                                Refrescar QR
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center space-y-4">
                            <div className="w-64 h-64 bg-gray-100 dark:bg-dark-700 rounded-xl flex items-center justify-center">
                                {connecting ? (
                                    <div className="flex flex-col items-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-3"></div>
                                        <p className="text-gray-500 dark:text-gray-400 text-center px-4 text-sm">
                                            Iniciando Chromium...
                                            <br />
                                            <span className="text-xs">(30-60 segundos)</span>
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 text-center px-4">
                                        Presiona conectar para generar el codigo QR
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={handleConnect}
                                disabled={connecting}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                {connecting ? 'Conectando...' : 'Conectar WhatsApp'}
                            </button>
                            <button
                                onClick={handleResetSession}
                                disabled={loading}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                Reiniciar Sesión
                            </button>
                            <p className="text-xs text-gray-500 text-center max-w-xs">
                                Usa "Reiniciar" si ves error de perfil bloqueado
                            </p>
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
                        <button onClick={handleResetSession} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors">
                            Reiniciar Sesion
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                        Usa "Reiniciar Sesión" si tienes problemas de conexión o errores de perfil bloqueado.
                    </p>
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
                <p className="text-xs text-gray-500 mt-3">
                    {wsConnected
                        ? '✓ Conexion en tiempo real activa (WebSocket)'
                        : '○ Usando polling HTTP (actualiza cada 5s)'}
                </p>
            </div>
        </div>
    );
};
