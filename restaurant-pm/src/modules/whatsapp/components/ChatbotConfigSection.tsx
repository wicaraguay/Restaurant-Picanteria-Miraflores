/**
 * Chatbot Configuration Section
 * Permite configurar los mensajes y comportamiento del chatbot
 */

import React, { useState, useEffect } from 'react';
import { whatsappService, ChatbotConfig, BankAccount } from '../services/whatsappService';

export const ChatbotConfigSection: React.FC = () => {
    const [config, setConfig] = useState<ChatbotConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'messages' | 'settings' | 'payments'>('general');

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
