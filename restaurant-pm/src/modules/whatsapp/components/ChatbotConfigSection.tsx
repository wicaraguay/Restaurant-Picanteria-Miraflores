/**
 * Chatbot Configuration Section - Version Simplificada
 * Solo configura: nombre del negocio y horarios de atencion
 */

import React, { useState, useEffect } from 'react';
import { whatsappService, ChatbotConfig, ScheduleDay } from '../services/whatsappService';

export const ChatbotConfigSection: React.FC = () => {
    const [config, setConfig] = useState<ChatbotConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const data = await whatsappService.getChatbotConfig();
            setConfig(data);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error al cargar configuracion' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config) return;

        try {
            setSaving(true);
            setMessage(null);
            await whatsappService.updateChatbotConfig(config);
            setMessage({ type: 'success', text: 'Configuracion guardada correctamente' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error al guardar' });
        } finally {
            setSaving(false);
        }
    };

    const updateField = (path: string, value: any) => {
        if (!config) return;

        const newConfig = { ...config };
        const keys = path.split('.');
        let obj: any = newConfig;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;

        setConfig(newConfig);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="p-4 bg-red-500/10 text-red-500 rounded-lg">
                No se pudo cargar la configuracion
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Message */}
            {message && (
                <div className={`p-3 rounded-lg ${
                    message.type === 'success'
                        ? 'bg-green-500/10 text-green-500 border border-green-500/30'
                        : 'bg-red-500/10 text-red-500 border border-red-500/30'
                }`}>
                    {message.text}
                </div>
            )}

            {/* Info Card */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h3 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Chatbot Simple</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Cuando alguien escriba por WhatsApp, el bot respondera automaticamente con el menu del dia configurado.
                    Si esta fuera del horario de atencion, enviara el mensaje de cerrado.
                </p>
            </div>

            {/* General */}
            <div className="bg-light-surface dark:bg-dark-800 rounded-xl p-6 border border-light-border dark:border-dark-700">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">Informacion General</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre del Negocio
                    </label>
                    <input
                        type="text"
                        value={config.businessName || ''}
                        onChange={(e) => updateField('businessName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        placeholder="Mi Restaurante"
                    />
                    <p className="mt-1 text-xs text-gray-500">Se mostrara en los mensajes del chatbot</p>
                </div>
            </div>

            {/* Horarios */}
            <div className="bg-light-surface dark:bg-dark-800 rounded-xl p-6 border border-light-border dark:border-dark-700 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">Horarios de Atencion</h3>
                        <p className="text-sm text-gray-500">
                            {config.schedule?.enabled
                                ? 'El chatbot responde solo en horario de atencion'
                                : 'El chatbot responde 24/7'}
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.schedule?.enabled ?? false}
                            onChange={(e) => updateField('schedule.enabled', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                    </label>
                </div>

                {config.schedule?.enabled && (
                    <>
                        {/* Zona horaria */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Zona Horaria
                            </label>
                            <select
                                value={config.schedule?.timezone || 'America/Guayaquil'}
                                onChange={(e) => updateField('schedule.timezone', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                            >
                                <option value="America/Guayaquil">Ecuador (America/Guayaquil)</option>
                                <option value="America/Lima">Peru (America/Lima)</option>
                                <option value="America/Bogota">Colombia (America/Bogota)</option>
                                <option value="America/Mexico_City">Mexico (America/Mexico_City)</option>
                            </select>
                        </div>

                        {/* Horarios por dia */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Horarios por Dia</h4>

                            {(config.schedule?.days || []).map((day, index) => (
                                <div key={day.dayOfWeek} className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {day.dayName}
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={day.isOpen}
                                                onChange={(e) => {
                                                    const days = [...(config.schedule?.days || [])];
                                                    days[index] = { ...days[index], isOpen: e.target.checked };
                                                    updateField('schedule.days', days);
                                                }}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                                {day.isOpen ? 'Abierto' : 'Cerrado'}
                                            </span>
                                        </label>
                                    </div>

                                    {day.isOpen && (
                                        <div className="flex gap-4 items-center">
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-500 mb-1">Apertura</label>
                                                <input
                                                    type="time"
                                                    value={day.openTime}
                                                    onChange={(e) => {
                                                        const days = [...(config.schedule?.days || [])];
                                                        days[index] = { ...days[index], openTime: e.target.value };
                                                        updateField('schedule.days', days);
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <span className="text-gray-400 pt-5">-</span>
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-500 mb-1">Cierre</label>
                                                <input
                                                    type="time"
                                                    value={day.closeTime}
                                                    onChange={(e) => {
                                                        const days = [...(config.schedule?.days || [])];
                                                        days[index] = { ...days[index], closeTime: e.target.value };
                                                        updateField('schedule.days', days);
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Mensaje de cerrado */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Mensaje Fuera de Horario
                            </label>
                            <textarea
                                value={config.schedule?.closedMessage || ''}
                                onChange={(e) => updateField('schedule.closedMessage', e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                                placeholder="Lo sentimos, estamos cerrados. Nuestro horario es..."
                            />
                            <p className="mt-1 text-xs text-gray-500">Mensaje que se envia cuando escriben fuera del horario</p>
                        </div>
                    </>
                )}
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
                {saving ? 'Guardando...' : 'Guardar Configuracion'}
            </button>
        </div>
    );
};
