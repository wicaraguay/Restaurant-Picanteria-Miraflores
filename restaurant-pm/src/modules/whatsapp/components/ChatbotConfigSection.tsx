/**
 * Chatbot Configuration Section
 * Permite configurar los mensajes y comportamiento del chatbot
 */

import React, { useState, useEffect } from 'react';
import { whatsappService, ChatbotConfig, BankAccount, ScheduleDay } from '../services/whatsappService';

export const ChatbotConfigSection: React.FC = () => {
    const [config, setConfig] = useState<ChatbotConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'messages' | 'settings' | 'payments' | 'schedule' | 'location'>('general');

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
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-dark-700 overflow-x-auto">
                {[
                    { id: 'general', label: 'General' },
                    { id: 'messages', label: 'Mensajes' },
                    { id: 'payments', label: 'Pagos' },
                    { id: 'schedule', label: 'Horarios' },
                    { id: 'location', label: 'Ubicacion' },
                    { id: 'settings', label: 'Ajustes' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                            activeTab === tab.id
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

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

            {/* General Tab */}
            {activeTab === 'general' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nombre del Negocio
                        </label>
                        <input
                            type="text"
                            value={config.businessName}
                            onChange={(e) => updateField('businessName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                            placeholder="Mi Restaurante"
                        />
                        <p className="mt-1 text-xs text-gray-500">Se mostrara en los mensajes de bienvenida</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tiempo Estimado de Entrega
                        </label>
                        <input
                            type="text"
                            value={config.estimatedDeliveryTime}
                            onChange={(e) => updateField('estimatedDeliveryTime', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                            placeholder="30-45 minutos"
                        />
                    </div>
                </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Mensaje de Bienvenida
                        </label>
                        <textarea
                            value={config.messages.welcome}
                            onChange={(e) => updateField('messages.welcome', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                            placeholder="Hola! Bienvenido a {businessName}"
                        />
                        <p className="mt-1 text-xs text-gray-500">Usa {'{businessName}'} para insertar el nombre del negocio</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Encabezado del Menu
                        </label>
                        <input
                            type="text"
                            value={config.messages.menuHeader}
                            onChange={(e) => updateField('messages.menuHeader', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Pie del Menu
                        </label>
                        <input
                            type="text"
                            value={config.messages.menuFooter}
                            onChange={(e) => updateField('messages.menuFooter', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Preguntar Nombre
                        </label>
                        <input
                            type="text"
                            value={config.messages.askName}
                            onChange={(e) => updateField('messages.askName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Preguntar Direccion
                        </label>
                        <input
                            type="text"
                            value={config.messages.askAddress}
                            onChange={(e) => updateField('messages.askAddress', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Pedido Confirmado
                        </label>
                        <textarea
                            value={config.messages.orderConfirmed}
                            onChange={(e) => updateField('messages.orderConfirmed', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        />
                        <p className="mt-1 text-xs text-gray-500">Usa {'{estimatedTime}'} para el tiempo de entrega</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Pedido Cancelado
                        </label>
                        <input
                            type="text"
                            value={config.messages.orderCancelled}
                            onChange={(e) => updateField('messages.orderCancelled', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Mensaje de Error
                        </label>
                        <input
                            type="text"
                            value={config.messages.error}
                            onChange={(e) => updateField('messages.error', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Menu No Disponible
                        </label>
                        <input
                            type="text"
                            value={config.messages.noMenu}
                            onChange={(e) => updateField('messages.noMenu', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
                <div className="space-y-6">
                    {/* Metodos de pago */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 dark:text-white">Metodos de Pago</h3>

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Efectivo</p>
                                <p className="text-sm text-gray-500">Pago al recibir el pedido</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.paymentInfo?.acceptsCash ?? true}
                                    onChange={(e) => updateField('paymentInfo.acceptsCash', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Transferencia Bancaria</p>
                                <p className="text-sm text-gray-500">Mostrar datos bancarios al confirmar</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.paymentInfo?.acceptsTransfer ?? true}
                                    onChange={(e) => updateField('paymentInfo.acceptsTransfer', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Mensaje de transferencia */}
                    {config.paymentInfo?.acceptsTransfer && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Mensaje para Transferencia
                            </label>
                            <input
                                type="text"
                                value={config.paymentInfo?.transferMessage || ''}
                                onChange={(e) => updateField('paymentInfo.transferMessage', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                                placeholder="Envia el comprobante de pago a este numero"
                            />
                        </div>
                    )}

                    {/* Cuentas bancarias */}
                    {config.paymentInfo?.acceptsTransfer && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-900 dark:text-white">Cuentas Bancarias</h3>
                                <button
                                    onClick={() => {
                                        const banks = config.paymentInfo?.banks || [];
                                        const newBank: BankAccount = {
                                            bankName: '',
                                            accountType: 'Ahorros',
                                            accountNumber: '',
                                            accountHolder: '',
                                            identification: ''
                                        };
                                        updateField('paymentInfo.banks', [...banks, newBank]);
                                    }}
                                    className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                >
                                    + Agregar Banco
                                </button>
                            </div>

                            {(!config.paymentInfo?.banks || config.paymentInfo.banks.length === 0) && (
                                <p className="text-sm text-gray-500 italic">
                                    No hay cuentas bancarias configuradas. Agrega al menos una para mostrar datos de transferencia.
                                </p>
                            )}

                            {config.paymentInfo?.banks?.map((bank, index) => (
                                <div key={index} className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Banco #{index + 1}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const banks = [...(config.paymentInfo?.banks || [])];
                                                banks.splice(index, 1);
                                                updateField('paymentInfo.banks', banks);
                                            }}
                                            className="text-red-500 hover:text-red-600 text-sm"
                                        >
                                            Eliminar
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Nombre del Banco</label>
                                            <input
                                                type="text"
                                                value={bank.bankName}
                                                onChange={(e) => {
                                                    const banks = [...(config.paymentInfo?.banks || [])];
                                                    banks[index] = { ...banks[index], bankName: e.target.value };
                                                    updateField('paymentInfo.banks', banks);
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
                                                placeholder="Banco Pichincha"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Tipo de Cuenta</label>
                                            <select
                                                value={bank.accountType}
                                                onChange={(e) => {
                                                    const banks = [...(config.paymentInfo?.banks || [])];
                                                    banks[index] = { ...banks[index], accountType: e.target.value as 'Ahorros' | 'Corriente' };
                                                    updateField('paymentInfo.banks', banks);
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
                                            >
                                                <option value="Ahorros">Ahorros</option>
                                                <option value="Corriente">Corriente</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Numero de Cuenta</label>
                                        <input
                                            type="text"
                                            value={bank.accountNumber}
                                            onChange={(e) => {
                                                const banks = [...(config.paymentInfo?.banks || [])];
                                                banks[index] = { ...banks[index], accountNumber: e.target.value };
                                                updateField('paymentInfo.banks', banks);
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
                                            placeholder="2200123456"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Titular</label>
                                            <input
                                                type="text"
                                                value={bank.accountHolder}
                                                onChange={(e) => {
                                                    const banks = [...(config.paymentInfo?.banks || [])];
                                                    banks[index] = { ...banks[index], accountHolder: e.target.value };
                                                    updateField('paymentInfo.banks', banks);
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
                                                placeholder="Juan Perez"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">CI / RUC</label>
                                            <input
                                                type="text"
                                                value={bank.identification}
                                                onChange={(e) => {
                                                    const banks = [...(config.paymentInfo?.banks || [])];
                                                    banks[index] = { ...banks[index], identification: e.target.value };
                                                    updateField('paymentInfo.banks', banks);
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm"
                                                placeholder="1712345678"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
                <div className="space-y-6">
                    {/* Toggle principal */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Horarios de Atencion</p>
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
                                    <option value="America/Santiago">Chile (America/Santiago)</option>
                                    <option value="America/Buenos_Aires">Argentina (America/Buenos_Aires)</option>
                                </select>
                            </div>

                            {/* Horarios por dia */}
                            <div className="space-y-3">
                                <h3 className="font-medium text-gray-900 dark:text-white">Horarios por Dia</h3>

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

                            {/* Mensajes de horario cerrado */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-gray-900 dark:text-white">Mensajes Fuera de Horario</h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Mensaje de Cerrado
                                    </label>
                                    <textarea
                                        value={config.schedule?.closedMessage || ''}
                                        onChange={(e) => updateField('schedule.closedMessage', e.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                                        placeholder="Mensaje que se muestra cuando esta cerrado..."
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Usa {'{schedule}'} para mostrar el horario</p>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">Permitir Mensajes</p>
                                        <p className="text-sm text-gray-500">Clientes pueden dejar mensajes fuera de horario</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.schedule?.allowMessagesWhenClosed ?? true}
                                            onChange={(e) => updateField('schedule.allowMessagesWhenClosed', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                    </label>
                                </div>

                                {config.schedule?.allowMessagesWhenClosed && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Confirmacion de Mensaje Recibido
                                        </label>
                                        <input
                                            type="text"
                                            value={config.schedule?.messageReceivedWhenClosed || ''}
                                            onChange={(e) => updateField('schedule.messageReceivedWhenClosed', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                                            placeholder="Mensaje de confirmacion..."
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {!config.schedule?.enabled && (
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                Los horarios de atencion estan deshabilitados. El chatbot respondera las 24 horas del dia, los 7 dias de la semana.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Location Tab */}
            {activeTab === 'location' && (
                <div className="space-y-6">
                    {/* Toggle principal */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Configuracion de Ubicacion</p>
                            <p className="text-sm text-gray-500">
                                {config.location?.enabled
                                    ? 'Calculo de distancia y costo de delivery activo'
                                    : 'El chatbot no verificara ubicacion'}
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.location?.enabled ?? false}
                                onChange={(e) => updateField('location.enabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                    </div>

                    {config.location?.enabled && (
                        <>
                            {/* Ubicacion del negocio */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-gray-900 dark:text-white">Ubicacion del Negocio</h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Direccion
                                    </label>
                                    <input
                                        type="text"
                                        value={config.location?.businessLocation?.address || ''}
                                        onChange={(e) => updateField('location.businessLocation.address', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                                        placeholder="Av. Principal 123, Guayaquil"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Latitud
                                        </label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={config.location?.businessLocation?.lat || -2.170998}
                                            onChange={(e) => updateField('location.businessLocation.lat', parseFloat(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Longitud
                                        </label>
                                        <input
                                            type="number"
                                            step="0.000001"
                                            value={config.location?.businessLocation?.lng || -79.922356}
                                            onChange={(e) => updateField('location.businessLocation.lng', parseFloat(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <p className="text-xs text-gray-500">
                                    Puedes obtener las coordenadas desde Google Maps: click derecho en tu ubicacion {">"} Copiar coordenadas
                                </p>
                            </div>

                            {/* Configuracion de delivery */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-gray-900 dark:text-white">Configuracion de Delivery</h3>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Radio Maximo (km)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.5"
                                            value={config.location?.maxDeliveryRadiusKm || 10}
                                            onChange={(e) => updateField('location.maxDeliveryRadiusKm', parseFloat(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Costo por km ($)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.10"
                                            value={config.location?.costPerKm || 0.50}
                                            onChange={(e) => updateField('location.costPerKm', parseFloat(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Costo Minimo ($)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.50"
                                            value={config.location?.minDeliveryCost || 2.00}
                                            onChange={(e) => updateField('location.minDeliveryCost', parseFloat(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Mensaje fuera de rango */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Mensaje Fuera de Cobertura
                                </label>
                                <textarea
                                    value={config.location?.outOfRangeMessage || ''}
                                    onChange={(e) => updateField('location.outOfRangeMessage', e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                                    placeholder="Mensaje cuando el cliente esta fuera del area..."
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Usa {'{distance}'} para la distancia y {'{maxRadius}'} para el radio maximo
                                </p>
                            </div>

                            {/* API Key de Google Maps */}
                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Google Maps API (Opcional)</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                    Para mostrar mapas interactivos, necesitas una API Key de Google Maps.
                                    Sin ella, solo se calculara la distancia usando las coordenadas.
                                </p>
                                <input
                                    type="password"
                                    value={config.location?.googleMapsApiKey || ''}
                                    onChange={(e) => updateField('location.googleMapsApiKey', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                                    placeholder="AIza..."
                                />
                            </div>
                        </>
                    )}

                    {!config.location?.enabled && (
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                La configuracion de ubicacion esta deshabilitada. El chatbot no verificara la distancia ni calculara costos de delivery basados en ubicacion.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Respuesta Automatica</p>
                            <p className="text-sm text-gray-500">El chatbot responde automaticamente</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.settings.autoReplyEnabled}
                                onChange={(e) => updateField('settings.autoReplyEnabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Pedir Nombre</p>
                            <p className="text-sm text-gray-500">Solicitar nombre del cliente</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.settings.askForName}
                                onChange={(e) => updateField('settings.askForName', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Pedir Direccion</p>
                            <p className="text-sm text-gray-500">Solicitar direccion para delivery</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.settings.askForAddress}
                                onChange={(e) => updateField('settings.askForAddress', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Mensaje de Confirmacion</p>
                            <p className="text-sm text-gray-500">Enviar mensaje cuando se confirma pedido</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.settings.sendConfirmationMessage}
                                onChange={(e) => updateField('settings.sendConfirmationMessage', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                </div>
            )}

            {/* Save Button */}
            <div className="pt-4 border-t border-gray-200 dark:border-dark-700">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {saving ? 'Guardando...' : 'Guardar Configuracion'}
                </button>
            </div>
        </div>
    );
};
