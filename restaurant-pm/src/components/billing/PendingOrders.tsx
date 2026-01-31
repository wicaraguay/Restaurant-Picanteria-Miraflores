/**
 * @file PendingOrders.tsx
 * @description Lista de órdenes pendientes de facturación
 * 
 * @purpose
 * Muestra órdenes completadas que aún no han sido facturadas.
 * Permite seleccionar una orden para emitir factura.
 * 
 * @connections
 * - Usado por: BillingManagement
 * - Usa: types.ts (Order, MenuItem)
 * 
 * @layer Components - UI
 */

import React from 'react';
import { Order, MenuItem } from '../../types';
import { FileTextIcon } from '../Icons';

interface PendingOrdersProps {
    orders: Order[];
    menuItems: MenuItem[];
    onSelectOrder: (order: Order) => void;
}

const PendingOrders: React.FC<PendingOrdersProps> = ({ orders, menuItems, onSelectOrder }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    if (orders.length === 0) {
        return (
            <p className="text-gray-500 dark:text-gray-400 py-4 text-center">
                No hay pedidos por facturar.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {orders.map(order => {
                const total = order.items.reduce((acc, i) => {
                    const menuItem = menuItems.find(m => m.name === i.name);
                    return acc + (menuItem?.price || 0) * i.quantity;
                }, 0);

                return (
                    <div
                        key={order.id}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white transition-colors dark:border-dark-700 dark:bg-dark-700/30 dark:hover:bg-dark-700"
                    >
                        <div className="mb-3 sm:mb-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-white">
                                    #{order.id.slice(-6)}
                                </span>
                                <span className="text-gray-500">- {order.customerName}</span>
                            </div>
                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                                {formatCurrency(total)}
                            </p>
                        </div>
                        <button
                            onClick={() => onSelectOrder(order)}
                            className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center shadow-sm"
                        >
                            <FileTextIcon className="w-4 h-4 mr-2" /> Emitir Factura
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default PendingOrders;
