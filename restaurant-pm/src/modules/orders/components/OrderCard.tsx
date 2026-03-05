/**
 * @file OrderCard.tsx
 * @description Componente visual para mostrar los detalles de una orden.
 * Este archivo pertenece al módulo de órdenes (orders).
 */
import React, { useState, useEffect } from 'react';
import { Order, OrderItem, OrderStatus } from '../types/order.types';
import { EditIcon, TrashIcon } from '../../../components/ui/Icons';

interface OrderCardProps {
    order: Order;
    onEdit: () => void;
    onDelete: () => void;
    onStatusChange: (newStatus: OrderStatus) => void;
    onBilling?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onEdit, onDelete, onStatusChange, onBilling }) => {
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
                {order.status === OrderStatus.Completed && onBilling && (
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
