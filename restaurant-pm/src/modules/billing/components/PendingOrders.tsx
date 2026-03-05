/**
 * @file PendingOrders.tsx
 * @description Lista de órdenes pendientes de facturación
 */

import React from 'react';
import { MenuItem } from '../../menu/types/menu.types';
import { Order } from '../../orders/types/order.types';
import { FileTextIcon } from '../../../components/ui/Icons';

interface PendingOrdersProps {
    orders: Order[];
    menuItems: MenuItem[];
    onSelectOrder: (order: Order) => void;
}

const PendingOrders: React.FC<PendingOrdersProps> = ({ orders, menuItems, onSelectOrder }) => {
    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-dark-700 rounded-full flex items-center justify-center mb-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-500 opacity-20" />
                </div>
                <h3 className="text-gray-800 dark:text-gray-200 font-bold mb-1">Sin órdenes pendientes</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">Todas las órdenes completadas han sido facturadas o no hay actividad.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map(order => (
                <div
                    key={order.id}
                    onClick={() => onSelectOrder(order)}
                    className="group bg-white dark:bg-dark-800 border border-gray-100 dark:border-dark-700 rounded-2xl p-4 hover:shadow-xl hover:shadow-primary-500/10 hover:border-primary-300 dark:hover:border-primary-700 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
                >
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                            <div className="text-[10px] font-bold text-primary-600 uppercase tracking-wider mb-1">Orden #{order.orderNumber || order.id.slice(-4)}</div>
                            <h3 className="font-bold text-gray-800 dark:text-white truncate max-w-[150px]">{order.customerName}</h3>
                        </div>
                        <div className="bg-primary-50 dark:bg-primary-900/20 p-2 rounded-xl text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                            <FileTextIcon className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="space-y-2 mb-4 relative z-10">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Items:</span>
                            <span className="font-medium text-gray-700 dark:text-gray-200">{order.items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Total:</span>
                            <span className="font-bold text-primary-600">${order.items.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-50 dark:border-dark-700 relative z-10">
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 rounded-full font-medium">
                            {order.type}
                        </span>
                        <div className="flex-1"></div>
                        <span className="text-[10px] text-primary-600 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Facturar <ArrowRightIcon className="w-3 h-3" />
                        </span>
                    </div>

                    {/* Decorative Background Element */}
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary-500/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                </div>
            ))}
        </div>
    );
};

// Helper Icons needed within this component
const CheckCircleIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ArrowRightIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" />
    </svg>
);

export default PendingOrders;
