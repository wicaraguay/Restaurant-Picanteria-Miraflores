import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { orderService } from '../services/OrderService';
import { billingService } from '../services/BillingService';
import { Order, OrderItem, OrderStatus, SetState, MenuItem } from '../types';
import Modal from './Modal';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, MinusIcon, ClipboardListIcon, PrinterIcon } from './Icons';
import { OrderNumberGenerator } from '../utils/orderNumberGenerator';
import { useRestaurantConfig } from '../contexts/RestaurantConfigContext';
import { generateAccessKey } from '@/utils/sri';
import { generateInvoiceHtml } from '../utils/invoiceGenerator';

interface OrderManagementProps {
    orders: Order[];
    setOrders: SetState<Order[]>;
    menuItems: MenuItem[];
}

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

// --- Order Card Component ---
// --- Order Card Component ---
const OrderCard: React.FC<{ order: Order; onEdit: () => void; onDelete: () => void; onStatusChange: (newStatus: OrderStatus) => void; onBilling?: () => void; }> = ({ order, onEdit, onDelete, onStatusChange, onBilling }) => {
    const getStatusColor = () => {
        switch (order.status) {
            case OrderStatus.New: return 'border-blue-500 dark:border-blue-400';
            case OrderStatus.Ready: return 'border-orange-500 dark:border-orange-400';
            case OrderStatus.Completed: return 'border-green-500 dark:border-green-400';
            default: return 'border-gray-300 dark:border-gray-600';
        }
    };

    const getStatusBadgeColor = () => {
        switch (order.status) {
            case OrderStatus.New: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
            case OrderStatus.Ready: return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
            case OrderStatus.Completed: return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-dark-600 dark:text-gray-300';
        }
    }

    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        const updateTimer = () => {
            const createdTime = new Date(order.createdAt).getTime();
            if (isNaN(createdTime)) {
                setTimeAgo('');
                return;
            }
            const minutes = Math.floor((Date.now() - createdTime) / 60000);
            if (minutes < 1) setTimeAgo('Ahora');
            else if (minutes < 60) setTimeAgo(`hace ${minutes} min`);
            else setTimeAgo(`hace ${Math.floor(minutes / 60)}h`);
        };
        updateTimer();
        const intervalId = setInterval(updateTimer, 30000);
        return () => clearInterval(intervalId);
    }, [order.createdAt]);

    const formattedDate = (order.createdAt && !isNaN(new Date(order.createdAt).getTime()))
        ? new Date(order.createdAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })
        : '';

    const handleStatusClick = () => {
        if (order.status === OrderStatus.New) onStatusChange(OrderStatus.Ready);
        else if (order.status === OrderStatus.Ready) onStatusChange(OrderStatus.Completed);
        else onStatusChange(OrderStatus.New);
    };

    const total = order.items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

    return (
        <div className={`bg-white dark:bg-dark-800 p-4 rounded-lg shadow-md border-l-4 ${getStatusColor()} flex flex-col justify-between`}>
            <div>
                <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">Orden #{order.orderNumber || order.id.slice(-6)} - {order.customerName}</h3>
                    <div className="flex flex-col items-end shrink-0">
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">{timeAgo}</span>
                        {formattedDate && <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{formattedDate}</span>}
                    </div>
                </div>
                <div className="flex justify-between items-center mb-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold">{order.type}</p>
                    <button onClick={handleStatusClick} className={`text-xs font-bold py-1 px-3 rounded-full ${getStatusBadgeColor()}`}>
                        {order.status}
                    </button>
                </div>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300 mb-4">
                    {order.items.map((item: OrderItem, index: number) => (
                        <li key={index} className="flex justify-between"><span>{item.name}</span><span className="font-semibold">x{item.quantity}</span></li>
                    ))}
                </ul>
            </div>

            <div className="border-t dark:border-dark-700 pt-2 mb-2 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Total:</span>
                <span className={`text-xl font-bold ${order.status === OrderStatus.Completed ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-white'}`}>
                    ${total.toFixed(2)}
                </span>
            </div>

            <div className="pt-2 border-t dark:border-dark-700 flex justify-end space-x-2">
                {order.status === OrderStatus.Completed && (
                    <button
                        onClick={onBilling}
                        className="flex items-center text-sm px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                    >
                        <span className="mr-1">🧾</span> Facturar
                    </button>
                )}
                <button onClick={onEdit} className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-dark-700 px-2 py-1 rounded"><EditIcon className="w-4 h-4 mr-1" />Editar</button>
                <button onClick={onDelete} className="flex items-center text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-dark-700 px-2 py-1 rounded"><TrashIcon className="w-4 h-4 mr-1" />Eliminar</button>
            </div>
        </div>
    );
};

// --- Order Form Modal Component ---
// --- Order Form Modal Component ---
interface OrderFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (order: Order) => void;
    order: Order | null;
    menuItems: MenuItem[];
}

const OrderFormModal: React.FC<OrderFormModalProps> = ({ isOpen, onClose, onSave, order, menuItems }) => {
    // Form State
    const [customerName, setCustomerName] = useState('');
    const [type, setType] = useState<'En Local' | 'Delivery' | 'Para Llevar'>('En Local');
    const [status, setStatus] = useState<OrderStatus>(OrderStatus.New);
    // Local type for items with UI state
    type LocalOrderItem = OrderItem & { isNew?: boolean };
    const [items, setItems] = useState<LocalOrderItem[]>([]);

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

        if (!customerName.trim()) {
            alert('Por favor, ingrese el nombre del cliente o mesa.');
            return;
        }
        if (items.length === 0) {
            alert('El pedido debe tener al menos un ítem.');
            return;
        }

        let finalStatus = status;
        const hasUnpreparedItems = items.some(item => !item.prepared);

        if (hasUnpreparedItems && (status === OrderStatus.Ready || status === OrderStatus.Completed)) {
            finalStatus = OrderStatus.New;
        }

        // Strip the isNew flag before saving to backend
        const cleanItems = items.map(({ isNew, ...item }) => item);

        const newOrder: Order = {
            id: order?.id || Date.now().toString(),
            customerName,
            type,
            status: finalStatus,
            items: cleanItems,
            createdAt: order?.createdAt || new Date().toISOString(),
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
                                            <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
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
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder="Nombre / Mesa *"
                                    className="flex-1 bg-white dark:bg-dark-800 border border-gray-300 dark:border-dark-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
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
                                <p className="text-sm">El pedido está vacío</p>
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
                            + Añadir ítem manual
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
                            <span className="text-xs text-gray-500 font-medium">{totalItems} ítems</span>
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

// --- Main Order Management Component ---
const OrderManagement: React.FC<OrderManagementProps> = ({ orders, setOrders, menuItems }) => {
    const { config, refreshConfig } = useRestaurantConfig();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

    const handleOpenModal = (order: Order | null) => {
        setEditingOrder(order);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingOrder(null);
        setIsModalOpen(false);
    };

    const handleSaveOrder = async (orderToSave: Order) => {
        try {
            const exists = orders.some(o => o.id === orderToSave.id);
            if (exists) {
                const updated = await orderService.update(orderToSave.id, orderToSave);
                setOrders(prevOrders => prevOrders.map(o => o.id === orderToSave.id ? updated : o));
            } else {
                // Remove the temporary ID generated by the form if needed,
                // but the backend usually ignores validation of ID on create or overwrites it.
                // We'll send it as is, but rely on the returned object which has the real DB ID.
                const orderWithNumber = {
                    ...orderToSave,
                    orderNumber: orderToSave.orderNumber || OrderNumberGenerator.getNextOrderNumber()
                };
                const created = await orderService.create(orderWithNumber);

                // If the backend returns 'created' without orderNumber (mock usage usually returns what we sent, but just in case)
                // we ensure the local state has it.
                if (!created.orderNumber) created.orderNumber = orderWithNumber.orderNumber;

                setOrders(prevOrders => [...prevOrders, created]);
            }
        } catch (error) {
            console.error('Failed to save order:', error);
            alert('Error al guardar el pedido. Intente nuevamente.');
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (window.confirm('¿Seguro que quieres eliminar este pedido?')) {
            try {
                await orderService.delete(orderId);
                setOrders(prev => prev.filter(o => o.id !== orderId));
            } catch (error) {
                console.error('Failed to delete order:', error);
                alert('Error al eliminar el pedido.');
            }
        }
    };

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        try {
            const updated = await orderService.update(orderId, { status: newStatus });
            setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Error al actualizar el estado.');
        }
    };

    const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
    const [billingOrder, setBillingOrder] = useState<Order | null>(null);
    const [billingData, setBillingData] = useState({
        identification: '',
        name: '',
        email: '',
        address: '',
        phone: '',
        paymentMethod: '01' // 01 - SIN UTILIZACION DEL SISTEMA FINANCIERO
    });

    const handleOpenBilling = (order: Order) => {
        setBillingOrder(order);
        // Pre-fill with available data from order or customer database (mocked here)
        setBillingData({
            identification: '', // In real app, fetch from customer profile
            name: order.customerName,
            email: '',
            address: '',
            phone: '',
            paymentMethod: '01'
        });
        setIsBillingModalOpen(true);
    };

    const handleProcessBilling = async () => {
        // Email is now optional - validate only identification and name
        if (!billingData.identification || !billingData.name) {
            alert('Por favor complete RUC/Cédula y Nombre del cliente.');
            return;
        }

        // Warn if no email is provided (but allow to continue)
        const hasValidEmail = billingData.email &&
            billingData.email.includes('@') &&
            !billingData.email.includes('noemail');

        if (!hasValidEmail && billingData.identification !== '9999999999999') {
            const shouldContinue = window.confirm(
                '⚠️ No se ha ingresado un email válido.\n\n' +
                'La factura se generará correctamente pero NO se enviará por correo electrónico.\n' +
                'Podrás imprimir el PDF para entregarlo físicamente al cliente.\n\n' +
                '¿Deseas continuar sin email?'
            );
            if (!shouldContinue) return;
        }

        try {
            // Updated: Call real backend API
            console.log('Enviando a facturar:', { order: billingOrder, client: billingData });
            const result = await billingService.generateXML({
                order: billingOrder,
                client: billingData,
                taxRate: config.billing?.taxRate || 15,
                logoUrl: config.fiscalLogo || config.logo
            });

            if (result.success) {
                // If SRI Authorization returned data, use it for printing
                const realAccessKey = result.accessKey;
                const authDate = result.sriResponse?.fechaAutorizacion || result.sriResponse?.authResult?.fechaAutorizacion;

                if (window.confirm(`✅ Factura SRI Generada con éxito!\nSecuencial: ${result.invoiceId}\n\n¿Deseas imprimir el comprobante (RIDE) ahora mismo?`)) {
                    handlePrintInvoice(realAccessKey, authDate);
                }



                // Refresh config to update the sequence number for the next invoice
                await refreshConfig();

                setIsBillingModalOpen(false);
            } else {
                alert('Hubo un problema al generar la factura.');
            }
        } catch (error) {
            console.error('Billing error', error);
            // Show specific backend error message which contains the "Avise Chevere"
            const errorMessage = error instanceof Error ? error.message : 'Error al procesar la factura con el servidor.';
            alert(errorMessage);
        }
    };

    const handlePrintInvoice = (accessKey?: string, authDate?: string) => {
        if (!billingOrder) return;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            alert('Por favor permite ventanas emergentes para imprimir.');
            return;
        }

        const html = generateInvoiceHtml(billingOrder, config, billingData, accessKey, authDate);

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const filteredOrders = (Array.isArray(orders) ? orders : []).filter(order => {
        if (activeTab === 'active') {
            return order.status === OrderStatus.New || order.status === OrderStatus.Ready;
        } else {
            return order.status === OrderStatus.Completed;
        }
    });



    return (
        <div>
            <OrderFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveOrder} order={editingOrder} menuItems={menuItems} />

            {/* Billing Modal Integration */}
            {isBillingModalOpen && billingOrder && (
                <Modal isOpen={isBillingModalOpen} onClose={() => setIsBillingModalOpen(false)} title="Emitir Factura Electrónica (SRI)" maxWidth="max-w-4xl">
                    <div className="flex flex-col md:flex-row gap-6 p-2">
                        {/* Left Column: Invoice Preview (Visual Representation) */}
                        {/* Invoice Preview Box */}
                        <div className="flex-1 bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-700 shadow-sm rounded-sm p-6 text-xs text-gray-800 dark:text-gray-300 font-mono relative overflow-hidden">
                            {/* Watermark/Background effect for Preview */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[100px] text-gray-100 dark:text-dark-800 -rotate-45 pointer-events-none font-sans font-bold opacity-50">
                                VISTA PREVIA
                            </div>

                            {/* Header Section */}
                            <div className="relative mb-6 flex justify-between items-start border-b border-gray-300 dark:border-dark-600 pb-4">
                                <div>
                                    {config.fiscalLogo || config.logo ? (
                                        <div className="mb-6 flex justify-center">
                                            <img
                                                src={config.fiscalLogo || config.logo}
                                                alt="Logo"
                                                className="max-w-[240px] max-h-[120px] w-auto h-auto object-contain rounded-lg"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 bg-gray-200 dark:bg-dark-700 rounded mb-4 flex items-center justify-center text-3xl mx-auto">🍽️</div>
                                    )}
                                    <h2 className="font-bold text-lg uppercase text-gray-900 dark:text-white leading-tight">{config.name || 'NOMBRE COMERCIAL'}</h2>
                                    <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">{config.businessName || 'CLIENTE'}</h3>
                                    <p>{config.address || 'Dirección Matriz, Ciudad, Ecuador'}</p>
                                    <p>RUC: {config.ruc || '9999999999001'}</p>
                                    <p>{config.fiscalEmail || config.email || 'correo@ejemplo.com'}</p>
                                    {config.contribuyenteEspecial && (
                                        <p className="font-bold">Contribuyente Especial Nro: {config.contribuyenteEspecial}</p>
                                    )}
                                    <p>Obligado a llevar contabilidad: {config.obligadoContabilidad ? 'SI' : 'NO'}</p>
                                </div>
                                <div className="text-right">
                                    <h3 className="font-bold text-sm">FACTURA</h3>
                                    <p className="font-mono text-lg font-bold text-red-600 dark:text-red-400">No. {config.billing?.establishment || '001'}-{config.billing?.emissionPoint || '001'}-{((config.billing?.currentSequenceFactura || 0) + 1).toString().padStart(9, '0')}</p>
                                    <p><span className="font-bold">FECHA EMISIÓN:</span> {new Date().toLocaleDateString('es-EC')}</p>

                                    <div className="mt-2 flex flex-col items-end gap-1">
                                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800">
                                            Ambiente: {config.billing?.environment === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                            Emisión: NORMAL
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Client Section (Preview) */}
                            <div className="relative mb-4 border border-gray-800 dark:border-gray-500 rounded p-3 bg-transparent">

                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    <div><span className="font-bold">Cliente:</span> {typeof billingData.name === 'string' ? billingData.name : JSON.stringify(billingData.name) || 'ANÓNIMO'}</div>
                                    <div><span className="font-bold max-w-[200px] truncate">RUC/CI:</span> {typeof billingData.identification === 'string' ? billingData.identification : String(billingData.identification || '9999999999999')}</div>
                                    <div><span className="font-bold">Fecha Emisión:</span> {new Date().toLocaleDateString('es-EC')}</div>
                                    <div className="col-span-2"><span className="font-bold">Dirección:</span> {typeof billingData.address === 'string' ? billingData.address : String(billingData.address || 'S/N')}</div>
                                    <div><span className="font-bold">Teléfono:</span> {typeof billingData.phone === 'string' ? billingData.phone : String(billingData.phone || 'S/N')}</div>
                                    <div className="flex flex-col">
                                        <span className="font-bold">Forma de Pago:</span>
                                        <span className="text-[10px] break-words">
                                            {String(billingData.paymentMethod) === '01' ? '01 - SIN UTILIZACION DEL SISTEMA FINANCIERO' :
                                                String(billingData.paymentMethod) === '20' ? '20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO' :
                                                    String(billingData.paymentMethod) === '19' ? '19 - TARJETA DE CREDITO' :
                                                        '01 - SIN UTILIZACION DEL SISTEMA FINANCIERO'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Order Items Detail */}
                            <div className="relative">
                                <div className="border border-gray-200 dark:border-dark-700 rounded-sm overflow-hidden mb-4">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-100 dark:bg-dark-800 text-left font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-dark-700">
                                            <tr>
                                                <th className="px-2 py-1">Cant</th>
                                                <th className="px-2 py-1">Descripción</th>
                                                <th className="px-2 py-1 text-right">P. Unit</th>
                                                <th className="px-2 py-1 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-dark-800">
                                            {billingOrder.items.map((item, idx) => (
                                                <tr key={idx} className="bg-white dark:bg-dark-900">
                                                    <td className="px-2 py-1">{item.quantity}</td>
                                                    <td className="px-2 py-1">{item.name}</td>
                                                    <td className="px-2 py-1 text-right">${(item.price || 0).toFixed(2)}</td>
                                                    <td className="px-2 py-1 text-right font-medium">
                                                        ${((item.price || 0) * item.quantity).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals Block */}
                                <div className="flex justify-end">
                                    <div className="w-1/2 border border-gray-200 dark:border-dark-700 rounded-sm overflow-hidden">
                                        {(() => {
                                            const currentTaxRate = config.billing?.taxRate || 15;
                                            const total = billingOrder.items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
                                            const subtotal = total / (1 + (currentTaxRate / 100));
                                            const tax = total - subtotal;

                                            return (
                                                <table className="w-full text-xs">
                                                    <tbody className="divide-y divide-gray-100 dark:divide-dark-800">
                                                        <tr>
                                                            <td className="px-2 py-1 font-bold bg-gray-50 dark:bg-dark-800">SUBTOTAL 15%</td>
                                                            <td className="px-2 py-1 text-right">${subtotal.toFixed(2)}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-2 py-1 font-bold bg-gray-50 dark:bg-dark-800">SUBTOTAL 0%</td>
                                                            <td className="px-2 py-1 text-right">$0.00</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-2 py-1 font-bold bg-gray-50 dark:bg-dark-800">DESCUENTO</td>
                                                            <td className="px-2 py-1 text-right">$0.00</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-2 py-1 font-bold bg-gray-50 dark:bg-dark-800">IVA {currentTaxRate}%</td>
                                                            <td className="px-2 py-1 text-right">${tax.toFixed(2)}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="px-2 py-1 font-bold bg-gray-50 dark:bg-dark-800">PROPINA</td>
                                                            <td className="px-2 py-1 text-right">$0.00</td>
                                                        </tr>
                                                        <tr className="border-t-2 border-gray-300 dark:border-dark-600">
                                                            <td className="px-2 py-1 font-bold bg-gray-100 dark:bg-dark-700 text-sm">VALOR TOTAL</td>
                                                            <td className="px-2 py-1 text-right font-bold text-sm">${total.toFixed(2)}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Client Data Form */}
                        <div className="md:w-1/3 space-y-4 border-l dark:border-dark-700 md:pl-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Datos del Cliente</h3>

                            {/* Consumidor Final Shortcut */}
                            <button
                                onClick={() => setBillingData({
                                    identification: '9999999999999',
                                    name: 'CONSUMIDOR FINAL',
                                    email: 'consumidor@final.com',
                                    address: 'S/N',
                                    phone: '9999999999',
                                    paymentMethod: '01'
                                })}
                                className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-dark-700 dark:hover:bg-dark-600 text-xs font-semibold text-gray-600 dark:text-gray-300 rounded border border-gray-300 dark:border-dark-600 transition-colors mb-2"
                            >
                                Usar "Consumidor Final"
                            </button>

                            {/* Warning for CF > $50 */}
                            {billingData.identification === '9999999999999' && (billingOrder.items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0) > 50) && (
                                <div className="bg-yellow-50 text-yellow-800 text-xs p-2 rounded border border-yellow-200 mb-3 flex gap-2 items-start">
                                    <span>⚠️</span>
                                    <span>
                                        <strong>Normativa SRI:</strong> Facturas a Consumidor Final no deben superar los $50.00. Se recomienda ingresar datos reales.
                                    </span>
                                </div>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">RUC/CI</label>
                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                            {billingData.identification === '9999999999999' ? 'Consumidor Final' :
                                                billingData.identification.length === 10 ? 'Cédula' :
                                                    billingData.identification.length === 13 ? 'RUC' : 'Pasaporte/Otro'}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={billingData.identification}
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            setBillingData({ ...billingData, identification: val })
                                        }}
                                        maxLength={13}
                                        className={inputClass}
                                        placeholder="0999999999001"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">CLIENTE</label>
                                    <input
                                        type="text"
                                        value={billingData.name}
                                        onChange={e => setBillingData({ ...billingData, name: e.target.value.toUpperCase() })}
                                        className={inputClass}
                                        placeholder="NOMBRE DEL CLIENTE"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                                        Correo Electrónico <span className="text-gray-400 normal-case font-normal">(opcional)</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={billingData.email}
                                        onChange={e => setBillingData({ ...billingData, email: e.target.value })}
                                        className={inputClass}
                                        placeholder="cliente@email.com (puede dejarlo vacío)"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-0.5">💡 Si no ingresa email, podrá imprimir la factura para entregar físicamente.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Dirección</label>
                                    <textarea
                                        value={billingData.address}
                                        onChange={e => setBillingData({ ...billingData, address: e.target.value })}
                                        className={inputClass}
                                        rows={2}
                                        placeholder="Dirección del cliente"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono</label>
                                        <input
                                            type="tel"
                                            value={billingData.phone}
                                            onChange={e => setBillingData({ ...billingData, phone: e.target.value })}
                                            className={inputClass}
                                            placeholder="0999999999"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Forma Pago</label>
                                        <select
                                            value={billingData.paymentMethod}
                                            onChange={e => setBillingData({ ...billingData, paymentMethod: e.target.value })}
                                            className={inputClass}
                                        >
                                            <option value="01">01 - SIN UTILIZACION DEL SISTEMA FINANCIERO</option>
                                            <option value="20">20 - OTROS CON UTILIZACION DEL SISTEMA FINANCIERO</option>
                                            <option value="19">19 - TARJETA DE CREDITO</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col gap-2">
                                <button
                                    onClick={handleProcessBilling}
                                    disabled={!billingData.identification || !billingData.name}
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>📩</span> Emitir Documento
                                </button>

                                <button
                                    onClick={() => setIsBillingModalOpen(false)}
                                    className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold dark:text-light-background">Gestión de Pedidos</h1>

                <div className="flex bg-gray-100 dark:bg-dark-800 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white dark:bg-dark-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        En Curso
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white dark:bg-dark-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    >
                        Historial
                    </button>
                </div>

                <button onClick={() => handleOpenModal(null)} className="flex items-center bg-blue-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><PlusIcon className="w-5 h-5 mr-1" /> Añadir Pedido</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredOrders.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                        {activeTab === 'active' ? 'No hay pedidos en curso.' : 'No hay historial de pedidos completados.'}
                    </div>
                ) : (
                    filteredOrders
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onEdit={() => handleOpenModal(order)}
                                onDelete={() => handleDeleteOrder(order.id)}
                                onStatusChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                                onBilling={() => handleOpenBilling(order)}
                            />
                        ))
                )}
            </div>
        </div>
    );
};

export default OrderManagement;