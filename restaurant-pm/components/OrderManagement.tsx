import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Order, OrderItem, OrderStatus, SetState, MenuItem } from '../types';
import Modal from './Modal';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, MinusIcon, ClipboardListIcon } from './Icons';
import { OrderNumberGenerator } from '../utils/orderNumberGenerator';

interface OrderManagementProps {
    orders: Order[];
    setOrders: SetState<Order[]>;
    menuItems: MenuItem[];
}

const inputClass = "w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all dark:border-gray-600 dark:bg-gray-700/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:focus:ring-blue-500/20";

// --- Order Card Component ---
const OrderCard: React.FC<{ order: Order; onEdit: () => void; onDelete: () => void; onStatusChange: (newStatus: OrderStatus) => void; }> = ({ order, onEdit, onDelete, onStatusChange }) => {
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

            <div className="pt-2 border-t dark:border-dark-700 flex justify-end space-x-4">
                <button onClick={onEdit} className="flex items-center text-sm text-blue-600 dark:text-blue-400"><EditIcon className="w-4 h-4 mr-1" />Editar</button>
                <button onClick={onDelete} className="flex items-center text-sm text-red-600 dark:text-red-400"><TrashIcon className="w-4 h-4 mr-1" />Eliminar</button>
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
    const [items, setItems] = useState<OrderItem[]>([]);

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
                    if (item.price !== undefined) return item;
                    const menuItem = menuItems.find(m => m.name === item.name);
                    return { ...item, price: menuItem ? menuItem.price : 0 };
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
        const existingItemIndex = items.findIndex(i => i.name === menuItem.name);
        if (existingItemIndex >= 0) {
            const newItems = [...items];
            newItems[existingItemIndex].quantity += 1;
            setItems(newItems);
        } else {
            setItems([...items, { name: menuItem.name, quantity: 1, price: menuItem.price, prepared: false }]);
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

        setItems([...items, { name, quantity: 1, price, prepared: false }]);
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

        const newOrder: Order = {
            id: order?.id || Date.now().toString(),
            customerName,
            type,
            status: finalStatus,
            items,
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
                                <div key={index} className="flex items-center gap-2 p-2 bg-white dark:bg-dark-700 rounded-lg shadow-sm border border-gray-100 dark:border-dark-600 animate-in fade-in slide-in-from-right-2 duration-200">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{item.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">${item.price?.toFixed(2)}</div>
                                    </div>

                                    <div className="flex items-center bg-gray-100 dark:bg-dark-800 rounded-lg p-0.5">
                                        <button
                                            onClick={() => handleUpdateQuantity(index, -1)}
                                            className="w-7 h-7 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-md transition-colors"
                                        >
                                            <MinusIcon className="w-3 h-3" />
                                        </button>
                                        <span className="w-8 text-center text-xs font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                                        <button
                                            onClick={() => handleUpdateQuantity(index, 1)}
                                            className="w-7 h-7 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                        >
                                            <PlusIcon className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="w-16 text-right font-bold text-sm text-gray-700 dark:text-gray-300">
                                        ${((item.price || 0) * item.quantity).toFixed(2)}
                                    </div>

                                    <button
                                        onClick={() => handleRemoveItem(index)}
                                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
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
                const updated = await api.orders.update(orderToSave.id, orderToSave);
                setOrders(prevOrders => prevOrders.map(o => o.id === orderToSave.id ? updated : o));
            } else {
                // Remove the temporary ID generated by the form if needed,
                // but the backend usually ignores validation of ID on create or overwrites it.
                // We'll send it as is, but rely on the returned object which has the real DB ID.
                const orderWithNumber = {
                    ...orderToSave,
                    orderNumber: orderToSave.orderNumber || OrderNumberGenerator.getNextOrderNumber()
                };
                const created = await api.orders.create(orderWithNumber);

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
                await api.orders.delete(orderId);
                setOrders(prev => prev.filter(o => o.id !== orderId));
            } catch (error) {
                console.error('Failed to delete order:', error);
                alert('Error al eliminar el pedido.');
            }
        }
    };

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        try {
            const updated = await api.orders.update(orderId, { status: newStatus });
            setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Error al actualizar el estado.');
        }
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
                            />
                        ))
                )}
            </div>
        </div>
    );
};

export default OrderManagement;