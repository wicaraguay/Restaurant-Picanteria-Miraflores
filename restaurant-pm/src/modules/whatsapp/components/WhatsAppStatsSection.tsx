/**
 * WhatsApp Stats Section - Simplificado
 * Solo muestra estado de conexion
 */

import React, { useState, useEffect } from 'react';
import { whatsappService, WhatsAppStatus } from '../services/whatsappService';

export const WhatsAppStatsSection: React.FC = () => {
    const [status, setStatus] = useState<WhatsAppStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStatus();
        const interval = setInterval(loadStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadStatus = async () => {
        try {
            const data = await whatsappService.getStatus();
            setStatus(data);
        } catch (err) {
            console.error('Error loading status:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        );
    }

    if (!status) {
        return (
            <div className="text-center py-12 text-gray-500">
                <p>No se pudo cargar el estado</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-dark-700">
                    <p className="text-sm text-gray-500 mb-2">Estado de Conexion</p>
                    <p className={`text-2xl font-bold ${status.isConnected ? 'text-green-500' : 'text-red-500'}`}>
                        {status.isConnected ? 'Conectado' : 'Desconectado'}
                    </p>
                </div>
                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-dark-700">
                    <p className="text-sm text-gray-500 mb-2">Numero Conectado</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {status.phoneNumber || 'Sin numero'}
                    </p>
                </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
                    Funcionamiento del Chatbot
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <li>• Cuando alguien escribe, el bot envia automaticamente el menu del dia</li>
                    <li>• El menu se obtiene de la seccion "Menu Diario" configurada para hoy</li>
                    <li>• Si esta fuera del horario de atencion, envia el mensaje de cerrado</li>
                    <li>• Configura horarios y mensaje en la pestana "Chatbot"</li>
                </ul>
            </div>

            {status.lastActivity && (
                <div className="text-sm text-gray-500 text-center">
                    Ultima actividad: {new Date(status.lastActivity).toLocaleString()}
                </div>
            )}
        </div>
    );
};
