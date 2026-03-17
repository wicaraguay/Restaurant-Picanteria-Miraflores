import React, { useState, useEffect } from 'react';
import { api } from '../../../api';
import { orderService } from '../../orders/services/OrderService';
import { SetState } from '../../../types';
import { Order, OrderItem, OrderStatus } from '../../orders/types/order.types';
import { ChefHatIcon, ClipboardListIcon, CheckCircleIcon, AlertCircleIcon, PlusIcon } from '../../../components/ui/Icons';

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
    const minutesSinceEstimate = useTimer(order.estimateSetAt || order.createdAt);
    
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

    const allReady = order.items.every(i => i.prepared);

    return (
        <div className={`glass-panel flex flex-col h-full border-t-4 transition-all duration-500 ${getUrgencyClasses()} animate-slide-up`}>
            {/* Header comanda */}
            <div className="p-4 border-b dark:border-dark-700 flex justify-between items-start">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            Pedido #{order.orderNumber || order.id.slice(-6)}
                        </span>
                    </div>
                    <h3 className="font-black text-xl text-gray-900 dark:text-white uppercase tracking-tighter leading-tight">
                        {order.customerName}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            order.type === 'En Local' ? 'bg-blue-100 text-blue-600' : 
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
                <div className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center transition-all ${
                    (order.estimatedMinutes && remainingTime !== null && remainingTime < 0) ? 'border-red-600 text-red-600 bg-white dark:bg-dark-900 shadow-lg shadow-red-600/30 scale-105 animate-pulse' : 
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
                            <span className="text-2xl font-black leading-none text-gray-300 dark:text-gray-700">0</span>
                            <span className="text-[10px] font-black uppercase tracking-tighter text-gray-300 dark:text-gray-700">min</span>
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
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all border-2 ${
                                order.estimatedMinutes === m 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg active:scale-95' 
                                : 'bg-white dark:bg-dark-900 border-gray-100 dark:border-dark-700 text-gray-500 hover:border-blue-500 hover:text-blue-500'
                            }`}
                        >
                            {m} min
                        </button>
                    ))}
                </div>
            </div>

            {/* Listado de platos */}
            <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[300px] custom-scroll">
                {order.items.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => onUpdateItem(order.id, idx)}
                        className={`w-full text-left p-3 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                            item.prepared 
                                ? 'bg-gray-50 dark:bg-dark-800 border-transparent opacity-60' 
                                : 'bg-white dark:bg-dark-900 border-gray-100 dark:border-dark-700 hover:border-blue-500'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${
                                item.prepared ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-600'
                            }`}>
                                {item.quantity}
                            </span>
                            <span className={`font-bold text-sm ${item.prepared ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                                {item.name}
                            </span>
                        </div>
                        {item.prepared ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-200 group-hover:border-blue-500 transition-colors" />
                        )}
                    </button>
                ))}
            </div>

            {/* Acciones principales */}
            <div className="p-4 mt-auto">
                <button
                    onClick={() => onMarkAllReady(order)}
                    disabled={!allReady}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                        allReady 
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20' 
                            : 'bg-gray-100 dark:bg-dark-800 text-gray-400 dark:text-gray-600 border-2 border-dashed border-gray-200 dark:border-dark-700 shadow-none'
                    }`}
                >
                    {allReady ? (
                        <>
                            <CheckCircleIcon className="w-5 h-5" />
                            PEDIDO LISTO
                        </>
                    ) : (
                        'FALTAN PLATOS'
                    )}
                </button>
            </div>
        </div>
    );
};

const KitchenManagement: React.FC<KitchenManagementProps> = ({ orders, setOrders }) => {
    const safeOrders = Array.isArray(orders) ? orders : [];

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
        } catch (error) {
            console.error('Failed to update estimate:', error);
            setOrders(originalOrders);
            alert('Error al guardar la selección. Reintentando...');
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
            setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Error al enviar pedido a mesa.');
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
