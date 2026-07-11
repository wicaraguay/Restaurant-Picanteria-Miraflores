/**
 * Centro de alertas de WhatsApp — visible en todo el admin.
 *
 * Muestra un botón flotante con el número de clientes que escribieron por
 * WhatsApp y aún no han sido atendidos. Las alertas se PERSISTEN en el
 * backend: sobreviven a recargas, pestañas nuevas y dispositivos distintos,
 * hasta que alguien las marque como atendidas.
 *
 * En vivo: escucha el socket 'customer_message' (sonido + toast + refresco).
 * Respaldo: refresca la lista cada 60s por si el socket estuvo caído.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { whatsappSocket } from '../../modules/whatsapp/services/whatsappSocket';
import { whatsappAlertService, WhatsAppAlert } from '../../modules/whatsapp/services/whatsappAlertService';
import { whatsappChatService, ChatMessage } from '../../modules/whatsapp/services/whatsappChatService';
import { notificationService } from '../../services/NotificationService';
import { pushService } from '../../services/pushService';
import { toast } from '../ui/AlertProvider';
import { useAuth } from '../../modules/auth/contexts/AuthContext';

type PushState = 'unknown' | 'subscribed' | 'available' | 'denied' | 'unavailable';

interface ActiveChat {
    phone: string;
    name: string | null;
    /** JID completo — necesario para que la respuesta llegue a usuarios con identidad oculta (@lid) */
    jid: string | null;
}

function timeAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'ahora mismo';
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `hace ${days} d`;
}

const WhatsAppAlertCenter: React.FC = () => {
    const { currentUser } = useAuth();
    const [alerts, setAlerts] = useState<WhatsAppAlert[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [pushState, setPushState] = useState<PushState>('unknown');
    const [subscribing, setSubscribing] = useState(false);

    // Chat integrado
    const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const activeChatRef = useRef(activeChat);
    activeChatRef.current = activeChat;

    const isOpenRef = useRef(isOpen);
    isOpenRef.current = isOpen;

    // Solo ven las alertas los roles con permiso a la sección WhatsApp
    // (ej. el Contador no lo tiene → no recibe alertas ni sonidos).
    // Se administra desde Roles y Permisos, sin hardcodear nombres de rol.
    const canSeeAlerts = currentUser?.role?.permissions?.['whatsapp'] === true;

    const fetchAlerts = useCallback(async () => {
        try {
            const pending = await whatsappAlertService.getPending();
            setAlerts(pending);
        } catch {
            // WhatsApp deshabilitado o backend sin la ruta aún — silencioso
        }
    }, []);

    // Carga inicial + socket en vivo + polling de respaldo
    useEffect(() => {
        if (!canSeeAlerts) return;

        fetchAlerts();

        whatsappSocket.connect();
        const unsubMessage = whatsappSocket.on('customer_message', (data: { phone: string; name?: string | null; text?: string; notify?: boolean }) => {
            // La tarjeta se actualiza SIEMPRE; el sonido/toast solo cuando el
            // backend lo indica (cooldown anti-spam de 10 min por cliente)
            if (data.notify !== false) {
                notificationService.playWhatsAppMessageSound();
                const who = data.name ? `${data.name} (+${data.phone})` : `+${data.phone}`;
                const preview = data.text ? `: "${data.text.slice(0, 60)}${data.text.length > 60 ? '…' : ''}"` : '';
                toast.info(`${who}${preview}`, '💬 CLIENTE ESCRIBIENDO POR WHATSAPP');
            }
            fetchAlerts();
        });

        // Al (re)conectar el socket, ponerse al día: los eventos emitidos mientras
        // el móvil congeló la página (pantalla apagada / app en background) se perdieron,
        // pero las alertas están persistidas en el backend.
        const unsubConnected = whatsappSocket.on('connected', () => {
            fetchAlerts();
        });

        // MÓVIL: al volver la app al primer plano, Android descongela la página.
        // Refrescar de inmediato y revivir el socket (si murió, connect() lo reabre).
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                whatsappSocket.connect();
                fetchAlerts();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        const interval = setInterval(fetchAlerts, 30000);

        return () => {
            unsubMessage();
            unsubConnected();
            document.removeEventListener('visibilitychange', handleVisibility);
            clearInterval(interval);
        };
    }, [canSeeAlerts, fetchAlerts]);

    // Estado de las notificaciones push de ESTE dispositivo
    useEffect(() => {
        if (!canSeeAlerts) return;
        (async () => {
            if (!pushService.isSupported()) { setPushState('unavailable'); return; }
            if (pushService.getPermission() === 'denied') { setPushState('denied'); return; }
            const subscribed = await pushService.isSubscribed();
            setPushState(subscribed ? 'subscribed' : 'available');
        })();
    }, [canSeeAlerts]);

    const handleEnablePush = async () => {
        setSubscribing(true);
        try {
            const result = await pushService.subscribe();
            if (result === 'subscribed') {
                setPushState('subscribed');
                toast.success('Este dispositivo recibirá notificaciones aunque la app esté cerrada', '🔔 NOTIFICACIONES ACTIVAS');
            } else if (result === 'denied') {
                setPushState('denied');
                toast.warning('Permiso denegado. Actívalo desde la configuración del navegador.', 'Notificaciones');
            } else if (result === 'disabled') {
                setPushState('unavailable');
                toast.warning('El servidor no tiene las notificaciones push configuradas.', 'Notificaciones');
            }
        } catch (error) {
            console.error('Push subscribe error:', error);
            // Mostrar la causa real: sin esto, diagnosticar fallos de push en un
            // celular (donde no hay consola) es adivinar a ciegas
            const detail = (error as Error)?.name && (error as Error)?.message
                ? `${(error as Error).name}: ${(error as Error).message}`
                : String(error);
            toast.error(`No se pudieron activar las notificaciones. ${detail}`, 'Error');
        } finally {
            setSubscribing(false);
        }
    };

    // ── Chat integrado ──────────────────────────────────────────────────────
    const fetchChat = useCallback(async (phone: string) => {
        try {
            const msgs = await whatsappChatService.getMessages(phone);
            setMessages(msgs);
        } catch {
            // silencioso
        }
    }, []);

    const openChat = async (alert: WhatsAppAlert) => {
        setActiveChat({ phone: alert.phone, name: alert.name, jid: alert.jid });
        setMessages([]);
        setChatLoading(true);
        await fetchChat(alert.phone);
        setChatLoading(false);
    };

    const closeChat = () => {
        setActiveChat(null);
        setMessages([]);
        setDraft('');
    };

    // Mensajes en vivo mientras el chat está abierto (entrantes y de otros admins)
    // + refresco cada 5s como respaldo por si el socket murió (móvil en background)
    useEffect(() => {
        if (!activeChat) return;

        const refreshIfMatches = (data: { phone?: string }) => {
            if (data.phone && activeChatRef.current?.phone === data.phone) {
                fetchChat(data.phone);
            }
        };
        const unsubIn = whatsappSocket.on('customer_message', refreshIfMatches);
        const unsubOut = whatsappSocket.on('chat_message', refreshIfMatches);
        const chatPoll = setInterval(() => fetchChat(activeChat.phone), 5000);
        return () => { unsubIn(); unsubOut(); clearInterval(chatPoll); };
    }, [activeChat, fetchChat]);

    // Auto-scroll al último mensaje
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        const text = draft.trim();
        if (!text || !activeChat || sending) return;

        setSending(true);
        try {
            const sent = await whatsappChatService.sendMessage(activeChat.phone, text, activeChat.jid);
            setDraft('');
            setMessages(prev => [...prev, sent]);
            // La conversación SIGUE pendiente mientras chatean — se cierra con "Terminar"
        } catch (error) {
            console.error('Send chat error:', error);
            toast.error('No se pudo enviar el mensaje. Verifica que WhatsApp esté conectado.', 'Error');
        } finally {
            setSending(false);
        }
    };

    /** Terminar conversación: marcarla atendida y volver a la lista */
    const handleFinishChat = async () => {
        if (!activeChat) return;
        const pending = alerts.find(a => a.phone === activeChat.phone);
        if (pending) {
            setAlerts(prev => prev.filter(a => a.id !== pending.id));
            try {
                await whatsappAlertService.markAttended(pending.id);
            } catch {
                fetchAlerts();
            }
        }
        closeChat();
    };

    const handleAttend = async (id: string) => {
        // Optimista: quitar de la lista de inmediato
        setAlerts(prev => prev.filter(a => a.id !== id));
        try {
            await whatsappAlertService.markAttended(id);
        } catch {
            fetchAlerts(); // rollback contra el servidor
        }
    };

    const handleAttendAll = async () => {
        setAlerts([]);
        setIsOpen(false);
        try {
            await whatsappAlertService.markAllAttended();
        } catch {
            fetchAlerts();
        }
    };

    if (!canSeeAlerts) return null;
    // Visible si hay alertas pendientes, el panel está abierto, o falta activar
    // las notificaciones push en este dispositivo (para que el personal lo haga)
    const needsPushSetup = pushState === 'available';
    if (alerts.length === 0 && !isOpen && !needsPushSetup) return null;

    return (
        <>
            {/* Botón flotante con contador */}
            <button
                onClick={() => {
                    if (isOpen) {
                        closeChat();
                        setIsOpen(false);
                    } else {
                        setIsOpen(true);
                    }
                }}
                className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40 w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl shadow-green-500/40 flex items-center justify-center transition-all active:scale-90"
                title="Clientes escribiendo por WhatsApp"
            >
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {alerts.length > 0 ? (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[24px] h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center border-2 border-white dark:border-dark-900 animate-pulse">
                        {alerts.length > 99 ? '99+' : alerts.length}
                    </span>
                ) : needsPushSetup ? (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-[10px] flex items-center justify-center border-2 border-white dark:border-dark-900" title="Activa las notificaciones">
                        🔔
                    </span>
                ) : null}
            </button>

            {/* Panel: lista de pendientes o chat de una conversación */}
            {isOpen && activeChat && (
                <div className="fixed bottom-36 lg:bottom-24 right-4 lg:right-6 z-40 w-[calc(100vw-2rem)] max-w-sm bg-white dark:bg-dark-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-700 overflow-hidden animate-slide-up flex flex-col">
                    {/* Header del chat */}
                    <div className="px-4 py-3 bg-green-500 flex items-center gap-3">
                        <button
                            onClick={closeChat}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-90"
                            title="Volver a la lista"
                        >
                            ←
                        </button>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-black text-white truncate">{activeChat.name || `+${activeChat.phone}`}</h3>
                            <p className="text-[10px] font-bold text-green-100">
                                {activeChat.jid?.endsWith('@lid') ? 'ID privado de WhatsApp' : `+${activeChat.phone}`}
                            </p>
                        </div>
                        <button
                            onClick={handleFinishChat}
                            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                            title="Marcar como atendida y cerrar"
                        >
                            ✓ Terminar
                        </button>
                    </div>

                    {/* Mensajes */}
                    <div className="h-[45vh] overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-dark-900/50 custom-scroll">
                        {chatLoading ? (
                            <p className="text-xs text-gray-400 text-center py-8 animate-pulse">Cargando conversación…</p>
                        ) : messages.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-8">Sin historial — escribe el primer mensaje 👇</p>
                        ) : (
                            messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-snug ${msg.direction === 'out'
                                            ? 'bg-green-500 text-white rounded-br-md'
                                            : 'bg-white dark:bg-dark-700 text-gray-800 dark:text-gray-100 rounded-bl-md border border-gray-100 dark:border-dark-600'
                                        }`}>
                                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                        <p className={`text-[9px] mt-1 ${msg.direction === 'out' ? 'text-green-100' : 'text-gray-400'}`}>
                                            {msg.direction === 'out' && msg.senderName ? `${msg.senderName} · ` : ''}
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Caja de envío */}
                    <div className="p-3 border-t border-gray-100 dark:border-dark-700 flex gap-2 bg-white dark:bg-dark-800">
                        <input
                            type="text"
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Escribe una respuesta…"
                            className="flex-1 rounded-2xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-900 px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:border-green-500 focus:outline-none transition-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!draft.trim() || sending}
                            className="px-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white text-xs font-black uppercase transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {sending ? '…' : 'Enviar'}
                        </button>
                    </div>
                </div>
            )}

            {/* Panel de alertas pendientes */}
            {isOpen && !activeChat && (
                <div className="fixed bottom-36 lg:bottom-24 right-4 lg:right-6 z-40 w-[calc(100vw-2rem)] max-w-sm bg-white dark:bg-dark-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-700 overflow-hidden animate-slide-up">
                    {/* Header */}
                    <div className="px-5 py-4 bg-green-500 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wider">Clientes por atender</h3>
                            <p className="text-[10px] font-bold text-green-100">{alerts.length} pendiente{alerts.length !== 1 ? 's' : ''} en WhatsApp</p>
                        </div>
                        {alerts.length > 0 && (
                            <button
                                onClick={handleAttendAll}
                                className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                            >
                                Atender todas
                            </button>
                        )}
                    </div>

                    {/* Activación de notificaciones push en este dispositivo */}
                    {needsPushSetup && (
                        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/30 flex items-center justify-between gap-3">
                            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 leading-snug">
                                🔔 Recibe avisos en este teléfono aunque la app esté cerrada
                            </p>
                            <button
                                onClick={handleEnablePush}
                                disabled={subscribing}
                                className="flex-shrink-0 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                            >
                                {subscribing ? 'Activando…' : 'Activar'}
                            </button>
                        </div>
                    )}
                    {pushState === 'denied' && (
                        <div className="px-4 py-2.5 bg-gray-50 dark:bg-dark-900/50 border-b border-gray-100 dark:border-dark-700">
                            <p className="text-[10px] font-bold text-gray-400 leading-snug">
                                🔕 Notificaciones bloqueadas — actívalas en la configuración del navegador para este sitio
                            </p>
                        </div>
                    )}

                    {/* Lista */}
                    <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-50 dark:divide-dark-700 custom-scroll">
                        {alerts.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">No hay clientes pendientes 🎉</p>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className="p-4 space-y-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="min-w-0 flex items-center gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-gray-900 dark:text-white truncate">
                                                    {alert.name || (alert.jid?.endsWith('@lid') ? 'Cliente de WhatsApp' : `+${alert.phone}`)}
                                                </p>
                                                {alert.name && (
                                                    <p className="text-[10px] font-bold text-gray-400">
                                                        {alert.jid?.endsWith('@lid') ? 'ID privado de WhatsApp' : `+${alert.phone}`}
                                                    </p>
                                                )}
                                            </div>
                                            {alert.messageCount > 1 && (
                                                <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-green-500 text-white text-[10px] font-black flex items-center justify-center" title={`${alert.messageCount} mensajes en esta conversación`}>
                                                    {alert.messageCount}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">{timeAgo(alert.lastMessageAt || alert.createdAt)}</span>
                                    </div>
                                    {alert.text && (
                                        <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-dark-900/50 rounded-xl px-3 py-2 line-clamp-2">
                                            "{alert.text}"
                                        </p>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openChat(alert)}
                                            className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                                        >
                                            💬 Responder
                                        </button>
                                        <button
                                            onClick={() => handleAttend(alert.id)}
                                            className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-dark-600 transition-all"
                                        >
                                            ✓ Atendida
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default WhatsAppAlertCenter;
