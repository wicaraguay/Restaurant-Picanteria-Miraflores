import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Order, OrderItem, OrderStatus, SetState, MenuItem } from '../types';
import Modal from './Modal';
import { PlusIcon, EditIcon, TrashIcon } from './Icons';
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
    const [customerName, setCustomerName] = useState('');
    const [type, setType] = useState<'En Local' | 'Delivery' | 'Para Llevar'>('En Local');
    const [status, setStatus] = useState<OrderStatus>(OrderStatus.New);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [manualItems, setManualItems] = useState<boolean[]>([]); // Track which rows are manual
    const isEditing = order !== null;
    const availableItems = menuItems.filter(item => item.available);

    useEffect(() => {
        if (isOpen) {
            if (order) {
                setCustomerName(order.customerName);
                setType(order.type);
                setStatus(order.status);
                // Ensure items have price, if not fetch from menu
                const enrichedItems = order.items.map(item => {
                    if (item.price !== undefined) return item;
                    const menuItem = menuItems.find(m => m.name === item.name);
                    return { ...item, price: menuItem ? menuItem.price : 0 };
                });
                setItems(enrichedItems);

                // Determine manual state: if item name not in menu, it's manual
                setManualItems(enrichedItems.map(item => !menuItems.some(m => m.name === item.name)));
            } else {
                setCustomerName('');
                setType('En Local');
                setStatus(OrderStatus.New);
                setItems([{ name: availableItems[0]?.name || '', quantity: 1, price: availableItems[0]?.price || 0 }]);
                setManualItems([false]);
            }
        }
    }, [isOpen, order]); // Removed menuItems from dependency to avoid reset on menu update unless necessary

    const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
        const newItems = [...items];
        if (field === 'quantity') {
            const qty = parseInt(value as string, 10) || 1;
            newItems[index].quantity = qty;
        } else if (field === 'name') {
            newItems[index].name = value as string;
            // If NOT manual, update price from menu
            if (!manualItems[index]) {
                const menuItem = menuItems.find(m => m.name === value);
                newItems[index].price = menuItem ? menuItem.price : 0;
            }
        } else if (field === 'price') {
            // Only allow price update if manual (or if we want to allow overriding menu price too?)
            // For now, allow only if manual or force override
            newItems[index].price = parseFloat(value as string) || 0;
        }
        setItems(newItems);
    };

    const handleAddItem = () => {
        // Ensure we don't add empty items if one already exists empty? No, just add default first item
        const defaultItem = availableItems[0];
        setItems([...items, { name: defaultItem?.name || '', quantity: 1, price: defaultItem?.price || 0, prepared: false }]);
        setManualItems([...manualItems, false]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length > 0) {
            setItems(items.filter((_, i) => i !== index));
            setManualItems(manualItems.filter((_, i) => i !== index));
        }
    };

    const toggleManual = (index: number) => {
        const newManualStates = [...manualItems];
        newManualStates[index] = !newManualStates[index];
        setManualItems(newManualStates);

        // If switching to manual, clear name/price to avoid confusion? Or keep current?
        // Keep current is better UX usually.
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalItems = items.filter(item => item.name.trim() !== '' && item.quantity > 0);
        if (!customerName || finalItems.length === 0) return alert('Por favor, complete el nombre y añada al menos un ítem.');

        // Smart Status Logic: If any item is NOT prepared, the order should be New to alert kitchen.
        // Unless it's already New, or we explicitly want to keep it.
        // We auto-switch to New if there are unprepared items and the status was ready/completed.
        let finalStatus = status;
        const hasUnpreparedItems = finalItems.some(item => !item.prepared);

        if (hasUnpreparedItems && (status === OrderStatus.Ready || status === OrderStatus.Completed)) {
            finalStatus = OrderStatus.New;
        }

        const newOrder: Order = {
            id: order?.id || Date.now().toString(),
            customerName,
            type,
            status: finalStatus,
            items: finalItems,
            createdAt: order?.createdAt || new Date().toISOString(),
            orderNumber: order?.orderNumber,
        };
        onSave(newOrder);
        onClose();
    };

    const total = items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Pedido' : 'Crear Nuevo Pedido'} maxWidth="max-w-4xl">
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-6">

                {/* Left Column: Customer Details */}
                <div className="md:w-1/3 flex flex-col gap-4">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 border-b pb-2">Datos del Cliente</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre / Mesa</label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            required
                            placeholder="Ej. Mesa 5 o Juan Pérez"
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Pedido</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} className={inputClass}>
                            <option>En Local</option>
                            <option>Delivery</option>
                            <option>Para Llevar</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                        <select value={status} onChange={e => setStatus(e.target.value as any)} className={inputClass}>
                            <option value={OrderStatus.New}>{OrderStatus.New}</option>
                            <option value={OrderStatus.Ready}>{OrderStatus.Ready}</option>
                            <option value={OrderStatus.Completed}>{OrderStatus.Completed}</option>
                        </select>
                    </div>

                    {/* Total Display for Mobile / Small Screens */}
                    <div className="md:hidden mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="text-gray-600 dark:text-gray-300 text-sm">Total Estimado:</span>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${total.toFixed(2)}</div>
                    </div>
                </div>

                {/* Right Column: Order Items */}
                <div className="md:w-2/3 flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Detalle del Pedido</h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{items.length} ítems</span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 max-h-[400px] overflow-y-auto space-y-3">
                        {items.length === 0 && (
                            <div className="text-center py-8 text-gray-400 dark:text-gray-500 italic">
                                No hay ítems en el pedido.
                            </div>
                        )}
                        {items.map((item, index) => (
                            <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white dark:bg-dark-800 p-3 rounded-md shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex-grow w-full sm:w-auto flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => toggleManual(index)}
                                        className={`p-2 rounded text-xs font-bold transition-colors ${manualItems[index] ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                        title={manualItems[index] ? "Cambiar a menú" : "Cambiar a manual"}
                                    >
                                        {manualItems[index] ? '✏️' : '📋'}
                                    </button>

                                    {manualItems[index] ? (
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={e => handleItemChange(index, 'name', e.target.value)}
                                            placeholder="Nombre del ítem..."
                                            className={`${inputClass} !mb-0 flex-grow`}
                                            required
                                        />
                                    ) : (
                                        <select
                                            value={item.name}
                                            onChange={e => handleItemChange(index, 'name', e.target.value)}
                                            className={`${inputClass} !mb-0 flex-grow`}
                                            required
                                        >
                                            <option value="" disabled>Seleccionar plato...</option>
                                            {availableItems.map(menuItem => (
                                                <option key={menuItem.id} value={menuItem.name}>
                                                    {menuItem.name} - ${menuItem.price.toFixed(2)}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                    <div className="flex items-center">
                                        <span className="text-xs text-gray-500 mr-2 sm:hidden">Cant:</span>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                            min="1"
                                            className={`w-16 text-center ${inputClass} !mb-0`}
                                        />
                                    </div>
                                    <div className="text-right min-w-[80px]">
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">$</span>
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={e => handleItemChange(index, 'price', e.target.value)}
                                                readOnly={!manualItems[index]}
                                                className={`w-20 pl-5 pr-1 py-1 text-right text-sm rounded border ${manualItems[index] ? 'border-gray-300 bg-white' : 'border-transparent bg-transparent font-medium text-gray-700 dark:text-gray-300'} focus:outline-none`}
                                                step="0.01"
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all flex justify-center items-center gap-2 font-medium"
                        disabled={availableItems.length === 0}
                    >
                        <PlusIcon className="w-5 h-5" /> Añadir Otro Plato
                    </button>

                    <div className="mt-auto pt-4 border-t dark:border-gray-700 flex justify-end items-center gap-4">
                        <div className="text-right">
                            <span className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Total Total</span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">${total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </form>

            <div className="flex justify-end pt-6 gap-3 border-t mt-6 dark:border-gray-700">
                <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors font-medium">
                    Cancelar
                </button>
                <button
                    onClick={handleSubmit}
                    className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 font-medium flex items-center gap-2"
                >
                    {isEditing ? 'Guardar Cambios' : 'Crear Pedido'}
                </button>
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