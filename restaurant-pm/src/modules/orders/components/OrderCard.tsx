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
    onPayment?: (order: Order) => void;
    onBilling?: () => void;
    userRoleName?: string;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onEdit, onDelete, onStatusChange, onPayment, onBilling, userRoleName }) => {
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
        if (order.status === OrderStatus.Completed) return; // Prevent clicking status badge in History
        
        if (order.status === OrderStatus.New) {
            onStatusChange(OrderStatus.Ready);
        } else if (order.status === OrderStatus.Ready) {
            if (onPayment) onPayment(order);
            else onStatusChange(OrderStatus.Completed);
        } else {
            onStatusChange(OrderStatus.New);
        }
    };

    const total = order.items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

    return (
        <div className={`bg-white dark:bg-dark-800 p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-lg border-2 ${getStatusColor()} flex flex-col justify-between transition-all hover:shadow-xl hover:-translate-y-1`}>
            <div>
                <div className="flex justify-between items-start mb-3 md:mb-4 gap-2">
                    <div>
                        <h3 className="font-black text-gray-900 dark:text-white leading-tight uppercase tracking-tighter text-sm md:text-base">#{order.orderNumber || order.id.slice(-6)}</h3>
                        <p className="text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400 truncate max-w-[120px] md:max-w-[150px]">{order.customerName}</p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                        <span className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{timeAgo}</span>
                        {formattedDate && <span className="text-[8px] md:text-[9px] text-gray-300 dark:text-gray-600 font-bold">{formattedDate}</span>}
                    </div>
                </div>

                <div className="flex justify-between items-center mb-3 md:mb-4">
                    <span className="text-[9px] md:text-[10px] font-black bg-gray-100 dark:bg-dark-900 px-2 py-1 rounded-lg text-gray-500 dark:text-gray-400 uppercase tracking-widest">{order.type}</span>
                    <button 
                        onClick={handleStatusClick} 
                        disabled={order.status === OrderStatus.Completed}
                        className={`text-[9px] md:text-[10px] font-black py-1 px-3 rounded-xl uppercase tracking-widest transition-all ${order.status !== OrderStatus.Completed ? 'active:scale-95' : 'cursor-default'} ${getStatusBadgeColor()}`}
                    >
                        {order.status}
                    </button>
                </div>

                {order.status === OrderStatus.Completed && order.billingType && (
                    <div className="mb-4">
                        <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest ${
                            order.billingType === 'Factura' ? 'border-green-200 text-green-700 bg-green-50' :
                            order.billingType === 'Consumidor Final' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                            'border-gray-200 text-gray-600 bg-gray-50'
                        }`}>
                            {order.billingType}
                        </span>
                    </div>
                )}

                <div className="space-y-1.5 md:space-y-2 mb-4 md:mb-6">
                    {order.items.map((item: OrderItem, index: number) => (
                        <div key={index} className="flex justify-between items-center text-[11px] md:text-xs">
                            <span className="text-gray-600 dark:text-gray-400 font-medium truncate max-w-[70%]">{item.name}</span>
                            <span className="font-black bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[9px] md:text-[10px]">x{item.quantity}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-3 md:pt-4 border-t-2 border-dashed border-gray-100 dark:border-dark-700">
                <div className="flex justify-between items-end mb-3 md:mb-4">
                    <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
                    <span className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tighter">${total.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-2">
                    {order.status === OrderStatus.Ready && onBilling && (
                        <button
                            onClick={onBilling}
                            className="flex-1 flex items-center justify-center gap-2 py-2 md:py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                        >
                            <span>🧾</span> Pagar / Facturar
                        </button>
                    )}
                    {order.status !== OrderStatus.Completed && (
                        <button onClick={onEdit} className="p-2 md:p-2.5 bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 rounded-xl md:rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-all active:scale-95">
                            <EditIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                    )}
                    {(order.status !== OrderStatus.Completed || userRoleName === 'Administrador') && (
                        <button onClick={onDelete} className="p-2 md:p-2.5 bg-gray-100 dark:bg-dark-700 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all active:scale-95">
                            <TrashIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
