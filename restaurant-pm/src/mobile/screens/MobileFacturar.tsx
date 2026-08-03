/**
 * MobileFacturar — Cobro / cierre de cuenta (subset móvil).
 *
 * Layout basado en Stitch "Facturación y Pagos (V2)" (cuentas pendientes → detalle de
 * consumo → total → método de pago → acción), con tokens azules del sistema.
 *
 * IMPORTANTE (money/legal): NO emite comprobantes SRI desde el móvil. Ese flujo fiscal
 * (datos del cliente + SRI) permanece en el sistema web. Aquí se hace un CIERRE DE CUENTA
 * rápido (marca la cuenta como pagada/cerrada, billingType 'Sin Factura'). La emisión
 * fiscal real se realiza desde la web.
 */

import React, { useMemo, useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { orderService } from '../../modules/orders/services/OrderService';
import { Order, OrderStatus } from '../../modules/orders/types/order.types';
import { toast } from '../../components/ui/AlertProvider';
import { ChevronLeftIcon } from '../../components/ui/Icons';

const PAYMENTS = ['Efectivo', 'Tarjeta', 'Transferencia'] as const;
type Payment = (typeof PAYMENTS)[number];

const orderTotal = (o: Order) =>
    o.items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);

const MobileFacturar: React.FC = () => {
    const { state, setOrders } = useAppState();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [payment, setPayment] = useState<Payment>('Efectivo');
    const [busy, setBusy] = useState(false);

    // Cuentas por cobrar: pedidos aún no facturados/cerrados.
    const pending = useMemo(
        () => state.orders.filter((o) => !o.billed && o.status !== OrderStatus.Completed),
        [state.orders]
    );
    const selected = pending.find((o) => o.id === selectedId) || null;

    const closeAccount = async (order: Order) => {
        if (busy) return;
        setBusy(true);
        try {
            const updated = await orderService.update(order.id, {
                billed: true,
                billingType: 'Sin Factura',
                status: OrderStatus.Completed,
            });
            setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
            toast.success(`Cuenta cerrada (${payment})`, 'Cobro');
            setSelectedId(null);
        } catch (e) {
            console.error('[MobileFacturar] Error cerrando cuenta:', e);
            toast.error('No se pudo cerrar la cuenta.', 'Error');
        } finally {
            setBusy(false);
        }
    };

    // -------- Detalle de una cuenta --------
    if (selected) {
        const total = orderTotal(selected);
        return (
            <div className="space-y-4">
                <button
                    onClick={() => setSelectedId(null)}
                    className="flex items-center gap-1 text-sm font-semibold text-blue-600"
                >
                    <ChevronLeftIcon className="w-4 h-4" /> Cuentas pendientes
                </button>

                <div className="bg-light-surface dark:bg-dark-800 rounded-2xl p-4 shadow-sm border border-light-border dark:border-dark-700">
                    <p className="font-black text-light-text dark:text-light-background">
                        #{selected.orderNumber || selected.id.slice(-4)} · {selected.customerName || 'Sin nombre'}
                    </p>
                    <p className="text-xs text-light-subtext dark:text-gray-400">{selected.type}</p>

                    <div className="mt-3 divide-y divide-light-border dark:divide-dark-700">
                        {selected.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between py-2 text-sm">
                                <span className="text-light-text dark:text-light-background">
                                    {it.quantity}x {it.name}
                                </span>
                                <span className="font-semibold text-light-text dark:text-light-background">
                                    ${((it.price ?? 0) * it.quantity).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-light-border dark:border-dark-700">
                        <span className="font-bold text-light-text dark:text-light-background">Total a pagar</span>
                        <span className="text-2xl font-black text-blue-600">${total.toFixed(2)}</span>
                    </div>
                </div>

                <div>
                    <p className="text-sm font-bold text-light-text dark:text-light-background mb-2">Método de pago</p>
                    <div className="flex gap-2">
                        {PAYMENTS.map((p) => (
                            <button
                                key={p}
                                onClick={() => setPayment(p)}
                                className={`flex-1 text-sm font-semibold py-2.5 rounded-xl transition ${
                                    payment === p
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-light-surface dark:bg-dark-800 text-light-subtext dark:text-gray-400 border border-light-border dark:border-dark-700'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => closeAccount(selected)}
                    disabled={busy}
                    className="w-full bg-blue-600 text-white font-black py-3.5 rounded-2xl active:scale-[0.98] transition disabled:opacity-70"
                >
                    {busy ? 'Cerrando…' : 'Registrar Pago y Cerrar'}
                </button>

                <p className="text-[11px] text-light-subtext dark:text-gray-500 text-center">
                    La factura electrónica (SRI) se emite desde el sistema web.
                </p>
            </div>
        );
    }

    // -------- Lista de cuentas pendientes --------
    return (
        <div className="space-y-3">
            <h1 className="text-lg font-black text-light-text dark:text-light-background">Cuentas pendientes</h1>

            {pending.length === 0 && (
                <p className="text-center text-sm text-light-subtext dark:text-gray-400 py-12">
                    No hay cuentas por cobrar.
                </p>
            )}

            {pending.map((o) => (
                <button
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    className="w-full text-left bg-light-surface dark:bg-dark-800 rounded-2xl p-4 shadow-sm border border-light-border dark:border-dark-700 active:scale-[0.99] transition flex items-center justify-between gap-2"
                >
                    <div className="min-w-0">
                        <p className="font-bold text-light-text dark:text-light-background truncate">
                            #{o.orderNumber || o.id.slice(-4)} · {o.customerName || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-light-subtext dark:text-gray-400">
                            {o.type} · {o.items.length} ítems
                        </p>
                    </div>
                    <span className="font-black text-blue-600 shrink-0">${orderTotal(o).toFixed(2)}</span>
                </button>
            ))}
        </div>
    );
};

export default MobileFacturar;
