/**
 * @file OrderCard.tsx
 * @description Componente visual para mostrar los detalles de una orden.
 * Este archivo pertenece al módulo de órdenes (orders).
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Order, OrderItem, OrderStatus } from '../types/order.types';
import { EditIcon, TrashIcon, ClockIcon } from '../../../components/ui/Icons';

/**
 * Parsea el nombre del cliente para extraer nombre limpio y origen (WhatsApp/Web)
 * Formato esperado: "nombre [WhatsApp: número]" o "nombre [Web]" o solo "nombre"
 */
function parseCustomerInfo(customerName: string): { name: string; source: 'whatsapp' | 'web' | null; phone?: string } {
    if (!customerName) return { name: '', source: null };

    // Patrón para WhatsApp: "nombre [WhatsApp: 0999...]"
    const whatsappMatch = customerName.match(/^(.+?)\s*\[WhatsApp:\s*(\d+).*?\]$/i);
    if (whatsappMatch) {
        return {
            name: whatsappMatch[1].trim(),
            source: 'whatsapp',
            phone: whatsappMatch[2]
        };
    }

    // Patrón para Web: "nombre [Web]"
    const webMatch = customerName.match(/^(.+?)\s*\[Web\]$/i);
    if (webMatch) {
        return {
            name: webMatch[1].trim(),
            source: 'web'
        };
    }

    return { name: customerName, source: null };
}

/**
 * Formatea el número de orden para mejor visualización
 */
function formatOrderNumber(orderNumber?: string, fallbackId?: string): string {
    const value = orderNumber || fallbackId || '';

    // Si es un número puro, mostrarlo con padding
    if (/^\d+$/.test(value)) {
        return value.padStart(3, '0');
    }

    // Si es alfanumérico largo (como un hash), mostrar últimos 4 caracteres en mayúscula
    if (value.length > 6) {
        return value.slice(-4).toUpperCase();
    }

    return value.toUpperCase();
}

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
    // Parsear información del cliente (memo para evitar recálculos)
    const customerInfo = useMemo(() => parseCustomerInfo(order.customerName), [order.customerName]);
    const displayOrderNumber = useMemo(() => formatOrderNumber(order.orderNumber, order.id.slice(-6)), [order.orderNumber, order.id]);

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
                    <div className="min-w-0 flex-1">
                        {/* Número de orden formateado */}
                        <h3 className="font-black text-gray-900 dark:text-white leading-tight text-base md:text-lg">
                            #{displayOrderNumber}
                        </h3>
                        {/* Nombre del cliente con indicador de origen */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {customerInfo.source === 'whatsapp' && (
                                <span className="flex-shrink-0 w-4 h-4 md:w-5 md:h-5 bg-green-500 rounded-full flex items-center justify-center" title={`WhatsApp: ${customerInfo.phone || ''}`}>
                                    <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                </span>
                            )}
                            {customerInfo.source === 'web' && (
                                <span className="flex-shrink-0 w-4 h-4 md:w-5 md:h-5 bg-blue-500 rounded-full flex items-center justify-center" title="Pedido Web">
                                    <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                    </svg>
                                </span>
                            )}
                            <p className="text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400 truncate">
                                {customerInfo.name}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                        <span className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{timeAgo}</span>
                        {formattedDate && <span className="text-[8px] md:text-[9px] text-gray-300 dark:text-gray-600 font-bold">{formattedDate}</span>}
                    </div>
                </div>

                <div className="flex justify-between items-center mb-3 md:mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] md:text-[10px] font-black bg-gray-100 dark:bg-dark-900 px-2 py-1 rounded-lg text-gray-500 dark:text-gray-400 uppercase tracking-widest">{order.type}</span>
                        
                        {/* Tiempo Estimado (Solo si es Nuevo y tiene tiempo seteado) */}
                        {order.status === OrderStatus.New && order.estimatedMinutes && (
                            <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg animate-pulse">
                                <ClockIcon className="w-3 h-3" />
                                <span className="text-[10px] font-black uppercase tracking-tighter">{order.estimatedMinutes}' MIN</span>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleStatusClick} 
                        disabled={order.status === OrderStatus.Completed}
                        className={`text-[9px] md:text-[10px] font-black py-1 px-3 rounded-xl uppercase tracking-widest transition-all ${order.status !== OrderStatus.Completed ? 'active:scale-95' : 'cursor-default'} ${getStatusBadgeColor()}`}
                    >
                        {order.status === OrderStatus.Ready ? '¡LISTO PARA COBRO!' : order.status}
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
                    {(order.status !== OrderStatus.Completed || 
                      (userRoleName?.toLowerCase() === 'administrador' || userRoleName?.toLowerCase() === 'admin')) && (
                        <button onClick={onDelete} className="p-2 md:p-2.5 bg-gray-100 dark:bg-dark-700 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all active:scale-95">
                            <TrashIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
