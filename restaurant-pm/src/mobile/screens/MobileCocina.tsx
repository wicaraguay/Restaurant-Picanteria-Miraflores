/**
 * MobileCocina — Monitor de cocina (subset móvil).
 *
 * Layout basado en Stitch "Monitor de Cocina (V2)" (tarjeta con timer, lista de
 * ítems con nota/preparado, botón "Marcar Listo") pero con tokens azules del sistema
 * y el MODELO REAL: #pedido + nombre de cliente (Stitch usaba mesa/camarera que aquí
 * no existen). Cambia el estado real vía orderService.update.
 */

import React, { useEffect, useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { orderService } from '../../modules/orders/services/OrderService';
import { Order, OrderStatus } from '../../modules/orders/types/order.types';
import { toast } from '../../components/ui/AlertProvider';
import { CheckCircleIcon, ClockIcon } from '../../components/ui/Icons';

const elapsedLabel = (createdAt: string) => {
    const sec = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
    return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
};
const elapsedMin = (createdAt: string) => (Date.now() - new Date(createdAt).getTime()) / 60000;

const MobileCocina: React.FC = () => {
    const { state, setOrders } = useAppState();
    const [busyId, setBusyId] = useState<string | null>(null);
    // Tick de 1s para refrescar los timers en vivo.
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    // La cocina trabaja los pedidos NUEVOS (aún no marcados Listo/Completado).
    const kitchenOrders = state.orders
        .filter((o) => o.status === OrderStatus.New)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const markReady = async (order: Order) => {
        if (busyId) return;
        setBusyId(order.id);
        try {
            const updated = await orderService.update(order.id, {
                status: OrderStatus.Ready,
                readyAt: new Date().toISOString(),
            });
            setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
            toast.success('Pedido marcado como listo', 'Cocina');
        } catch (e) {
            console.error('[MobileCocina] Error marcando listo:', e);
            toast.error('No se pudo actualizar el pedido.', 'Error');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-black text-light-text dark:text-light-background">
                    Monitor de Cocina
                </h1>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                    {kitchenOrders.length} en curso
                </span>
            </div>

            {kitchenOrders.length === 0 && (
                <p className="text-center text-sm text-light-subtext dark:text-gray-400 py-12">
                    No hay pedidos en cocina.
                </p>
            )}

            {kitchenOrders.map((order) => {
                const urgent = elapsedMin(order.createdAt) >= 15;
                return (
                    <div
                        key={order.id}
                        className={`bg-light-surface dark:bg-dark-800 rounded-2xl p-4 shadow-sm border ${
                            urgent ? 'border-red-300 dark:border-red-800' : 'border-light-border dark:border-dark-700'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-black text-light-text dark:text-light-background truncate">
                                    #{order.orderNumber || order.id.slice(-4)} · {order.customerName || 'Sin nombre'}
                                </p>
                                <p className="text-xs text-light-subtext dark:text-gray-400 mt-0.5">{order.type}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <div
                                    className={`flex items-center gap-1 font-black text-lg ${
                                        urgent ? 'text-red-600' : 'text-blue-600'
                                    }`}
                                >
                                    <ClockIcon className="w-4 h-4" />
                                    {elapsedLabel(order.createdAt)}
                                </div>
                                {urgent && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                        Urgente
                                    </span>
                                )}
                            </div>
                        </div>

                        <ul className="mt-3 space-y-1.5">
                            {order.items.map((it, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                    <span className="font-bold text-light-text dark:text-light-background shrink-0">
                                        {it.quantity}x
                                    </span>
                                    <span className="flex-1 text-light-text dark:text-light-background">
                                        {it.name}
                                        {it.notes && (
                                            <span className="ml-1 text-xs font-semibold text-amber-600">
                                                · {it.notes}
                                            </span>
                                        )}
                                    </span>
                                    {it.prepared && <CheckCircleIcon className="w-4 h-4 text-green-600 shrink-0" />}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => markReady(order)}
                            disabled={busyId === order.id}
                            className="mt-4 w-full bg-blue-600 text-white font-black py-3 rounded-xl active:scale-[0.98] transition disabled:opacity-70"
                        >
                            {busyId === order.id ? 'Marcando…' : '✓ Marcar Listo'}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default MobileCocina;
