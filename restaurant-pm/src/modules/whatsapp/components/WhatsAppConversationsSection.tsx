/**
 * WhatsApp Conversations Section
 * Monitor de conversaciones activas (whatsapp-web.js)
 */

import React, { useState, useEffect } from 'react';
import { whatsappService, WhatsAppConversation } from '../services/whatsappService';

export const WhatsAppConversationsSection: React.FC = () => {
    const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConversations();
        const interval = setInterval(loadConversations, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadConversations = async () => {
        try {
            const data = await whatsappService.getConversations();
            setConversations(data);
        } catch (err) {
            console.error('Error loading conversations:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatPhone = (phone: string) => {
        if (phone.startsWith('593')) {
            return '+593 ' + phone.substring(3, 5) + ' ' + phone.substring(5, 8) + ' ' + phone.substring(8);
        }
        return phone;
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
                    Conversaciones Activas
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    El chatbot responde automaticamente. Los pedidos van a Gestion de Pedidos.
                </p>
            </div>

            {conversations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p>No hay conversaciones activas</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {conversations.map(conv => (
                        <div key={conv.id} className="bg-white dark:bg-dark-800 rounded-xl p-4 border border-gray-200 dark:border-dark-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {conv.customerName || formatPhone(conv.customerPhone)}
                                    </p>
                                    <p className="text-sm text-gray-500">{formatPhone(conv.customerPhone)}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-2 py-1 text-xs rounded ${conv.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}>
                                        {conv.status === 'active' ? 'Activa' : 'Inactiva'}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">{formatTime(conv.lastActivity)}</p>
                                </div>
                            </div>
                            {conv.orderItems.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-700">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Pedido: {conv.orderItems.map(i => i.quantity + 'x ' + i.name).join(', ')}
                                    </p>
                                    <p className="text-sm font-medium text-green-500">
                                        Total: ${conv.orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
