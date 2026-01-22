import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Order, OrderItem, OrderStatus, SetState, MenuItem } from '../types';
import Modal from './Modal';
import { PlusIcon, EditIcon, TrashIcon } from './Icons';

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
            case OrderStatus.Completed: return 'border-green-500 dark:border-green-400';
            default: return 'border-gray-300 dark:border-gray-600';
        }
    };

    const getStatusBadgeColor = () => {
        switch (order.status) {
            case OrderStatus.New: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
            case OrderStatus.Completed: return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-dark-600 dark:text-gray-300';
        }
    }

    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        const updateTimer = () => {
            if (!order.createdAt || isNaN(order.createdAt)) {
                setTimeAgo('');
                return;
            }
            const minutes = Math.floor((Date.now() - order.createdAt) / 60000);
            if (minutes < 1) setTimeAgo('Ahora');
            else if (minutes < 60) setTimeAgo(`hace ${minutes} min`);
            else setTimeAgo(`hace ${Math.floor(minutes / 60)}h`);
        };
        updateTimer();
        const intervalId = setInterval(updateTimer, 30000);
        return () => clearInterval(intervalId);
    }, [order.createdAt]);

    const formattedDate = (order.createdAt && !isNaN(order.createdAt))
        ? new Date(order.createdAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })
        : '';

    const handleStatusClick = () => {
        onStatusChange(order.status === OrderStatus.Completed ? OrderStatus.New : OrderStatus.Completed);
    };

    return (
        <div className={`bg-white dark:bg-dark-800 p-4 rounded-lg shadow-md border-l-4 ${getStatusColor()} flex flex-col justify-between`}>
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">#{order.id.slice(-6)} - {order.customerName}</h3>
                    <div className="flex flex-col items-end">
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{timeAgo}</span>
                        {formattedDate && <span className="text-xs text-gray-400 dark:text-gray-500">{formattedDate}</span>}
                    </div>
                </div>
                <div className="flex justify-between items-center mb-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold">{order.type}</p>
                    <button onClick={handleStatusClick} className={`text-xs font-bold py-1 px-3 rounded-full ${getStatusBadgeColor()}`}>
                        {order.status}
                    </button>
                </div>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {order.items.map((item: OrderItem, index: number) => (
                        <li key={index} className="flex justify-between"><span>{item.name}</span><span className="font-semibold">x{item.quantity}</span></li>
                    ))}
                </ul>
            </div>
            <div className="mt-4 pt-3 border-t dark:border-dark-700 flex justify-end space-x-4">
                <button onClick={onEdit} className="flex items-center text-sm text-blue-600 dark:text-blue-400"><EditIcon className="w-4 h-4 mr-1" />Editar</button>
                <button onClick={onDelete} className="flex items-center text-sm text-red-600 dark:text-red-400"><TrashIcon className="w-4 h-4 mr-1" />Eliminar</button>
            </div>
        </div>
    );
};

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
    const [items, setItems] = useState<OrderItem[]>([{ name: '', quantity: 1 }]);
    const isEditing = order !== null;
    const availableItems = menuItems.filter(item => item.available);

    useEffect(() => {
        if (isOpen) {
            if (order) {
                setCustomerName(order.customerName);
                setType(order.type);
                setStatus(order.status);
                setItems(order.items.length > 0 ? order.items : [{ name: '', quantity: 1 }]);
            } else {
                setCustomerName('');
                setType('En Local');
                setStatus(OrderStatus.New);
                setItems([{ name: availableItems[0]?.name || '', quantity: 1 }]);
            }
        }
    }, [isOpen, order, menuItems]);

    const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
        const newItems = [...items];
        if (field === 'quantity') newItems[index][field] = parseInt(value as string, 10) || 1;
        else (newItems[index] as any)[field] = value;
        setItems(newItems);
    };
    const handleAddItem = () => setItems([...items, { name: availableItems[0]?.name || '', quantity: 1 }]);
    const handleRemoveItem = (index: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalItems = items.filter(item => item.name.trim() !== '' && item.quantity > 0);
        if (!customerName || finalItems.length === 0) return alert('Por favor, complete el nombre y al menos un ítem.');

        const newOrder: Order = {
            id: order?.id || Date.now().toString(),
            customerName,
            type,
            status,
            items: finalItems,
            createdAt: order?.createdAt || Date.now(),
        };
        onSave(newOrder);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Pedido' : 'Crear Pedido'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required placeholder="Nombre Cliente / Mesa" className={inputClass} />
                <select value={type} onChange={e => setType(e.target.value as any)} className={inputClass}>
                    <option>En Local</option><option>Delivery</option><option>Para Llevar</option>
                </select>
                <select value={status} onChange={e => setStatus(e.target.value as any)} className={inputClass}>
                    <option value={OrderStatus.New}>{OrderStatus.New}</option><option value={OrderStatus.Completed}>{OrderStatus.Completed}</option>
                </select>
                <div>
                    <label className="block text-sm font-medium dark:text-gray-300 mb-2">Ítems</label>
                    <div className="space-y-2">
                        {items.map((item, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <select value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} className={inputClass} required>
                                    <option value="" disabled>Seleccionar plato...</option>
                                    {availableItems.map(menuItem => <option key={menuItem.id} value={menuItem.name}>{menuItem.name}</option>)}
                                </select>
                                <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} min="1" className={`w-20 ${inputClass}`} />
                                <button type="button" onClick={() => handleRemoveItem(index)} disabled={items.length === 1} className="text-red-500 disabled:text-gray-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={handleAddItem} className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center font-medium" disabled={availableItems.length === 0}><PlusIcon className="w-4 h-4 mr-1" /> Añadir Ítem</button>
                </div>
                <div className="flex justify-end pt-4">
                    <button type="button" onClick={onClose} className="mr-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-200 font-medium transition-colors">Cancelar</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors">{isEditing ? 'Guardar' : 'Crear'}</button>
                </div>
            </form>
        </Modal>
    );
};

// --- Main Order Management Component ---
const OrderManagement: React.FC<OrderManagementProps> = ({ orders, setOrders, menuItems }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);

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
                const created = await api.orders.create(orderToSave);
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

    return (
        <div>
            <OrderFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveOrder} order={editingOrder} menuItems={menuItems} />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold dark:text-light-background">Gestión de Pedidos</h1>
                <button onClick={() => handleOpenModal(null)} className="flex items-center bg-blue-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><PlusIcon className="w-5 h-5 mr-1" /> Añadir Pedido</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...orders]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map(order => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onEdit={() => handleOpenModal(order)}
                            onDelete={() => handleDeleteOrder(order.id)}
                            onStatusChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                        />
                    ))}
            </div>
        </div>
    );
};

export default OrderManagement;