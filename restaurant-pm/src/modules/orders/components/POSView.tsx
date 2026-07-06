import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem } from '../../menu/types/menu.types';
import { Order, OrderItem, OrderStatus } from '../types/order.types';
import { SearchIcon, PlusIcon, MinusIcon, TrashIcon, ClipboardListIcon, ChevronLeftIcon, EditIcon } from '../../../components/ui/Icons';
import { toast } from '../../../components/ui/AlertProvider';
import { optimizeImage } from '../../../utils/cloudinary';
import { categoryKey, uniqueCategoryNames } from '../../../utils/categoryName';
import '../styles/posStyles.css';

interface POSViewProps {
    menuItems: MenuItem[];
    onSave: (order: Order) => Promise<void>;
    onCancel: () => void;
    initialOrder?: Order | null;
}

const POSView: React.FC<POSViewProps> = ({ menuItems, onSave, onCancel, initialOrder }) => {
    // State
    const [customerName, setCustomerName] = useState(initialOrder?.customerName || '');
    const [orderType, setOrderType] = useState<'En Local' | 'Delivery' | 'Para Llevar'>(initialOrder?.type || 'En Local');
    const [cartItems, setCartItems] = useState<OrderItem[]>(initialOrder?.items || []);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [isSaving, setIsSaving] = useState(false);
    const [showTicketMobile, setShowTicketMobile] = useState(false);
    const [lastAddedFeedback, setLastAddedFeedback] = useState<string | null>(null);
    const [editingPriceIdx, setEditingPriceIdx] = useState<number | null>(null);

    // Categories
    const categories = useMemo(() => {
        const cats = ['Todos', ...uniqueCategoryNames(menuItems.filter(i => i.available).map(i => i.category))];
        return cats;
    }, [menuItems]);

    // Filtered Items
    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            if (!item.available) return false;
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'Todos' || categoryKey(item.category) === categoryKey(selectedCategory);
            return matchesSearch && matchesCategory;
        });
    }, [menuItems, searchQuery, selectedCategory]);

    const addToCart = (item: MenuItem) => {
        setCartItems(prev => {
            const existing = prev.find(i => i.name === item.name && !i.prepared);
            if (existing) {
                return prev.map(i => (i === existing ? { ...i, quantity: i.quantity + 1 } : i));
            }
            return [...prev, { name: item.name, quantity: 1, price: item.price, prepared: false, taxRate: item.taxRate }];
        });

        // Visual Feedback
        setLastAddedFeedback(item.name);
        setTimeout(() => setLastAddedFeedback(null), 2000);
    };

    const updateQuantity = (index: number, delta: number) => {
        setCartItems(prev => {
            const newItems = [...prev];
            const item = newItems[index];
            if (item.prepared) return prev; // Cannot change quantity of prepared items

            const newQty = item.quantity + delta;
            if (newQty > 0) {
                newItems[index] = { ...item, quantity: newQty };
                return newItems;
            }
            return prev;
        });
    };

    const removeItem = (index: number) => {
        if (cartItems[index]?.prepared) return; // los preparados no se eliminan
        setCartItems(prev => prev.filter((_, i) => i !== index));
        // Mantener el índice de edición de precio alineado tras el filtrado
        setEditingPriceIdx(prev => {
            if (prev === null) return null;
            if (prev === index) return null;
            return prev > index ? prev - 1 : prev;
        });
    };

    // Ajustar el precio de una línea (ej. sustitución más cara: arroz relleno).
    // Guarda el precio original la primera vez para poder mostrarlo tachado.
    const updateItemPrice = (index: number, newPrice: number) => {
        setCartItems(prev => {
            const newItems = [...prev];
            const item = newItems[index];
            if (item.prepared) return prev;
            if (isNaN(newPrice) || newPrice < 0) return prev;
            const rounded = Math.round(newPrice * 100) / 100; // 2 decimales (moneda)
            const originalPrice = item.originalPrice ?? item.price;
            newItems[index] = { ...item, price: rounded, originalPrice };
            return newItems;
        });
    };

    // Nota para la cocina por producto (ej. "sin cebolla", "arroz relleno")
    const updateItemNotes = (index: number, notes: string) => {
        setCartItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], notes };
            return newItems;
        });
    };

    const total = cartItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);

    // Desglose de IVA respetando el taxRate de CADA producto (0%, 5%, 12%, 15%).
    // Los precios YA incluyen IVA: la base se extrae dividiendo por (1 + tasa).
    // Un producto al 0% aporta 0 de IVA (antes se asumía 15% para todo el total).
    const { subtotal, ivaTotal } = cartItems.reduce((acc, item) => {
        const itemTotal = (item.price || 0) * item.quantity;
        const rate = (item.taxRate ?? 15) / 100;
        const base = rate > 0 ? itemTotal / (1 + rate) : itemTotal;
        acc.subtotal += base;
        acc.ivaTotal += itemTotal - base;
        return acc;
    }, { subtotal: 0, ivaTotal: 0 });

    const handleConfirm = async () => {
        if (!customerName.trim()) {
            toast.warning('Por favor ingrese el nombre del cliente o número de mesa', 'Campo Requerido');
            return;
        }
        if (cartItems.length === 0) {
            toast.warning('Agregue al menos un producto al pedido', 'Carrito Vacío');
            return;
        }

        setIsSaving(true);
        try {
            await onSave({
                id: initialOrder?.id || Date.now().toString(),
                customerName,
                type: orderType,
                status: initialOrder?.status || OrderStatus.New,
                items: cartItems,
                createdAt: initialOrder?.createdAt || new Date().toISOString(),
                orderNumber: initialOrder?.orderNumber
            });
            onCancel(); // Use cancel to close/switch back
        } catch (error) {
            console.error('Error saving POS order:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const getCategoryClass = (cat: string) => {
        const base = "category-pill px-2.5 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border-2 text-[10px] md:text-sm font-bold flex items-center justify-center min-w-[70px] md:min-w-[100px] whitespace-nowrap ";
        const isActive = selectedCategory === cat;
        
        const catMap: Record<string, string> = {
            'Carnes': 'cat-carnes',
            'Mariscos': 'cat-mariscos',
            'Bebidas': 'cat-bebidas',
            'Postres': 'cat-postres',
            'Entradas': 'cat-entradas'
        };

        const colorClass = catMap[cat] || 'border-gray-200 text-gray-500';
        return `${base} ${colorClass} ${isActive ? 'active shadow-lg transform scale-105' : 'bg-white dark:bg-dark-800'}`;
    };

    return (
        <div className="pos-container pos-full-height flex flex-col animate-in fade-in duration-500">
            {/* Header / Toolbar */}
            <div className="flex items-center justify-between mb-2 md:mb-6 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <button 
                        onClick={onCancel}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors shrink-0 touch-target"
                    >
                        <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-sm md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter truncate">
                            {initialOrder ? `Pedido #${initialOrder.orderNumber || initialOrder.id.slice(-6)}` : 'Nuevo Pedido'}
                        </h2>
                        <p className="text-[9px] md:text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                            POS
                        </p>
                    </div>
                </div>
                {/* Order type selector — visible on ALL sizes */}
                <div className="flex bg-gray-100 dark:bg-dark-800 p-0.5 md:p-1 rounded-xl shrink-0">
                    {(['En Local', 'Para Llevar', 'Delivery'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setOrderType(type)}
                            className={`px-2 md:px-4 py-1.5 rounded-lg text-[9px] md:text-xs font-bold transition-all whitespace-nowrap ${orderType === type 
                                ? 'bg-white dark:bg-dark-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                                : 'text-gray-400'}`}
                        >
                            {type === 'En Local' ? '🍽️' : type === 'Para Llevar' ? '📦' : '🛵'}
                            <span className="hidden sm:inline ml-1">{type}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden relative">
                {/* Catalog Section */}
                <div className={`flex-[3] flex flex-col min-w-0 ${showTicketMobile ? 'hidden md:flex' : 'flex'}`}>
                    {/* Search & Categories */}
                    <div className="glass-panel p-2.5 md:p-4 mb-2 md:mb-4 space-y-2 md:space-y-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 md:w-5 h-4 md:h-5" />
                            <input 
                                type="text" 
                                placeholder="Buscar producto..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 bg-white dark:bg-dark-900 border-none rounded-xl md:rounded-2xl text-sm md:text-lg font-medium focus:ring-4 focus:ring-blue-500/10 placeholder-gray-300 dark:placeholder-gray-600 transition-all shadow-inner"
                            />
                        </div>
                        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-1 md:pb-2 no-scrollbar category-scroll">
                            {categories.map(cat => (
                                <button 
                                    key={cat} 
                                    onClick={() => setSelectedCategory(cat)}
                                    className={getCategoryClass(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grid with improved mobile padding to clear floating button */}
                    <div className="flex-1 overflow-y-auto pr-1 md:pr-2 custom-scroll pb-28 md:pb-4">
                        <div className="pos-grid">
                            {filteredItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className="product-card bg-white dark:bg-dark-800 rounded-xl p-2 md:rounded-3xl md:p-3 flex flex-col items-center group relative active:scale-[0.97] transition-transform"
                                >
                                    <div className="w-full aspect-[4/3] md:aspect-square rounded-lg md:rounded-2xl overflow-hidden mb-1.5 md:mb-2 bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
                                        {item.imageUrl ? (
                                            <img src={optimizeImage(item.imageUrl, 300)} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <span className="text-2xl md:text-4xl group-hover:scale-125 transition-transform duration-300">🍽️</span>
                                        )}
                                    </div>
                                    <div className="text-center w-full">
                                        <h4 className="font-bold text-gray-800 dark:text-gray-100 text-[11px] md:text-sm truncate px-0.5">{item.name}</h4>
                                        <p className="text-blue-600 dark:text-blue-400 font-black text-sm md:text-base">${item.price.toFixed(2)}</p>
                                    </div>
                                    {/* Tap ripple effect */}
                                    <div className="absolute inset-0 bg-blue-500/0 group-active:bg-blue-500/10 rounded-xl md:rounded-3xl transition-colors"></div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Ticket/Cart Section — fixed fullscreen on mobile, sidebar on md+ */}
                {/* On mobile it renders as a bottom sheet / fullscreen overlay */}
                <div className={`flex-[1.5] flex-col min-w-[320px]
                    md:flex md:relative md:inset-auto
                    ${showTicketMobile
                        ? 'fixed inset-0 z-[9999] flex bg-gray-50 dark:bg-dark-900'
                        : 'hidden md:flex'
                    }`}>
                    <div className="glass-panel h-full flex flex-col overflow-hidden bg-white dark:bg-dark-900 md:bg-white/40 md:dark:bg-dark-800/40">
                        {/* Ticket Header Mobile Toggle */}
                        <div className="md:hidden p-3 border-b dark:border-dark-700 flex items-center justify-between bg-white dark:bg-dark-900 sticky top-0 z-20">
                            <button 
                                onClick={() => setShowTicketMobile(false)}
                                className="flex items-center gap-1 text-blue-600 font-bold text-xs"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                                CATÁLOGO
                            </button>
                            <div className="text-center leading-tight">
                                <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase">Tu Pedido</h3>
                                <p className="text-[10px] text-gray-400">{cartItems.reduce((s, i) => s + i.quantity, 0)} productos</p>
                            </div>
                            <button 
                                onClick={() => setShowTicketMobile(false)}
                                className="p-2 bg-gray-100 dark:bg-dark-800 rounded-full"
                            >
                                <PlusIcon className="w-5 h-5 rotate-45 text-gray-500" />
                            </button>
                        </div>

                        {/* Desktop Ticket Header — hidden on mobile */}
                        <div className="hidden md:block px-6 pt-5 pb-2">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <ClipboardListIcon className="w-5 h-5 text-blue-500" />
                                RESUMEN DEL PEDIDO
                            </h3>
                        </div>

                        {/* Customer info — always visible */}
                        <div className="px-4 md:px-6 py-3 border-b dark:border-dark-700 space-y-2">
                            <input 
                                type="text" 
                                placeholder="NOMBRE DEL CLIENTE / MESA *"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value.toUpperCase())}
                                className="w-full bg-white dark:bg-dark-900 border-2 border-gray-100 dark:border-dark-700 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 focus:ring-0 transition-colors"
                            />
                            <select
                                value={orderType}
                                onChange={e => setOrderType(e.target.value as any)}
                                className="w-full bg-white dark:bg-dark-900 border-2 border-gray-100 dark:border-dark-700 rounded-xl px-3 py-2 text-xs font-bold"
                            >
                                <option>En Local</option>
                                <option>Delivery</option>
                                <option>Para Llevar</option>
                            </select>
                        </div>

                        {/* Items Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {cartItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30">
                                    <div className="w-16 h-16 bg-gray-200 dark:bg-dark-700 rounded-full flex items-center justify-center mb-4">
                                        <PlusIcon className="w-8 h-8" />
                                    </div>
                                    <p className="font-bold text-sm tracking-tight text-center">EL TICKET ESTÁ VACÍO<br/>SELECCIONA PRODUCTOS</p>
                                </div>
                            ) : (
                                cartItems.map((item, idx) => {
                                    const priceAdjusted = item.originalPrice != null && item.originalPrice !== item.price;
                                    return (
                                    <div key={idx} className="animate-slide-up bg-white dark:bg-dark-900 p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-sm border border-gray-50 dark:border-dark-700 space-y-2">
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h5 className="font-bold text-xs md:text-sm text-gray-800 dark:text-gray-100 truncate">{item.name}</h5>
                                                {/* Precio por unidad — tocar para ajustar (ej. sustitución más cara) */}
                                                {editingPriceIdx === idx ? (
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="text-[10px] font-bold text-gray-400">$</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            autoFocus
                                                            defaultValue={item.price ?? 0}
                                                            onBlur={(e) => { updateItemPrice(idx, parseFloat(e.target.value)); setEditingPriceIdx(null); }}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') { updateItemPrice(idx, parseFloat((e.target as HTMLInputElement).value)); setEditingPriceIdx(null); } }}
                                                            className="w-16 text-[11px] font-bold bg-gray-50 dark:bg-dark-800 border border-blue-300 dark:border-blue-700 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                        />
                                                        <span className="text-[9px] text-gray-400">c/u</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => !item.prepared && setEditingPriceIdx(idx)}
                                                        disabled={item.prepared}
                                                        className="flex items-center gap-1 mt-0.5 disabled:cursor-default"
                                                        title="Tocar para ajustar el precio"
                                                    >
                                                        {priceAdjusted && (
                                                            <span className="text-[9px] md:text-[10px] font-bold text-gray-300 dark:text-gray-600 line-through">${item.originalPrice!.toFixed(2)}</span>
                                                        )}
                                                        <span className={`text-[9px] md:text-[10px] font-bold tracking-tighter ${priceAdjusted ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                                            ${item.price?.toFixed(2)} c/u
                                                        </span>
                                                        {!item.prepared && <EditIcon className="w-2.5 h-2.5 text-gray-300" />}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center bg-gray-50 dark:bg-dark-800 rounded-xl p-0.5">
                                                <button
                                                    onClick={() => updateQuantity(idx, -1)}
                                                    data-testid={`btn-minus-${idx}`}
                                                    className="w-9 h-9 md:w-8 md:h-8 flex items-center justify-center text-gray-400 hover:text-red-500 active:bg-red-50 dark:active:bg-red-950/20 rounded-lg disabled:opacity-30 transition-colors"
                                                    disabled={item.prepared}
                                                >
                                                    <MinusIcon className="w-4 h-4 md:w-3 md:h-3" />
                                                </button>
                                                <span className="w-7 text-center text-sm md:text-xs font-black">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(idx, 1)}
                                                    data-testid={`btn-plus-${idx}`}
                                                    className="w-9 h-9 md:w-8 md:h-8 flex items-center justify-center text-gray-400 hover:text-blue-500 active:bg-blue-50 dark:active:bg-blue-950/20 rounded-lg disabled:opacity-30 transition-colors"
                                                    disabled={item.prepared}
                                                >
                                                    <PlusIcon className="w-4 h-4 md:w-3 md:h-3" />
                                                </button>
                                            </div>
                                            <div className="w-14 md:w-12 text-right">
                                                <p className="font-black text-sm text-gray-900 dark:text-white">${((item.price || 0) * item.quantity).toFixed(2)}</p>
                                            </div>
                                            <button
                                                onClick={() => removeItem(idx)}
                                                className="w-9 h-9 md:w-auto md:h-auto flex items-center justify-center text-gray-300 hover:text-red-500 active:bg-red-50 dark:active:bg-red-950/20 rounded-lg transition-colors disabled:opacity-10"
                                                disabled={item.prepared}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {/* Nota para la cocina (ej. "arroz relleno en vez de blanco", "sin cebolla") */}
                                        {item.prepared ? (
                                            item.notes ? <p className="text-[10px] text-gray-500 dark:text-gray-400 px-1">📝 {item.notes}</p> : null
                                        ) : (
                                            <input
                                                type="text"
                                                value={item.notes || ''}
                                                onChange={(e) => updateItemNotes(idx, e.target.value)}
                                                placeholder="📝 Nota para cocina (opcional)"
                                                className="w-full text-[10px] md:text-[11px] bg-gray-50 dark:bg-dark-800 border border-gray-100 dark:border-dark-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                                            />
                                        )}
                                    </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer / Summary */}
                        <div className="p-4 md:p-6 bg-white dark:bg-dark-900 border-t dark:border-dark-700 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                            <div className="flex justify-between items-end mb-3 md:mb-6">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Subtotal: ${subtotal.toFixed(2)}</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">IVA: ${ivaTotal.toFixed(2)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">Total</span>
                                    <span className="text-3xl md:text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">${total.toFixed(2)}</span>
                                </div>
                            </div>
                            <button 
                                onClick={handleConfirm}
                                data-testid="confirm-order-btn"
                                disabled={isSaving || cartItems.length === 0}
                                className="w-full py-3.5 md:py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-2xl md:rounded-3xl font-black text-base md:text-lg shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                            >
                                {isSaving ? (
                                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        {initialOrder ? <ClipboardListIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                                        {initialOrder ? 'ACTUALIZAR' : 'CONFIRMAR PEDIDO'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Feedback & Floating Cart Button */}
            {!showTicketMobile && cartItems.length > 0 && (
                <div className="md:hidden fixed bottom-20 left-3 right-3 z-[999] flex flex-col items-center gap-2">
                    {/* Last Item Mini-Toast */}
                    {lastAddedFeedback && (
                        <div className="bg-green-500 text-white py-1.5 px-3 rounded-xl text-[10px] font-bold shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-300 flex items-center gap-1.5">
                            ✓ {lastAddedFeedback}
                        </div>
                    )}
                    
                    <button 
                        onClick={() => setShowTicketMobile(true)}
                        className="w-full bg-blue-600 text-white rounded-2xl py-3 flex items-center justify-between px-5 shadow-2xl shadow-blue-500/40 font-black border border-white/10 active:scale-[0.98] transition-transform"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="bg-white/20 w-9 h-9 rounded-xl flex items-center justify-center relative">
                                <ClipboardListIcon className="w-5 h-5" />
                                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                                    {cartItems.reduce((s, i) => s + i.quantity, 0)}
                                </span>
                            </div>
                            <span className="text-sm">VER TICKET</span>
                        </div>
                        <span className="text-lg tracking-tight">${total.toFixed(2)}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default POSView;
