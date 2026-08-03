/**
 * MobileDashboard — "Inicio" / Resumen del día (subset móvil).
 *
 * Layout basado en Stitch "Dashboard - Sabor & Brasa (V2)" (resumen del día, CTA nuevo
 * pedido, acciones rápidas, últimos pedidos) con tokens azules del sistema.
 * Métricas calculadas de datos REALES (AppState). Se adaptan las tarjetas que Stitch
 * mostraba con datos inexistentes (mesas/personal) a métricas reales del sistema.
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../contexts/AppStateContext';
import { Order, OrderStatus } from '../../modules/orders/types/order.types';
import { PlusIcon, ClipboardListIcon, ChefHatIcon, FileTextIcon, BookOpenIcon } from '../../components/ui/Icons';

const isToday = (iso: string) => {
    const d = new Date(iso);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};
const total = (o: Order) => o.items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);

const STATUS_BADGE: Record<string, string> = {
    [OrderStatus.New]: 'bg-blue-100 text-blue-800',
    [OrderStatus.Ready]: 'bg-green-100 text-green-700',
    [OrderStatus.Completed]: 'bg-gray-100 text-gray-600',
};

const MobileDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { state } = useAppState();

    const { ventasHoy, activos, pedidosHoy, recientes } = useMemo(() => {
        const today = state.orders.filter((o) => isToday(o.createdAt));
        return {
            ventasHoy: today.reduce((s, o) => s + total(o), 0),
            activos: state.orders.filter((o) => o.status !== OrderStatus.Completed).length,
            pedidosHoy: today.length,
            recientes: [...state.orders]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5),
        };
    }, [state.orders]);

    const dateLabel = new Date().toLocaleDateString('es-EC', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    const quickActions = [
        { label: 'Nuevo', Icon: PlusIcon, to: '/pos' },
        { label: 'Cocina', Icon: ChefHatIcon, to: '/cocina' },
        { label: 'Pedidos', Icon: ClipboardListIcon, to: '/pedidos' },
        { label: 'Menú', Icon: BookOpenIcon, to: '/menu' },
        { label: 'Facturar', Icon: FileTextIcon, to: '/facturar' },
    ];

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-black text-light-text dark:text-light-background">Resumen de hoy</h1>
                <p className="text-xs text-light-subtext dark:text-gray-400 capitalize">{dateLabel}</p>
            </div>

            <button
                onClick={() => navigate('/pos')}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-black py-3.5 rounded-2xl shadow-lg active:scale-[0.98] transition"
            >
                <PlusIcon className="w-5 h-5" /> Nuevo Pedido
            </button>

            {/* Métricas del día */}
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 bg-blue-600 text-white rounded-2xl p-4 shadow-md">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Ventas del día</p>
                    <p className="text-3xl font-black mt-1">${ventasHoy.toFixed(2)}</p>
                </div>
                <div className="bg-light-surface dark:bg-dark-800 rounded-2xl p-4 border border-light-border dark:border-dark-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-light-subtext">Pedidos activos</p>
                    <p className="text-2xl font-black text-light-text dark:text-light-background mt-1">{activos}</p>
                </div>
                <div className="bg-light-surface dark:bg-dark-800 rounded-2xl p-4 border border-light-border dark:border-dark-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-light-subtext">Pedidos hoy</p>
                    <p className="text-2xl font-black text-light-text dark:text-light-background mt-1">{pedidosHoy}</p>
                </div>
            </div>

            {/* Acciones rápidas */}
            <div>
                <p className="text-sm font-bold text-light-text dark:text-light-background mb-2">Acciones rápidas</p>
                <div className="grid grid-cols-5 gap-2">
                    {quickActions.map(({ label, Icon, to }) => (
                        <button
                            key={label}
                            onClick={() => navigate(to)}
                            className="flex flex-col items-center gap-1.5 bg-light-surface dark:bg-dark-800 rounded-xl py-3 border border-light-border dark:border-dark-700 active:scale-95 transition"
                        >
                            <span className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
                                <Icon className="w-5 h-5" />
                            </span>
                            <span className="text-[11px] font-semibold text-light-subtext dark:text-gray-400">
                                {label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Últimos pedidos */}
            <div>
                <p className="text-sm font-bold text-light-text dark:text-light-background mb-2">Últimos pedidos</p>
                {recientes.length === 0 ? (
                    <p className="text-sm text-light-subtext dark:text-gray-400 py-6 text-center">Sin pedidos aún.</p>
                ) : (
                    <div className="space-y-2">
                        {recientes.map((o) => (
                            <div
                                key={o.id}
                                className="flex items-center justify-between bg-light-surface dark:bg-dark-800 rounded-xl p-3 border border-light-border dark:border-dark-700"
                            >
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-light-text dark:text-light-background truncate">
                                        #{o.orderNumber || o.id.slice(-4)} · {o.customerName || 'Sin nombre'}
                                    </p>
                                    <p className="text-[11px] text-light-subtext dark:text-gray-400">
                                        {o.items.length} ítems · ${total(o).toFixed(2)}
                                    </p>
                                </div>
                                <span
                                    className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${
                                        STATUS_BADGE[o.status] || 'bg-gray-100 text-gray-600'
                                    }`}
                                >
                                    {o.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileDashboard;
