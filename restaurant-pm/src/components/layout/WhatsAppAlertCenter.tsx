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
import { notificationService } from '../../services/NotificationService';
import { toast } from '../ui/AlertProvider';
import { useAuth } from '../../modules/auth/contexts/AuthContext';

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
        const unsubscribe = whatsappSocket.on('customer_message', (data: { phone: string; name?: string | null; text?: string }) => {
            notificationService.playWhatsAppMessageSound();
            const who = data.name ? `${data.name} (+${data.phone})` : `+${data.phone}`;
            const preview = data.text ? `: "${data.text.slice(0, 60)}${data.text.length > 60 ? '…' : ''}"` : '';
            toast.info(`${who}${preview}`, '💬 CLIENTE ESCRIBIENDO POR WHATSAPP');
            fetchAlerts();
        });

        const interval = setInterval(fetchAlerts, 60000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [canSeeAlerts, fetchAlerts]);

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
    if (alerts.length === 0 && !isOpen) return null;

    return (
        <>
            {/* Botón flotante con contador */}
            <button
                onClick={() => setIsOpen(o => !o)}
                className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40 w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl shadow-green-500/40 flex items-center justify-center transition-all active:scale-90"
                title="Clientes escribiendo por WhatsApp"
            >
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {alerts.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[24px] h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center border-2 border-white dark:border-dark-900 animate-pulse">
                        {alerts.length > 99 ? '99+' : alerts.length}
                    </span>
                )}
            </button>

            {/* Panel de alertas pendientes */}
            {isOpen && (
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

                    {/* Lista */}
                    <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-50 dark:divide-dark-700 custom-scroll">
                        {alerts.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-8">No hay clientes pendientes 🎉</p>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className="p-4 space-y-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-gray-900 dark:text-white truncate">
                                                {alert.name || `+${alert.phone}`}
                                            </p>
                                            {alert.name && (
                                                <p className="text-[10px] font-bold text-gray-400">+{alert.phone}</p>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 flex-shrink-0">{timeAgo(alert.createdAt)}</span>
                                    </div>
                                    {alert.text && (
                                        <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-dark-900/50 rounded-xl px-3 py-2 line-clamp-2">
                                            "{alert.text}"
                                        </p>
                                    )}
                                    <div className="flex gap-2">
                                        <a
                                            href={`https://wa.me/${alert.phone}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-black uppercase tracking-wider text-center hover:bg-green-100 dark:hover:bg-green-900/30 transition-all"
                                        >
                                            Responder
                                        </a>
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
