/**
 * MobilePedidos — Pedidos en curso (subset móvil), ahora EDITABLES.
 *
 * Toca un pedido para abrir el editor completo (OrderFormModal de la web,
 * que ya es responsive): cambiar cliente, tipo, estado, agregar/quitar ítems,
 * cantidades e ítems manuales — exactamente como en la web. Una sola fuente de
 * verdad, no se duplica lógica.
 *
 * La creación de pedidos sigue en "Nuevo" (POS); aquí se MODIFICAN los existentes.
 */

import React, { useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { orderService } from '../../modules/orders/services/OrderService';
import { Order, OrderStatus } from '../../modules/orders/types/order.types';
import { OrderFormModal } from '../../modules/orders/components/OrderFormModal';
import { toast } from '../../components/ui/AlertProvider';

const STATUS_BADGE: Record<string, string> = {
    [OrderStatus.New]: 'bg-blue-100 text-blue-800',
    [OrderStatus.Ready]: 'bg-green-100 text-green-700',
    [OrderStatus.Completed]: 'bg-gray-100 text-gray-600',
};

const orderTotal = (o: Order) =>
    o.items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);

const MobilePedidos: React.FC = () => {
    const { state, setOrders } = useAppState();
    const [editing, setEditing] = useState<Order | null>(null);
    const [open, setOpen] = useState(false);

    const active = state.orders.filter((o) => o.status !== OrderStatus.Completed);

    const openEdit = (o: Order) => {
        setEditing(o);
        setOpen(true);
    };

    // El modal cierra solo tras onSave. Actualización optimista + persistencia en
    // segundo plano; si el backend falla, se revierte y se avisa.
    const handleSave = (order: Order) => {
        const snapshot = state.orders;
        setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, ...order } : o)));
        orderService
            .update(order.id, order)
            .then((updated) => {
                setOrders((list) => list.map((o) => (o.id === order.id ? updated : o)));
                toast.success('Pedido actualizado', 'Pedidos');
            })
            .catch((e) => {
                console.error('[MobilePedidos] Error actualizando pedido:', e);
                setOrders(() => snapshot); // revertir
                toast.error('No se pudo actualizar el pedido.', 'Error');
            });
    };

    return (
        <div className="space-y-3">
            <div>
                <h1 className="text-lg font-black text-light-text dark:text-light-background">
                    Pedidos en curso
                </h1>
                <p className="text-xs text-light-subtext dark:text-gray-400">Toca un pedido para editarlo.</p>
            </div>

            {active.length === 0 && (
                <p className="text-sm text-light-subtext dark:text-gray-400 py-8 text-center">
                    No hay pedidos activos.
                </p>
            )}

            {active.map((o) => (
                <button
                    key={o.id}
                    onClick={() => openEdit(o)}
                    className="w-full text-left bg-light-surface dark:bg-dark-800 rounded-2xl p-4 shadow-sm border border-light-border dark:border-dark-700 active:scale-[0.99] transition"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-light-text dark:text-light-background truncate">
                            #{o.orderNumber || o.id.slice(-4)} · {o.customerName || 'Sin nombre'}
                        </span>
                        <span
                            className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-full ${
                                STATUS_BADGE[o.status] || 'bg-gray-100 text-gray-600'
                            }`}
                        >
                            {o.status}
                        </span>
                    </div>
                    <div className="mt-1 text-xs text-light-subtext dark:text-gray-400">
                        {o.type} · {o.items.length} ítems · ${orderTotal(o).toFixed(2)}
                    </div>
                </button>
            ))}

            <OrderFormModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onSave={handleSave}
                order={editing}
                menuItems={state.menuItems}
            />
        </div>
    );
};

export default MobilePedidos;
