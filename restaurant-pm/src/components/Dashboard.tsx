import React from 'react';
import { Reservation } from '../modules/customers/types/customer.types';
import { Order, OrderStatus } from '../modules/orders/types/order.types';
import { AnalyticsDashboard } from './analytics/AnalyticsDashboard';

interface DashboardProps {
    orders: Order[];
    reservations: Reservation[];
}

const Card = ({ title, children, className = '' }: { title: string, children?: React.ReactNode, className?: string }) => (
    <div className={`glass-panel p-6 transition-all duration-300 hover:shadow-lg animate-slide-up ${className}`}>
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white tracking-tight">{title}</h2>
        {children}
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ orders, reservations }) => {
    const activeOrders = orders.filter(o => o.status !== OrderStatus.Completed);
    const pendingReservations = reservations.filter(r => r.status === 'Pendiente');

    return (
        <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-light-background hidden lg:block">Dashboard</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <Card title="Pedidos Activos" className="relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 text-blue-500/10">
                        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <div className="relative z-10">
                        <p className="text-6xl font-black text-blue-600 dark:text-blue-400 mt-2 filter drop-shadow-sm">{activeOrders.length}</p>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-wider">En preparación o servicio</p>
                    </div>
                </Card>
                <Card title="Reservas Pendientes" className="relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 text-yellow-500/10">
                        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    </div>
                    <div className="relative z-10">
                        <p className="text-6xl font-black text-yellow-500 dark:text-yellow-400 mt-2 filter drop-shadow-sm">{pendingReservations.length}</p>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-wider">Reservas para hoy</p>
                    </div>
                </Card>
            </div>

            <div>
                <Card title="Últimos Pedidos">
                    {orders.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No hay actividad reciente.</p>
                    ) : (
                        <div className="space-y-3">
                            {orders.slice(0, 5).map((order, idx) => (
                                <div 
                                    key={order.id} 
                                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-gray-50/50 dark:bg-dark-700/30 rounded-xl border border-gray-100 dark:border-dark-700/50 transition-all hover:bg-white dark:hover:bg-dark-700/50 hover:shadow-md animate-slide-up"
                                    style={{ animationDelay: `${idx * 0.1}s` }}
                                >
                                    <div className="flex justify-between items-center sm:block mb-2 sm:mb-0">
                                        <span className="font-bold text-gray-900 dark:text-white block text-lg">#{order.orderNumber || order.id.slice(-6)}</span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400 block sm:mt-1 font-medium">{order.customerName}</span>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider
                                            ${order.status === OrderStatus.New ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 
                                              order.status === OrderStatus.Ready ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}
                                        `}>{order.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Analytics Section */}
            <div>
                <AnalyticsDashboard />
            </div>
        </div>
    );
};

export default Dashboard;
