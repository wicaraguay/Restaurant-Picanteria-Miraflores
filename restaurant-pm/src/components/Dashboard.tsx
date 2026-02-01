import React from 'react';
import { Order, Reservation, OrderStatus } from '../types';
import { AnalyticsDashboard } from './analytics/AnalyticsDashboard';

interface DashboardProps {
    orders: Order[];
    reservations: Reservation[];
}

const Card = ({ title, children, className = '' }: { title: string, children?: React.ReactNode, className?: string }) => (
    <div className={`bg-white dark:bg-dark-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 ${className}`}>
        <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-light-background">{title}</h2>
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
                    <div className="absolute right-0 top-0 p-4 opacity-10">
                        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <p className="text-5xl font-bold text-blue-600 dark:text-blue-400 mt-2">{activeOrders.length}</p>
                    <p className="text-sm text-gray-500 mt-2">En preparación o servicio</p>
                </Card>
                <Card title="Reservas Pendientes" className="relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-4 opacity-10">
                        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    </div>
                    <p className="text-5xl font-bold text-yellow-500 dark:text-yellow-400 mt-2">{pendingReservations.length}</p>
                    <p className="text-sm text-gray-500 mt-2">Para hoy</p>
                </Card>
            </div>

            <div>
                <Card title="Últimos Pedidos">
                    {orders.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No hay actividad reciente.</p>
                    ) : (
                        <div className="space-y-3">
                            {orders.slice(0, 5).map(order => (
                                <div key={order.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 dark:bg-dark-700/50 rounded-lg">
                                    <div className="flex justify-between items-center sm:block mb-2 sm:mb-0">
                                        <span className="font-medium text-gray-900 dark:text-white block">#{order.orderNumber || order.id.slice(-6)} - {order.customerName}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 block sm:mt-1">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block
                                            ${order.status === OrderStatus.New ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}
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