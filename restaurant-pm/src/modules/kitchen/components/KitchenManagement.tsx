import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../../api';
import { orderService } from '../../orders/services/OrderService';
import { SetState } from '../../../types';
import { Order, OrderItem, OrderStatus } from '../../orders/types/order.types';
import { ChefHatIcon, ClipboardListIcon, CheckCircleIcon, AlertCircleIcon, PlusIcon } from '../../../components/ui/Icons';
import { toast } from '../../../components/ui/AlertProvider';
import { notificationService } from '../../../services/NotificationService';

/**
 * Parsea el nombre del cliente para extraer nombre limpio y origen (WhatsApp/Web)
 */
function parseCustomerInfo(customerName: string): { name: string; source: 'whatsapp' | 'web' | null; phone?: string } {
    if (!customerName) return { name: '', source: null };

    const whatsappMatch = customerName.match(/^(.+?)\s*\[WhatsApp:\s*(\d+).*?\]$/i);
    if (whatsappMatch) {
        return { name: whatsappMatch[1].trim(), source: 'whatsapp', phone: whatsappMatch[2] };
    }

    const webMatch = customerName.match(/^(.+?)\s*\[Web\]$/i);
    if (webMatch) {
        return { name: webMatch[1].trim(), source: 'web' };
    }

    return { name: customerName, source: null };
}

/**
 * Formatea el número de orden para mejor visualización
 */
function formatOrderNumber(orderNumber?: string, fallbackId?: string): string {
    const value = orderNumber || fallbackId || '';
    if (/^\d+$/.test(value)) return value.padStart(3, '0');
    if (value.length > 6) return value.slice(-4).toUpperCase();
    return value.toUpperCase();
}

interface KitchenManagementProps {
    orders: Order[];
    setOrders: SetState<Order[]>;
}

// --- Helper: Timer Hook ---
const useTimer = (startTime: string) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const start = new Date(startTime).getTime();
        const update = () => {
            const now = Date.now();
            setElapsed(Math.floor((now - start) / 1000 / 60)); // Minutes
        };
        update();
        const interval = setInterval(update, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [startTime]);

    return elapsed;
};

// --- Single Order Card for Kitchen ---
const KitchenOrderCard: React.FC<{
    order: Order;
    onUpdateItem: (orderId: string, itemIdx: number) => void;
    onSetEstimate: (orderId: string, minutes: number) => void;
    onMarkAllReady: (order: Order) => void;
}> = ({ order, onUpdateItem, onSetEstimate, onMarkAllReady }) => {
    const minutesElapsed = useTimer(order.createdAt);
    const customerInfo = useMemo(() => parseCustomerInfo(order.customerName), [order.customerName]);
    const displayOrderNumber = useMemo(() => formatOrderNumber(order.orderNumber, order.id.slice(-6)), [order.orderNumber, order.id]);
    const minutesSinceEstimate = useTimer(order.estimateSetAt || order.createdAt);
    const [customEstimate, setCustomEstimate] = useState('');
    const [confirmDispatch, setConfirmDispatch] = useState(false);

    // Auto-cancelar la confirmación de despacho después de 3 segundos
    useEffect(() => {
        if (!confirmDispatch) return;
        const timeout = setTimeout(() => setConfirmDispatch(false), 3000);
        return () => clearTimeout(timeout);
    }, [confirmDispatch]);

    // Calculate remaining time relative to when the estimate was set
    const remainingTime = (order.estimatedMinutes && order.estimateSetAt)
        ? order.estimatedMinutes - minutesSinceEstimate
        : null;

    // Determine if late: 
    // - If estimate exists: remainingTime < 0
    // - If no estimate: Stay neutral (the user wants to start at 0)
    const isLate = remainingTime !== null ? remainingTime < 0 : false;

    // Determine card urgency color
    const getUrgencyClasses = () => {
        if (isLate) return "border-red-600 shadow-red-600/30 bg-red-50/10 dark:bg-red-900/10";

        // Orange warning when 80% of estimated time has passed
        if (order.estimatedMinutes) {
            const alertThreshold = order.estimatedMinutes * 0.8;
            if (minutesSinceEstimate >= alertThreshold) return "border-orange-500 shadow-orange-500/20";
        }

        return "border-blue-500/40 shadow-blue-500/10";
    };

    const preparedCount = order.items.filter(i => i.prepared).length;
    const totalItems = order.items.length;
    const progressPct = totalItems > 0 ? Math.round((preparedCount / totalItems) * 100) : 0;
    const allReady = preparedCount === totalItems;

    const handleCustomEstimate = () => {
        const minutes = parseInt(customEstimate, 10);
        if (!isNaN(minutes) && minutes > 0 && minutes <= 240) {
            onSetEstimate(order.id, minutes);
            setCustomEstimate('');
        }
    };

    return (
        <div className={`glass-panel flex flex-col h-full border-t-4 transition-all duration-500 ${getUrgencyClasses()} animate-slide-up`}>
            {/* Header comanda */}
            <div className="p-4 border-b dark:border-dark-700 flex justify-between items-start">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            Pedido #{displayOrderNumber}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {customerInfo.source === 'whatsapp' && (
                            <span className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center" title={`WhatsApp: ${customerInfo.phone || ''}`}>
                                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                            </span>
                        )}
                        {customerInfo.source === 'web' && (
                            <span className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center" title="Pedido Web">
                                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                </svg>
                            </span>
                        )}
                        <h3 className="font-black text-xl text-gray-900 dark:text-white uppercase tracking-tighter leading-tight">
                            {customerInfo.name}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.type === 'En Local' ? 'bg-blue-100 text-blue-600' :
                                order.type === 'Delivery' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'
                            }`}>
                            {order.type.toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>

                {/* Timer Circle */}
                <div className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center transition-all ${(order.estimatedMinutes && remainingTime !== null && remainingTime < 0) ? 'border-red-600 text-red-600 bg-white dark:bg-dark-900 shadow-lg shadow-red-600/30 scale-105 animate-pulse' :
                        (order.estimatedMinutes && remainingTime !== null && remainingTime <= 2) ? 'border-orange-500 text-orange-500 bg-orange-50 dark:bg-dark-800' :
                            'border-blue-600 text-blue-600 bg-blue-50 dark:bg-dark-800'
                    }`}>
                    {order.estimatedMinutes && order.estimateSetAt && remainingTime !== null ? (
                        remainingTime >= 0 ? (
                            <>
                                <span className="text-2xl font-black leading-none">{remainingTime}</span>
                                <span className="text-[8px] font-black uppercase tracking-tighter">RESTA</span>
                            </>
                        ) : (
                            <>
                                <span className="text-2xl font-black leading-none">{Math.abs(remainingTime)}</span>
                                <span className="text-[8px] font-black uppercase tracking-tighter">DEMORA</span>
                            </>
                        )
                    ) : (
                        <>
                            <span className={`text-2xl font-black leading-none ${minutesElapsed >= 15 ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>{minutesElapsed}</span>
                            <span className={`text-[8px] font-black uppercase tracking-tighter ${minutesElapsed >= 15 ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>ESPERA</span>
                        </>
                    )}
                </div>
            </div>

            {/* Selector de tiempo estimado si no tiene uno */}
            <div className="px-4 py-3 border-b dark:border-dark-700 bg-gray-50/50 dark:bg-dark-800/50 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Estimar despacho (min):</span>
                    {order.estimatedMinutes && (
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            META: {order.estimatedMinutes}'
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    {[5, 10, 15, 20, 30].map(m => (
                        <button
                            key={m}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSetEstimate(order.id, m);
                            }}
                            className={`flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-black transition-all border-2 whitespace-nowrap ${order.estimatedMinutes === m
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg active:scale-95'
                                    : 'bg-white dark:bg-dark-900 border-gray-100 dark:border-dark-700 text-gray-500 hover:border-blue-500 hover:text-blue-500'
                                }`}
                        >
                            {m}<span className="hidden sm:inline"> min</span><span className="sm:hidden">'</span>
                        </button>
                    ))}
                </div>
                {/* Estimado personalizado */}
                <div className="flex gap-2 items-center">
                    <input
                        type="number"
                        min={1}
                        max={240}
                        value={customEstimate}
                        onChange={e => setCustomEstimate(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCustomEstimate(); }}
                        placeholder="Otro tiempo..."
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-bold border-2 bg-white dark:bg-dark-900 border-gray-100 dark:border-dark-700 text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none transition-all placeholder:font-bold placeholder:text-gray-300"
                    />
                    <button
                        onClick={handleCustomEstimate}
                        disabled={!customEstimate || parseInt(customEstimate, 10) <= 0}
                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight bg-blue-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-700 transition-all active:scale-95"
                    >
                        Fijar
                    </button>
                </div>
            </div>

            {/* Barra de progreso de preparación */}
            <div className="px-4 pt-3">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avance</span>
                    <span className={`text-[10px] font-black tracking-widest ${allReady ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'}`}>
                        {preparedCount}/{totalItems} PLATOS
                    </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-dark-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${allReady ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>

            {/* Listado de platos (pendientes y preparados, toque para marcar/desmarcar) */}
            <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[300px] custom-scroll">
                {order.items.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => onUpdateItem(order.id, idx)}
                        className={`w-full text-left p-3 rounded-2xl border-2 transition-all flex items-center justify-between group ${item.prepared
                                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40 hover:border-green-400'
                                : 'bg-white dark:bg-dark-900 border-gray-100 dark:border-dark-700 hover:border-blue-500'
                            }`}
                        title={item.prepared ? 'Toca para desmarcar' : 'Toca cuando esté listo'}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0 ${item.prepared ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                {item.quantity}
                            </span>
                            <div className="min-w-0">
                                <span className={`font-bold text-sm ${item.prepared
                                        ? 'text-gray-400 dark:text-gray-500 line-through'
                                        : 'text-gray-800 dark:text-gray-100'
                                    }`}>
                                    {item.name}
                                </span>
                                {/* Nota del cajero para la cocina */}
                                {item.notes && (
                                    <p className={`text-[11px] font-bold mt-0.5 ${item.prepared ? 'text-gray-400 dark:text-gray-500' : 'text-orange-600 dark:text-orange-400'}`}>
                                        📝 {item.notes}
                                    </p>
                                )}
                            </div>
                        </div>
                        {item.prepared ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-200 group-hover:border-blue-500 transition-colors flex-shrink-0" />
                        )}
                    </button>
                ))}
            </div>

            {/* Acciones principales */}
            <div className="p-4 mt-auto">
                <button
                    onClick={() => {
                        if (allReady) {
                            onMarkAllReady(order);
                        } else if (confirmDispatch) {
                            setConfirmDispatch(false);
                            onMarkAllReady(order);
                        } else {
                            setConfirmDispatch(true);
                        }
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${allReady
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20'
                            : confirmDispatch
                                ? 'bg-orange-500 text-white border-2 border-orange-500 animate-pulse'
                                : 'bg-white dark:bg-dark-900 text-orange-600 border-2 border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 shadow-none'
                        }`}
                >
                    <CheckCircleIcon className="w-5 h-5" />
                    {allReady
                        ? 'PEDIDO LISTO'
                        : confirmDispatch
                            ? 'TOCA DE NUEVO PARA CONFIRMAR'
                            : `DESPACHAR TODO (${totalItems - preparedCount} PENDIENTES)`}
                </button>
            </div>
        </div>
    );
};

const KitchenManagement: React.FC<KitchenManagementProps> = ({ orders, setOrders }) => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const prevNewOrdersCount = React.useRef(kitchenOrdersCount(safeOrders));

    function kitchenOrdersCount(ords: Order[]) {
        return ords.filter(o => o.status === OrderStatus.New).length;
    }

    // Effect to detect NEW orders
    useEffect(() => {
        const currentCount = kitchenOrdersCount(safeOrders);
        
        // If count increased, notify!
        if (currentCount > prevNewOrdersCount.current) {
            notificationService.playNewOrderSound();
            toast.info('¡NUEVO PEDIDO RECIBIDO!', 'COCINA');
        }
        
        prevNewOrdersCount.current = currentCount;
    }, [safeOrders]);


    const kitchenOrders = safeOrders
        .filter(o => o.status === OrderStatus.New)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const handleUpdateItem = async (orderId: string, itemIdx: number) => {
        const order = safeOrders.find(o => o.id === orderId);
        if (!order) return;

        const updatedItems = [...order.items];
        updatedItems[itemIdx] = {
            ...updatedItems[itemIdx],
            prepared: !updatedItems[itemIdx].prepared
        };

        // Optimistic update
        const originalOrders = [...safeOrders];
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: updatedItems } : o));

        try {
            await orderService.update(orderId, { items: updatedItems });
        } catch (error) {
            console.error('Failed to update item:', error);
            // Rollback
            setOrders(originalOrders);
        }
    };

    const handleSetEstimate = async (orderId: string, minutes: number) => {
        const order = safeOrders.find(o => o.id === orderId);
        const isCurrentlySelected = order?.estimatedMinutes === minutes;

        const now = new Date().toISOString();
        const newMinutes = isCurrentlySelected ? null : minutes;
        const newSetAt = isCurrentlySelected ? null : now;

        // Optimistic update
        const originalOrders = [...safeOrders];
        setOrders(prev => prev.map(o => o.id === orderId ? {
            ...o,
            estimatedMinutes: newMinutes,
            estimateSetAt: newSetAt
        } : o));

        try {
            await orderService.update(orderId, {
                estimatedMinutes: newMinutes,
                estimateSetAt: newSetAt
            });
            if (newMinutes) {
                toast.success(`Tiempo estimado: ${newMinutes} min`, 'NOTIFICADO');
            }
        } catch (error) {
            console.error('Failed to update estimate:', error);
            setOrders(originalOrders);
            toast.error('Error al guardar la selección. Reintentando...', 'ERROR');
        }
    };

    const handleMarkAllReady = async (order: Order) => {
        try {
            const updated = await orderService.update(order.id, {
                status: OrderStatus.Ready,
                readyAt: new Date().toISOString(),
                // Ensure all items are marked as prepared
                items: order.items.map(i => ({ ...i, prepared: true }))
            });
            // Update state locally so it disappears immediately from the filtered list
            setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
            const customerName = parseCustomerInfo(order.customerName).name;
            toast.success(`Pedido de ${customerName} despachado`, '¡LISTO!');
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error('Error al enviar pedido a mesa.', 'ERROR');
        }
    };

    return (
        <div className="flex flex-col h-full space-y-8 pb-12">
            {/* Header Premium (Similar a Operaciones) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Central de Cocina</h1>
                    <p className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
                        SISTEMA DE COMANDAS EN TIEMPO REAL
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-100 dark:bg-dark-800 p-1 rounded-xl border border-gray-200 dark:border-dark-700">
                        <div className="px-6 py-2 rounded-lg text-xs font-black bg-white dark:bg-dark-700 text-orange-600 dark:text-orange-400 shadow-md">
                            KDS MODO ACTIVO
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Sections */}
            <div className="flex-1">
                {kitchenOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 opacity-30 text-center">
                        <ChefHatIcon className="w-20 h-20 mb-4" />
                        <h2 className="text-xl font-black uppercase tracking-tighter">No hay comandas activas</h2>
                        <p className="text-sm font-bold">Relájate, la cocina está al día.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {kitchenOrders.map(order => (
                            <KitchenOrderCard
                                key={order.id}
                                order={order}
                                onUpdateItem={handleUpdateItem}
                                onSetEstimate={handleSetEstimate}
                                onMarkAllReady={handleMarkAllReady}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KitchenManagement;
