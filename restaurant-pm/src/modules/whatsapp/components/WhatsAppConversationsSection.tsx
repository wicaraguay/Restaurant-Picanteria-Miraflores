/**
 * WhatsApp Conversations Section
 * Monitor de conversaciones activas con chat en vivo (whatsapp-web.js)
 */

import React, { useState, useEffect, useRef } from 'react';
import { whatsappService, WhatsAppConversation, ChatMessage } from '../services/whatsappService';

interface SelectedConversation extends WhatsAppConversation {
    isManualMode?: boolean;
}

export const WhatsAppConversationsSection: React.FC = () => {
    const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedConv, setSelectedConv] = useState<SelectedConversation | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [takingControl, setTakingControl] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadConversations();
        const interval = setInterval(loadConversations, 5000); // Actualizar cada 5s para chat en vivo
        return () => clearInterval(interval);
    }, []);

    // Cargar mensajes cuando se selecciona una conversación
    useEffect(() => {
        if (selectedConv) {
            loadMessages(selectedConv.customerPhone);
            const msgInterval = setInterval(() => {
                loadMessages(selectedConv.customerPhone);
            }, 3000); // Actualizar mensajes cada 3s
            return () => clearInterval(msgInterval);
        }
    }, [selectedConv?.customerPhone]);

    // Scroll al final cuando hay nuevos mensajes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const loadMessages = async (phone: string) => {
        try {
            const messages = await whatsappService.getConversationMessages(phone);
            setChatMessages(messages);
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    };

    const loadConversations = async () => {
        try {
            const data = await whatsappService.getConversations();
            setConversations(data);
            // Actualizar la conversacion seleccionada si existe
            if (selectedConv) {
                const updated = data.find(c => c.customerPhone === selectedConv.customerPhone);
                if (updated) {
                    setSelectedConv(prev => ({ ...updated, isManualMode: prev?.isManualMode }));
                }
            }
        } catch (err) {
            console.error('Error loading conversations:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatPhone = (phone: string) => {
        // Limpiar cualquier sufijo de WhatsApp (@c.us, @lid, @s.whatsapp.net, etc.)
        const clean = phone.replace(/@(c\.us|lid|s\.whatsapp\.net|g\.us)$/i, '');
        if (clean.startsWith('593')) {
            return '+593 ' + clean.substring(3, 5) + ' ' + clean.substring(5, 8) + ' ' + clean.substring(8);
        }
        return clean;
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    };

    const handleSelectConversation = async (conv: WhatsAppConversation) => {
        setSelectedConv({
            ...conv,
            isManualMode: conv.currentStep === 'MANUAL'
        });
        setMessage('');
        setActionMessage(null);
        setChatMessages([]);
        setLoadingMessages(true);

        // Cargar mensajes
        try {
            const messages = await whatsappService.getConversationMessages(conv.customerPhone);
            setChatMessages(messages);
        } catch (err) {
            console.error('Error loading messages:', err);
        } finally {
            setLoadingMessages(false);
        }

        // Focus en el input de mensaje
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleTakeControl = async () => {
        if (!selectedConv) return;

        setTakingControl(true);
        try {
            await whatsappService.takeConversation(selectedConv.customerPhone);
            setSelectedConv(prev => prev ? { ...prev, isManualMode: true } : null);
            setActionMessage({ type: 'success', text: 'Has tomado control de la conversacion. El chatbot ya no respondera.' });
            loadConversations();
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message || 'Error al tomar control' });
        } finally {
            setTakingControl(false);
        }
    };

    const handleReleaseControl = async () => {
        if (!selectedConv) return;

        setTakingControl(true);
        try {
            await whatsappService.releaseConversation(selectedConv.customerPhone);
            setSelectedConv(prev => prev ? { ...prev, isManualMode: false } : null);
            setActionMessage({ type: 'success', text: 'Control devuelto al chatbot.' });
            loadConversations();
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message || 'Error al liberar control' });
        } finally {
            setTakingControl(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!selectedConv || !message.trim()) return;

        setSending(true);
        try {
            // Limpiar cualquier sufijo de WhatsApp (@c.us, @lid, @s.whatsapp.net, etc.)
            const phone = selectedConv.customerPhone.replace(/@(c\.us|lid|s\.whatsapp\.net|g\.us)$/i, '');
            await whatsappService.sendMessage(phone, message.trim());
            setMessage('');
            setActionMessage({ type: 'success', text: 'Mensaje enviado' });
            setTimeout(() => setActionMessage(null), 2000);
        } catch (err: any) {
            setActionMessage({ type: 'error', text: err.message || 'Error al enviar mensaje' });
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const quickMessages = [
        'Gracias por tu paciencia',
        'Un momento por favor',
        'Enseguida te atendemos',
        'Tu pedido esta en camino',
        'El pedido esta listo'
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
            {/* Lista de conversaciones */}
            <div className="w-1/3 min-w-[280px] space-y-3 overflow-y-auto">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                        {conversations.length} conversacion{conversations.length !== 1 ? 'es' : ''} activa{conversations.length !== 1 ? 's' : ''}
                    </p>
                </div>

                {conversations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>No hay conversaciones activas</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => handleSelectConversation(conv)}
                                className={`w-full text-left bg-white dark:bg-dark-800 rounded-xl p-3 border transition-all ${
                                    selectedConv?.customerPhone === conv.customerPhone
                                        ? 'border-green-500 ring-2 ring-green-500/20'
                                        : 'border-gray-200 dark:border-dark-700 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {conv.customerName || formatPhone(conv.customerPhone)}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">{formatPhone(conv.customerPhone)}</p>
                                    </div>
                                    <div className="flex flex-col items-end ml-2">
                                        <span className={`px-2 py-0.5 text-xs rounded whitespace-nowrap ${
                                            conv.currentStep === 'MANUAL'
                                                ? 'bg-orange-500/20 text-orange-500'
                                                : conv.status === 'active'
                                                    ? 'bg-green-500/20 text-green-500'
                                                    : 'bg-gray-500/20 text-gray-500'
                                        }`}>
                                            {conv.currentStep === 'MANUAL' ? 'Manual' : conv.status === 'active' ? 'Activa' : 'Inactiva'}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">{formatTime(conv.lastActivity)}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Panel de chat */}
            <div className="flex-1 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 flex flex-col">
                {selectedConv ? (
                    <>
                        {/* Header del chat */}
                        <div className="p-4 border-b border-gray-200 dark:border-dark-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        {selectedConv.customerName || formatPhone(selectedConv.customerPhone)}
                                    </h3>
                                    <p className="text-sm text-gray-500">{formatPhone(selectedConv.customerPhone)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedConv.isManualMode || selectedConv.currentStep === 'MANUAL' ? (
                                        <button
                                            onClick={handleReleaseControl}
                                            disabled={takingControl}
                                            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {takingControl ? 'Procesando...' : 'Devolver al Bot'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleTakeControl}
                                            disabled={takingControl}
                                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {takingControl ? 'Procesando...' : 'Tomar Control'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Estado actual */}
                            <div className="mt-2 flex items-center gap-2 text-sm">
                                <span className={`px-2 py-0.5 rounded ${
                                    selectedConv.isManualMode || selectedConv.currentStep === 'MANUAL'
                                        ? 'bg-orange-500/20 text-orange-600'
                                        : 'bg-green-500/20 text-green-600'
                                }`}>
                                    {selectedConv.isManualMode || selectedConv.currentStep === 'MANUAL' ? '👤 Modo Manual' : '🤖 Bot Activo'}
                                </span>
                                <span className="text-gray-500">Paso: {selectedConv.currentStep}</span>
                            </div>
                        </div>

                        {/* Info del pedido actual */}
                        {selectedConv.orderItems.length > 0 && (
                            <div className="p-3 bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-dark-600">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Pedido actual:</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {selectedConv.orderItems.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                </p>
                                <p className="text-sm font-semibold text-green-600">
                                    Total: ${selectedConv.orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)}
                                </p>
                            </div>
                        )}

                        {/* Mensajes de accion */}
                        {actionMessage && (
                            <div className={`mx-4 mt-2 p-2 rounded text-sm ${
                                actionMessage.type === 'success'
                                    ? 'bg-green-500/10 text-green-600 border border-green-500/30'
                                    : 'bg-red-500/10 text-red-600 border border-red-500/30'
                            }`}>
                                {actionMessage.text}
                            </div>
                        )}

                        {/* Area de chat con historial de mensajes */}
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-dark-900">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                                </div>
                            ) : chatMessages.length === 0 ? (
                                <div className="text-center text-gray-400 py-8">
                                    <p className="text-sm">No hay mensajes aun.</p>
                                    <p className="text-xs mt-1">Los mensajes apareceran aqui.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {chatMessages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[75%] px-3 py-2 rounded-lg ${
                                                    msg.direction === 'out'
                                                        ? 'bg-green-500 text-white rounded-br-none'
                                                        : 'bg-white dark:bg-dark-700 text-gray-800 dark:text-white rounded-bl-none shadow'
                                                }`}
                                            >
                                                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                                <p className={`text-xs mt-1 ${
                                                    msg.direction === 'out' ? 'text-green-100' : 'text-gray-400'
                                                }`}>
                                                    {formatTime(msg.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        {/* Mensajes rapidos */}
                        <div className="px-4 py-2 border-t border-gray-200 dark:border-dark-700">
                            <p className="text-xs text-gray-500 mb-2">Mensajes rapidos:</p>
                            <div className="flex flex-wrap gap-1">
                                {quickMessages.map((msg, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setMessage(msg)}
                                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
                                    >
                                        {msg}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input de mensaje */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-dark-700">
                            <div className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    disabled={sending}
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !message.trim()}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending ? '...' : 'Enviar'}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <p className="text-lg mb-2">💬</p>
                            <p>Selecciona una conversacion para ver detalles</p>
                            <p className="text-sm text-gray-400 mt-1">y enviar mensajes directamente</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
