import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem } from '../../menu/types/menu.types';
import { Order, OrderItem, OrderStatus } from '../types/order.types';
import { SearchIcon, PlusIcon, MinusIcon, TrashIcon, ClipboardListIcon, ChevronLeftIcon } from '../../../components/ui/Icons';
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

    // Categories
    const categories = useMemo(() => {
        const cats = ['Todos', ...Array.from(new Set(menuItems.filter(i => i.available).map(i => i.category)))];
        return cats;
    }, [menuItems]);

    // Filtered Items
    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            if (!item.available) return false;
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [menuItems, searchQuery, selectedCategory]);

    const addToCart = (item: MenuItem) => {
        setCartItems(prev => {
            const existing = prev.find(i => i.name === item.name && !i.prepared);
            if (existing) {
                return prev.map(i => (i === existing ? { ...i, quantity: i.quantity + 1 } : i));
            }
            return [...prev, { name: item.name, quantity: 1, price: item.price, prepared: false }];
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
        setCartItems(prev => {
            if (prev[index].prepared) return prev;
            return prev.filter((_, i) => i !== index);
        });
    };

    const total = cartItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);

    const handleConfirm = async () => {
        if (!customerName.trim()) {
            alert('Por favor ingrese el nombre del cliente o número de mesa');
            return;
        }
        if (cartItems.length === 0) {
            alert('Agregue al menos un producto al pedido');
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
        const base = "category-pill px-4 py-2 rounded-2xl border-2 text-sm font-bold flex items-center justify-center min-w-[100px] ";
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
            <div className="flex items-center justify-between mb-3 md:mb-6">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onCancel}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors"
                    >
                        <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div>
                        <h2 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                            {initialOrder ? `Editando Pedido #${initialOrder.orderNumber || initialOrder.id.slice(-6)}` : 'Nuevo Pedido POS'}
                        </h2>
                        <p className="text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                            SISTEMA POS
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="hidden md:flex bg-gray-100 dark:bg-dark-800 p-1 rounded-xl">
                        {(['En Local', 'Para Llevar', 'Delivery'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setOrderType(type)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${orderType === type 
                                    ? 'bg-white dark:bg-dark-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                                    : 'text-gray-500'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden relative">
                {/* Catalog Section */}
                <div className={`flex-[3] flex flex-col min-w-0 ${showTicketMobile ? 'hidden md:flex' : 'flex'}`}>
                    {/* Search & Categories */}
                    <div className="pos-glass-panel p-4 mb-4 space-y-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input 
                                type="text" 
                                placeholder="¿Qué desea el cliente hoy?"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-dark-900 border-none rounded-2xl text-lg font-medium focus:ring-4 focus:ring-blue-500/10 placeholder-gray-300 dark:placeholder-gray-600 transition-all shadow-inner"
                            />
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar pos-scroll">
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
                    <div className="flex-1 overflow-y-auto pr-2 pos-scroll pb-36 md:pb-4">
                        <div className="pos-grid">
                            {filteredItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className="product-card bg-white dark:bg-dark-800 rounded-2xl p-2 md:rounded-3xl md:p-3 flex flex-col items-center group relative"
                                >
                                    <div className="w-full aspect-square rounded-xl md:rounded-2xl overflow-hidden mb-2 bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <span className="text-3xl md:text-4xl group-hover:scale-125 transition-transform duration-300">🍽️</span>
                                        )}
                                    </div>
                                    <div className="text-center w-full">
                                        <p className="text-[9px] md:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">{item.category}</p>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-100 text-xs md:text-sm truncate px-1">{item.name}</h4>
                                        <p className="text-blue-600 dark:text-blue-400 font-black text-sm md:text-base mt-0.5">${item.price.toFixed(2)}</p>
                                    </div>
                                    {/* Tap ripple effect */}
                                    <div className="absolute inset-0 bg-blue-500/0 group-active:bg-blue-500/10 rounded-2xl md:rounded-3xl transition-colors"></div>
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
                    <div className="pos-glass-panel h-full flex flex-col overflow-hidden bg-white dark:bg-dark-900 md:bg-white/40 md:dark:bg-dark-800/40">
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
                                cartItems.map((item, idx) => (
                                    <div key={idx} className="animate-ticket-item bg-white dark:bg-dark-900 p-3 rounded-2xl flex items-center gap-3 shadow-sm border border-gray-50 dark:border-dark-700">
                                        <div className="flex-1 min-w-0">
                                            <h5 className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{item.name}</h5>
                                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-tighter">${item.price?.toFixed(2)} / UNIDAD</p>
                                        </div>
                                        <div className="flex items-center bg-gray-50 dark:bg-dark-800 rounded-xl p-0.5">
                                            <button 
                                                onClick={() => updateQuantity(idx, -1)}
                                                data-testid={`btn-minus-${idx}`}
                                                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30"
                                                disabled={item.prepared}
                                            >
                                                <MinusIcon className="w-3 h-3" />
                                            </button>
                                            <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                                            <button 
                                                onClick={() => updateQuantity(idx, 1)}
                                                data-testid={`btn-plus-${idx}`}
                                                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-500 disabled:opacity-30"
                                                disabled={item.prepared}
                                            >
                                                <PlusIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="w-12 text-right">
                                            <p className="font-black text-sm text-gray-900 dark:text-white">${((item.price || 0) * item.quantity).toFixed(2)}</p>
                                        </div>
                                        <button 
                                            onClick={() => removeItem(idx)}
                                            className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-10"
                                            disabled={item.prepared}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer / Summary */}
                        <div className="p-6 bg-white dark:bg-dark-900 border-t dark:border-dark-700 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                            <div className="flex flex-col gap-1 mb-6">
                                <div className="flex justify-between items-center text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest">
                                    <span>Subtotal estimado</span>
                                    <span>${(total / 1.15).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest">
                                    <span>IVA (15%)</span>
                                    <span>${(total - (total / 1.15)).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-end mt-2">
                                    <span className="text-sm font-black text-gray-900 dark:text-white">TOTAL FINAL</span>
                                    <span className="text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">${total.toFixed(2)}</span>
                                </div>
                            </div>
                            <button 
                                onClick={handleConfirm}
                                data-testid="confirm-order-btn"
                                disabled={isSaving || cartItems.length === 0}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                            >
                                {isSaving ? (
                                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        {initialOrder ? <ClipboardListIcon className="w-6 h-6" /> : <PlusIcon className="w-6 h-6" />}
                                        {initialOrder ? 'ACTUALIZAR PEDIDO' : 'CONFIRMAR PEDIDO'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Feedback & Floating Button */}
            {!showTicketMobile && cartItems.length > 0 && (
                <div className="md:hidden fixed bottom-24 left-4 right-4 z-[999] flex flex-col gap-3">
                    {/* Last Item Mini-Toast */}
                    {lastAddedFeedback && (
                        <div className="bg-green-500 text-white py-2 px-4 rounded-2xl text-xs font-bold self-center shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-300 flex items-center gap-2">
                            <PlusIcon className="w-3 h-3" />
                            AÑADIDO: {lastAddedFeedback}
                        </div>
                    )}
                    
                    <button 
                        onClick={() => setShowTicketMobile(true)}
                        className="w-full bg-blue-600 text-white rounded-[2rem] py-4 flex items-center justify-between px-8 shadow-2xl shadow-blue-500/40 font-black border-2 border-white/10"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 w-10 h-10 rounded-2xl flex items-center justify-center">
                                <ClipboardListIcon className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col items-start leading-tight">
                                <span className="text-[10px] opacity-70 uppercase tracking-tighter">Mi Pedido</span>
                                <span>VER TICKET</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right leading-tight">
                                <p className="text-[10px] opacity-70">{cartItems.reduce((s, i) => s + i.quantity, 0)} PRODUCTOS</p>
                                <p className="text-xl tracking-tighter">${total.toFixed(2)}</p>
                            </div>
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                                <ChevronLeftIcon className="w-5 h-5 rotate-180" />
                            </div>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default POSView;
