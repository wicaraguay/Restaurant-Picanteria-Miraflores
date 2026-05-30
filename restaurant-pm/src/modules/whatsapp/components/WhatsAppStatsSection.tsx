/**
 * WhatsApp Stats Section
 * Estadisticas del chatbot
 */

import React, { useState, useEffect } from 'react';
import { whatsappService, WhatsAppStats } from '../services/whatsappService';

export const WhatsAppStatsSection: React.FC = () => {
    const [stats, setStats] = useState<WhatsAppStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadStats = async () => {
        try {
            const data = await whatsappService.getStats();
            setStats(data);
        } catch (err) {
            console.error('Error loading stats:', err);
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

    if (!stats) {
        return (
            <div className="text-center py-12 text-gray-500">
                <p>No se pudieron cargar las estadisticas</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-dark-700">
                    <p className="text-sm text-gray-500">Estado</p>
                    <p className={`text-2xl font-bold ${stats.isConnected ? 'text-green-500' : 'text-red-500'}`}>
                        {stats.isConnected ? 'Conectado' : 'Desconectado'}
                    </p>
                </div>
                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-dark-700">
                    <p className="text-sm text-gray-500">Numero</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.phoneNumber || 'N/A'}
                    </p>
                </div>
                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-dark-700">
                    <p className="text-sm text-gray-500">Conversaciones Totales</p>
                    <p className="text-2xl font-bold text-blue-500">{stats.totalConversations}</p>
                </div>
                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-dark-700">
                    <p className="text-sm text-gray-500">Conversaciones Activas</p>
                    <p className="text-2xl font-bold text-green-500">{stats.activeConversations}</p>
                </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
                    Informacion
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Las estadisticas de pedidos se muestran en el Dashboard principal. 
                    Los pedidos de WhatsApp se sincronizan automaticamente con la seccion de Gestion de Pedidos.
                </p>
            </div>
        </div>
    );
};
