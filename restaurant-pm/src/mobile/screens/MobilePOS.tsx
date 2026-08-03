/**
 * MobilePOS — "Realizar Pedido".
 *
 * Layout basado en el diseño de Stitch "Realizar Pedido (V2)" (pills de categoría,
 * grid de productos con stepper, botón flotante "Ver Comanda"), pero:
 *  - Con los TOKENS del sistema (primary azul, light/dark) en vez de la paleta cálida.
 *  - Con el MODELO REAL del proyecto: nombre del cliente + tipo de pedido
 *    (En Local / Delivery / Para Llevar) — Stitch asumía mesa/mozo/pax que aquí no existen.
 *  - Moneda en USD ($), no S/.
 *
 * Crea el pedido de verdad vía orderService y lo refleja en el estado global,
 * así aparece al instante en Pedidos y Cocina.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../contexts/AppStateContext';
import { orderService } from '../../modules/orders/services/OrderService';
import { Order, OrderItem, OrderStatus } from '../../modules/orders/types/order.types';
import { toast } from '../../components/ui/AlertProvider';
import { PlusIcon, MinusIcon, ClipboardListIcon } from '../../components/ui/Icons';
import { getMobilePrefs, OrderType } from '../preferences';

const ORDER_TYPES: OrderType[] = ['En Local', 'Delivery', 'Para Llevar'];

const MobilePOS: React.FC = () => {
    const navigate = useNavigate();
    const { state, setOrders } = useAppState();

    const [customerName, setCustomerName] = useState('');
    const [orderType, setOrderType] = useState<OrderType>(() => getMobilePrefs().defaultOrderType);
    const [selectedCat, setSelectedCat] = useState('Todos');
    const [qty, setQty] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState(false);

    const available = useMemo(
        () => state.menuItems.filter((i) => i.available),
        [state.menuItems]
    );

    const categories = useMemo(
        () => ['Todos', ...Array.from(new Set(available.map((i) => i.category).filter(Boolean)))],
        [available]
    );

    const visible = useMemo(
        () => (selectedCat === 'Todos' ? available : available.filter((i) => i.category === selectedCat)),
        [available, selectedCat]
    );

    const byId = useMemo(() => {
        const map: Record<string, (typeof available)[number]> = {};
        available.forEach((i) => (map[i.id] = i));
        return map;
    }, [available]);

    const inc = (id: string) => setQty((q) => ({ ...q, [id]: (q[id] || 0) + 1 }));
    const dec = (id: string) =>
        setQty((q) => {
            const next = Math.max(0, (q[id] || 0) - 1);
            const copy = { ...q };
            if (next === 0) delete copy[id];
            else copy[id] = next;
            return copy;
        });

    const cartEntries = Object.entries(qty).filter(([, n]) => n > 0);
    const count = cartEntries.reduce((s, [, n]) => s + n, 0);
    const total = cartEntries.reduce((s, [id, n]) => s + (byId[id]?.price ?? 0) * n, 0);

    const handleSave = async () => {
        if (cartEntries.length === 0 || saving) return;
        setSaving(true);
        try {
            const items: OrderItem[] = cartEntries.map(([id, quantity]) => {
                const mi = byId[id];
                return { name: mi.name, quantity, price: mi.price, taxRate: mi.taxRate };
            });

            // El número de pedido lo asigna el SERVIDOR (contador atómico).
            const newOrder: Partial<Order> = {
                customerName: customerName.trim() || 'Sin nombre',
                items,
                type: orderType,
                status: OrderStatus.New,
                createdAt: new Date().toISOString(),
            };

            const created = await orderService.create(newOrder as Order);
            setOrders((prev) => [...prev, created]);
            toast.success(`Pedido #${created.orderNumber || created.id.slice(-6)} creado`, 'Éxito');

            setQty({});
            setCustomerName('');
            navigate('/pedidos');
        } catch (e) {
            console.error('[MobilePOS] Error creando pedido:', e);
            toast.error('No se pudo crear el pedido. Intenta de nuevo.', 'Error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pb-24">
            {/* Contexto del pedido: nombre + tipo (reemplaza mesa/mozo/pax de Stitch) */}
            <div className="bg-light-surface dark:bg-dark-800 rounded-2xl p-4 shadow-sm border border-light-border dark:border-dark-700 mb-4">
                <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="w-full bg-transparent text-lg font-bold text-light-text dark:text-light-background placeholder:text-light-subtext/60 focus:outline-none"
                />
                <div className="flex gap-2 mt-3">
                    {ORDER_TYPES.map((t) => (
                        <button
                            key={t}
                            onClick={() => setOrderType(t)}
                            className={`flex-1 text-xs font-semibold py-2 rounded-xl transition ${
                                orderType === t
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-light-background dark:bg-dark-700 text-light-subtext dark:text-gray-400'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pills de categorías (scroll horizontal) */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCat(cat)}
                        className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition ${
                            selectedCat === cat
                                ? 'bg-blue-600 text-white'
                                : 'bg-light-surface dark:bg-dark-800 text-light-subtext dark:text-gray-400 border border-light-border dark:border-dark-700'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Grid de productos (2 columnas) con stepper */}
            {visible.length === 0 ? (
                <p className="text-center text-sm text-light-subtext dark:text-gray-400 py-10">
                    No hay productos disponibles.
                </p>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {visible.map((item) => {
                        const n = qty[item.id] || 0;
                        return (
                            <div
                                key={item.id}
                                className="bg-light-surface dark:bg-dark-800 rounded-2xl p-2.5 shadow-sm border border-light-border dark:border-dark-700 flex flex-col"
                            >
                                <div className="aspect-square w-full rounded-xl overflow-hidden bg-light-background dark:bg-dark-700 mb-2">
                                    {item.imageUrl ? (
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-light-subtext/50 text-xs">
                                            Sin foto
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm font-bold text-light-text dark:text-light-background leading-tight line-clamp-2">
                                    {item.name}
                                </span>
                                <span className="text-blue-600 font-black text-sm mt-0.5">
                                    ${item.price.toFixed(2)}
                                </span>
                                <div className="flex items-center justify-between mt-2">
                                    <button
                                        onClick={() => dec(item.id)}
                                        disabled={n === 0}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-light-border dark:border-dark-700 text-light-text dark:text-light-background disabled:opacity-40 active:scale-95 transition"
                                        aria-label="Quitar uno"
                                    >
                                        <MinusIcon className="w-4 h-4" />
                                    </button>
                                    <span className="font-bold text-light-text dark:text-light-background w-6 text-center">
                                        {n}
                                    </span>
                                    <button
                                        onClick={() => inc(item.id)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 text-white active:scale-95 transition"
                                        aria-label="Agregar uno"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Botón flotante "Ver Comanda" (solo si hay items) */}
            {count > 0 && (
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="fixed left-4 right-4 bottom-20 z-30 flex items-center justify-between gap-3 bg-blue-600 text-white rounded-2xl px-5 py-4 shadow-2xl active:scale-[0.98] transition disabled:opacity-70"
                >
                    <span className="relative flex items-center">
                        <ClipboardListIcon className="w-6 h-6" />
                        <span className="absolute -top-2 -right-2 bg-white text-blue-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                            {count}
                        </span>
                    </span>
                    <span className="font-black">{saving ? 'Creando…' : 'Crear Comanda'}</span>
                    <span className="font-black">${total.toFixed(2)}</span>
                </button>
            )}
        </div>
    );
};

export default MobilePOS;
