/**
 * @file WhatsAppOrderAlertContext.tsx
 * @description Contexto para alertas de nuevos pedidos de WhatsApp
 *
 * Muestra notificaciones persistentes que no desaparecen hasta que
 * el administrador las cierre manualmente.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Order } from '../modules/orders/types/order.types';
import { whatsappService } from '../modules/whatsapp/services/whatsappService';

export interface WhatsAppOrderAlert {
    id: string;
    orderId: string;
    customerName: string;
    customerPhone: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    type: string;
    createdAt: Date;
    dismissed: boolean;
}

interface WhatsAppOrderAlertContextType {
    alerts: WhatsAppOrderAlert[];
    addAlert: (order: Order) => void;
    dismissAlert: (id: string) => void;
    markAsSeenAndNotify: (alert: WhatsAppOrderAlert) => Promise<void>;
    takeConversation: (alert: WhatsAppOrderAlert) => Promise<void>;
    dismissAll: () => void;
    hasActiveAlerts: boolean;
}

const WhatsAppOrderAlertContext = createContext<WhatsAppOrderAlertContextType | undefined>(undefined);

export const useWhatsAppOrderAlert = () => {
    const context = useContext(WhatsAppOrderAlertContext);
    if (!context) {
        throw new Error('useWhatsAppOrderAlert must be used within a WhatsAppOrderAlertProvider');
    }
    return context;
};

// Sonido de notificacion
const playNotificationSound = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();

        // Beep pattern: beep-beep
        setTimeout(() => gainNode.gain.value = 0, 150);
        setTimeout(() => gainNode.gain.value = 0.3, 200);
        setTimeout(() => gainNode.gain.value = 0, 350);
        setTimeout(() => oscillator.stop(), 400);
    } catch (e) {
        console.log('Could not play notification sound');
    }
};

export const WhatsAppOrderAlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [alerts, setAlerts] = useState<WhatsAppOrderAlert[]>([]);

    const addAlert = useCallback((order: Order) => {
        // Verificar si el pedido ya tiene alerta
        setAlerts(prev => {
            const exists = prev.some(a => a.orderId === order.id);
            if (exists) return prev;

            // Extraer info del cliente del campo customerName
            // Formato esperado: "Nombre [WhatsApp: 593xxxxxxxxx] (Direccion)"
            const phoneMatch = order.customerName.match(/\[WhatsApp:\s*(\d+)\]/);
            const customerPhone = phoneMatch ? phoneMatch[1] : '';
            const customerName = order.customerName.split('[')[0].trim();

            const newAlert: WhatsAppOrderAlert = {
                id: `wa-${order.id}-${Date.now()}`,
                orderId: order.id,
                customerName,
                customerPhone,
                items: order.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price || 0
                })),
                total: order.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0),
                type: order.type,
                createdAt: new Date(order.createdAt),
                dismissed: false
            };

            // Reproducir sonido
            playNotificationSound();

            return [...prev, newAlert];
        });
    }, []);

    const dismissAlert = useCallback((id: string) => {
        setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, []);

    /**
     * Marca como visto y envia notificacion al cliente por WhatsApp
     */
    const markAsSeenAndNotify = useCallback(async (alert: WhatsAppOrderAlert) => {
        try {
            // Enviar mensaje de confirmacion al cliente
            if (alert.customerPhone) {
                const message =
                    `✅ *¡PEDIDO RECIBIDO!*\n\n` +
                    `Hola ${alert.customerName}, hemos recibido tu pedido y ya lo estamos preparando.\n\n` +
                    `🍽️ Te notificaremos cuando esté listo.\n\n` +
                    `_Escribe *3* para consultar el estado de tu pedido._`;

                await whatsappService.sendMessage(alert.customerPhone, message);
            }
        } catch (error) {
            console.error('Error sending seen notification:', error);
        }

        // Siempre eliminar la alerta aunque falle el mensaje
        setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, []);

    /**
     * Toma control de la conversación (modo manual)
     * El chatbot dejará de responder y el admin puede chatear directamente desde su teléfono
     */
    const takeConversation = useCallback(async (orderAlert: WhatsAppOrderAlert) => {
        console.log('[WhatsApp] Taking conversation for:', orderAlert.customerPhone);

        if (!orderAlert.customerPhone) {
            console.error('[WhatsApp] No phone number available');
            setAlerts(prev => prev.filter(a => a.id !== orderAlert.id));
            return;
        }

        try {
            // Activar modo manual en el backend (el bot deja de responder)
            console.log('[WhatsApp] Calling takeConversation API...');
            const takeResult = await whatsappService.takeConversation(orderAlert.customerPhone);
            console.log('[WhatsApp] takeConversation result:', takeResult);

            // Enviar mensaje al cliente indicando que un humano tomará la conversación
            const message =
                `👋 *¡Hola ${orderAlert.customerName}!*\n\n` +
                `Un miembro de nuestro equipo atenderá tu pedido personalmente.\n\n` +
                `_Puedes escribirnos cualquier consulta adicional._`;

            console.log('[WhatsApp] Sending notification message...');
            const sendResult = await whatsappService.sendMessage(orderAlert.customerPhone, message);
            console.log('[WhatsApp] sendMessage result:', sendResult);

        } catch (error: any) {
            console.error('[WhatsApp] Error taking conversation:', error);
            console.error('[WhatsApp] Error details:', error?.message || 'Unknown error');
        }

        // Eliminar la alerta (el bot ya está pausado para este cliente)
        setAlerts(prev => prev.filter(a => a.id !== orderAlert.id));
    }, []);

    const dismissAll = useCallback(() => {
        setAlerts([]);
    }, []);

    const hasActiveAlerts = alerts.length > 0;

    return (
        <WhatsAppOrderAlertContext.Provider value={{ alerts, addAlert, dismissAlert, markAsSeenAndNotify, takeConversation, dismissAll, hasActiveAlerts }}>
            {children}
            {/* Renderizar alertas persistentes */}
            {alerts.length > 0 && (
                <WhatsAppOrderAlertOverlay
                    alerts={alerts}
                    onMarkAsSeen={markAsSeenAndNotify}
                    onTakeConversation={takeConversation}
                    onDismissAll={dismissAll}
                />
            )}
        </WhatsAppOrderAlertContext.Provider>
    );
};

/**
 * Componente de overlay para mostrar alertas de pedidos
 */
const WhatsAppOrderAlertOverlay: React.FC<{
    alerts: WhatsAppOrderAlert[];
    onMarkAsSeen: (alert: WhatsAppOrderAlert) => Promise<void>;
    onTakeConversation: (alert: WhatsAppOrderAlert) => Promise<void>;
    onDismissAll: () => void;
}> = ({ alerts, onMarkAsSeen, onTakeConversation, onDismissAll }) => {
    return (
        <div className="fixed inset-x-0 bottom-0 z-[9999] p-4 pointer-events-none">
            <div className="max-w-lg mx-auto space-y-3">
                {alerts.length > 1 && (
                    <button
                        onClick={onDismissAll}
                        className="pointer-events-auto w-full py-2 px-4 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Cerrar todas las alertas ({alerts.length})
                    </button>
                )}
                {alerts.map(alert => (
                    <WhatsAppOrderAlertCard
                        key={alert.id}
                        alert={alert}
                        onMarkAsSeen={() => onMarkAsSeen(alert)}
                        onTakeConversation={() => onTakeConversation(alert)}
                    />
                ))}
            </div>
        </div>
    );
};

/**
 * Tarjeta individual de alerta de pedido
 */
const WhatsAppOrderAlertCard: React.FC<{
    alert: WhatsAppOrderAlert;
    onMarkAsSeen: () => Promise<void>;
    onTakeConversation: () => Promise<void>;
}> = ({ alert, onMarkAsSeen, onTakeConversation }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isTaking, setIsTaking] = useState(false);

    const handleMarkAsSeen = async () => {
        setIsSending(true);
        await onMarkAsSeen();
        setIsSending(false);
    };

    const handleTakeConversation = async () => {
        setIsTaking(true);
        await onTakeConversation();
        setIsTaking(false);
    };

    return (
        <div
            className="pointer-events-auto bg-gradient-to-r from-green-600 to-green-500 rounded-2xl shadow-2xl shadow-green-500/30 overflow-hidden animate-in slide-in-from-bottom-full fade-in duration-500"
        >
            {/* Header con animacion de pulso */}
            <div className="relative px-4 py-3 flex items-center gap-3">
                {/* Icono de WhatsApp con pulso */}
                <div className="relative">
                    <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-25"></div>
                    <div className="relative bg-white/20 p-2 rounded-full">
                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                    </div>
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                        Nuevo Pedido WhatsApp
                    </p>
                    <p className="text-white font-bold text-lg truncate">
                        {alert.customerName}
                    </p>
                </div>

                {/* Total */}
                <div className="text-right">
                    <p className="text-white/80 text-xs">Total</p>
                    <p className="text-white font-bold text-xl">${alert.total.toFixed(2)}</p>
                </div>
            </div>

            {/* Detalles expandibles */}
            <div
                className={`bg-white/10 transition-all duration-300 ${isExpanded ? 'max-h-60 py-3 px-4' : 'max-h-0'} overflow-hidden`}
            >
                <div className="space-y-2">
                    <p className="text-white/80 text-sm">
                        <span className="font-semibold">Telefono:</span> {alert.customerPhone}
                    </p>
                    <p className="text-white/80 text-sm">
                        <span className="font-semibold">Tipo:</span> {alert.type}
                    </p>
                    <div className="border-t border-white/20 pt-2 mt-2">
                        <p className="text-white/80 text-xs uppercase font-semibold mb-1">Productos:</p>
                        {alert.items.map((item, idx) => (
                            <p key={idx} className="text-white text-sm">
                                {item.quantity}x {item.name} - ${(item.price * item.quantity).toFixed(2)}
                            </p>
                        ))}
                    </div>
                </div>
            </div>

            {/* Acciones */}
            <div className="flex border-t border-white/20">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex-1 py-3 text-white/90 text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                    {isExpanded ? 'Ocultar' : 'Detalles'}
                </button>
                <div className="w-px bg-white/20"></div>
                <button
                    onClick={handleTakeConversation}
                    disabled={isTaking || isSending}
                    className="flex-1 py-3 text-white font-semibold text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                    {isTaking ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    )}
                    {isTaking ? '...' : 'Chatear'}
                </button>
                <div className="w-px bg-white/20"></div>
                <button
                    onClick={handleMarkAsSeen}
                    disabled={isSending || isTaking}
                    className="flex-1 py-3 text-white font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                    {isSending ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                    {isSending ? '...' : 'Visto'}
                </button>
            </div>
        </div>
    );
};
