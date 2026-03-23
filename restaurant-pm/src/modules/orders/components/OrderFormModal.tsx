/**
 * @file OrderFormModal.tsx
 * @description Componente modal para crear o editar una orden.
 * Este archivo pertenece al módulo de órdenes (orders).
 */
import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../menu/types/menu.types';
import { Order, OrderItem, OrderStatus } from '../types/order.types';
import Modal from '../../../components/ui/Modal';
import { SearchIcon, ClipboardListIcon, MinusIcon, PlusIcon, TrashIcon } from '../../../components/ui/Icons';
import { toast } from '../../../components/ui/AlertProvider';
import { Validators } from '../../../utils/validators';

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

export interface OrderFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (order: Order) => void;
    order: Order | null;
    menuItems: MenuItem[];
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({ isOpen, onClose, onSave, order, menuItems }) => {
    // Form State
    const [customerName, setCustomerName] = useState('');
    const [type, setType] = useState<'En Local' | 'Delivery' | 'Para Llevar'>('En Local');
    const [status, setStatus] = useState<OrderStatus>(OrderStatus.New);
    // Local type for items with UI state
    type LocalOrderItem = OrderItem & { isNew?: boolean };
    const [items, setItems] = useState<LocalOrderItem[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
    const [showCartOnMobile, setShowCartOnMobile] = useState(false);

    const isEditing = order !== null;
    const availableItems = menuItems.filter(item => item.available);

    // Derived State: Categories
    const categories = ['Todos', ...Array.from(new Set(availableItems.map(item => item.category)))];

    // Filtered Menu Items
    const filteredMenuItems = availableItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            if (order) {
                setCustomerName(order.customerName);
                setType(order.type);
                setStatus(order.status);
                // Enrich items with price if missing
                const enrichedItems = order.items.map(item => {
                    if (item.price !== undefined) return { ...item, isNew: false };
                    const menuItem = menuItems.find(m => m.name === item.name);
                    return { ...item, price: menuItem ? menuItem.price : 0, isNew: false };
                });
                setItems(enrichedItems);
            } else {
                setCustomerName('');
                setType('En Local');
                setStatus(OrderStatus.New);
                setItems([]);
                setSearchQuery('');
                setSelectedCategory('Todos');
                setShowCartOnMobile(false);
            }
        }
    }, [isOpen, order]);

    const handleAddItem = (menuItem: MenuItem) => {
        // Find if there is an existing NEW item to merge with
        const existingNewItemIndex = items.findIndex(i => i.name === menuItem.name && i.isNew === true);

        if (existingNewItemIndex >= 0) {
            // Merge with the existing NEW item
            const newItems = [...items];
            newItems[existingNewItemIndex].quantity += 1;
            setItems(newItems);
        } else {
            // Create a new line item, even if the same product exists as a saved item
            setItems([...items, { name: menuItem.name, quantity: 1, price: menuItem.price, prepared: false, isNew: true }]);
        }
    };

    const handleUpdateQuantity = (index: number, delta: number) => {
        const newItems = [...items];
        const newQty = newItems[index].quantity + delta;
        if (newQty > 0) {
            newItems[index].quantity = newQty;
            setItems(newItems);
        }
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleAddManualItem = () => {
        const name = prompt("Nombre del producto manual:");
        if (!name) return;
        const priceStr = prompt("Precio del producto:");
        const price = parseFloat(priceStr || '0');
        if (isNaN(price)) return;

        setItems([...items, { name, quantity: 1, price, prepared: false, isNew: true }]);
    };

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const newErrors: Record<string, string> = {};
        if (!Validators.required(customerName)) {
            newErrors.customerName = 'El nombre del cliente o mesa es obligatorio.';
        }
        
        if (items.length === 0) {
            toast.warning('El pedido debe tener al menos un ítem.', 'Pedido Vacío');
            return;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Por favor, corrija los errores en el formulario.', 'Error de Validación');
            return;
        }

        let finalStatus = status;
        const hasUnpreparedItems = items.some(item => !item.prepared);

        // Si hay items sin preparar y la orden estaba en un estado finalizado/listo, 
        // retrocedemos el estado a "Nuevo" para que la cocina lo vuelva a ver.
        if (hasUnpreparedItems && (status === OrderStatus.Ready || status === OrderStatus.Completed)) {
            finalStatus = OrderStatus.New;
        }

        // Strip the isNew flag before saving to backend
        const cleanItems = items.map(({ isNew, ...item }) => item);

        const newOrder: Order = {
            id: order?.id || Date.now().toString(),
            customerName: customerName.trim(),
            type,
            status: finalStatus,
            items: cleanItems,
            createdAt: order?.createdAt || new Date().toISOString(),
            readyAt: finalStatus === OrderStatus.New ? null : order?.readyAt, // Reset readyAt if going back to New
            orderNumber: order?.orderNumber,
        };
        onSave(newOrder);
        onClose();
    };

    const total = items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Pedido' : 'Nuevo Pedido'} maxWidth="max-w-6xl">
            <div className="flex flex-col md:flex-row h-[80vh] md:h-[600px] overflow-hidden bg-gray-100 dark:bg-dark-900 -m-6 rounded-b-lg">

                {/* --- LEFT COLUMN: PRODUCT CATALOG --- */}
                <div className={`flex-1 flex flex-col h-full overflow-hidden ${showCartOnMobile ? 'hidden md:flex' : 'flex'}`}>
                    {/* Catalog Header: Search & Categories */}
                    <div className="p-4 bg-white dark:bg-dark-800 shadow-sm z-10 space-y-3">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className={inputClass.replace('p-2.5', 'pl-10 p-2.5')}
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Catalog Grid */}
                    <div className="flex-1 overflow-y-auto p-4 content-start">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {filteredMenuItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleAddItem(item)}
                                    className="flex flex-col items-center p-3 bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left group active:scale-95"
                                >
                                    <div className="w-full aspect-square bg-gray-100 dark:bg-dark-700 rounded-lg mb-2 overflow-hidden relative">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl">ðŸ½ï¸</div>
                                        )}
                                        {/* Price Tag Overlay */}
                                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                                            ${item.price.toFixed(2)}
                                        </div>
                                    </div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm w-full truncate leading-tight">{item.name}</h4>
                                </button>
                            ))}
                        </div>
                        {filteredMenuItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                <SearchIcon className="w-10 h-10 mb-2 opacity-50" />
                                <p>No se encontraron productos</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RIGHT COLUMN: TICKET / CART --- */}
                <div className={`md:w-[400px] w-full flex flex-col h-full bg-white dark:bg-dark-800 border-l dark:border-dark-700 shadow-xl z-20 ${showCartOnMobile ? 'flex' : 'hidden md:flex'}`}>
                    {/* Ticket Header */}
                    <div className="p-4 border-b dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50">
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <div className="flex-1 flex flex-col">
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={e => {
                                            setCustomerName(e.target.value);
                                            if (errors.customerName) setErrors(prev => ({ ...prev, customerName: '' }));
                                        }}
                                        placeholder="Nombre / Mesa *"
                                        className={`${inputClass} ${errors.customerName ? 'border-red-500 ring-4 ring-red-500/10' : ''}`}
                                    />
                                    {errors.customerName && <p className="text-[10px] text-red-500 mt-1 font-bold pl-1">{errors.customerName}</p>}
                                </div>
                                <button
                                    className="md:hidden p-2 text-gray-500"
                                    onClick={() => setShowCartOnMobile(false)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={type}
                                    onChange={e => setType(e.target.value as any)}
                                    className="w-1/2 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-xs font-medium"
                                >
                                    <option>En Local</option>
                                    <option>Delivery</option>
                                    <option>Para Llevar</option>
                                </select>
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value as any)}
                                    className="w-1/2 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-xs font-medium"
                                >
                                    <option value={OrderStatus.New}>{OrderStatus.New}</option>
                                    <option value={OrderStatus.Ready}>{OrderStatus.Ready}</option>
                                    <option value={OrderStatus.Completed}>{OrderStatus.Completed}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Ticket Items (Scrollable) */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/50 dark:bg-dark-800">
                        {items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                <ClipboardListIcon className="w-12 h-12 mb-2" />
                                <p className="text-sm">El pedido estí¡ vací­o</p>
                            </div>
                        ) : (
                            items.map((item, index) => (
                                <div key={index} className={`flex items-center gap-2 p-2 rounded-lg shadow-sm border animate-in fade-in slide-in-from-right-2 duration-200 ${item.isNew === false
                                    ? 'bg-gray-100 dark:bg-dark-700/50 border-gray-200 dark:border-dark-600'
                                    : 'bg-white dark:bg-dark-700 border-green-100 dark:border-green-900/30 ring-1 ring-green-400/20'
                                    }`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-semibold truncate ${item.isNew === false ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                {item.name}
                                            </span>
                                            {item.isNew === false && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.prepared
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                    }`}>
                                                    {item.prepared ? 'Despachado' : 'En Cocina'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">${item.price?.toFixed(2)}</div>
                                    </div>

                                    <div className={`flex items-center rounded-lg p-0.5 ${item.isNew === false ? 'bg-gray-200 dark:bg-dark-600' : 'bg-gray-100 dark:bg-dark-800'} ${item.prepared ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <button
                                            onClick={() => !item.prepared && handleUpdateQuantity(index, -1)}
                                            disabled={item.prepared}
                                            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${item.prepared
                                                ? 'text-gray-400 cursor-not-allowed'
                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-dark-500'
                                                }`}
                                        >
                                            <MinusIcon className="w-3 h-3" />
                                        </button>
                                        <span className={`w-8 text-center text-xs font-bold ${item.isNew === false ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => !item.prepared && handleUpdateQuantity(index, 1)}
                                            disabled={item.prepared}
                                            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${item.prepared
                                                ? 'text-gray-400 cursor-not-allowed'
                                                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                                                }`}
                                        >
                                            <PlusIcon className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="w-16 text-right font-bold text-sm text-gray-700 dark:text-gray-300">
                                        ${((item.price || 0) * item.quantity).toFixed(2)}
                                    </div>

                                    <button
                                        onClick={() => !item.prepared && handleRemoveItem(index)}
                                        disabled={item.prepared}
                                        className={`p-1 transition-colors ${item.prepared ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-500'}`}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                        <button onClick={handleAddManualItem} className="w-full py-2 text-xs text-blue-600 hover:text-blue-700 font-medium border border-dashed border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                            + Aí±adir í­tem manual
                        </button>
                    </div>

                    {/* Ticket Footer (Totals & Actions) */}
                    <div className="p-4 bg-white dark:bg-dark-800 border-t dark:border-dark-700 shadow-lg">
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-sm text-gray-500 font-medium">Total ({totalItems} items)</span>
                            <span className="text-3xl font-bold text-gray-900 dark:text-white pb-1">${total.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-3">
                            {/* Mobile Only: Back to Catalog */}
                            <button
                                onClick={() => setShowCartOnMobile(false)}
                                className="md:hidden flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold"
                            >
                                Seguir Pidiendo
                            </button>

                            <button
                                onClick={() => handleSubmit()}
                                className="flex-[2] md:flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm sm:text-base flex justify-center items-center gap-2"
                            >
                                <span className="uppercase tracking-wide">{isEditing ? 'Guardar' : 'Confirmar'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Bottom Bar (When Cart Hidden) */}
                {!showCartOnMobile && (
                    <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white dark:bg-dark-800 border-t dark:border-dark-700 p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex items-center justify-between z-30" onClick={() => setShowCartOnMobile(true)}>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-medium">{totalItems} í­tems</span>
                            <span className="text-xl font-bold text-gray-900 dark:text-white">${total.toFixed(2)}</span>
                        </div>
                        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md">
                            Ver Pedido
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};
