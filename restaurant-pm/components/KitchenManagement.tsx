import React from 'react';
import { Order, OrderItem, OrderStatus } from '../types';

interface KitchenManagementProps {
    orders: Order[];
}

const KitchenOrderCard: React.FC<{ order: Order }> = ({ order }) => {
    return (
        <div className={`p-4 rounded-lg shadow-md bg-blue-100 dark:bg-blue-900/30`}>
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">#{order.id.slice(-6)} - {order.customerName}</h3>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-300">{order.status}</span>
            </div>
            <ul className="space-y-1 text-sm list-disc list-inside text-gray-700 dark:text-gray-300">
                {order.items.map((item: OrderItem, index: number) => (
                    <li key={index}>
                        <span className="font-semibold">{item.quantity}x</span> {item.name}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const Card = ({ title, children }: { title: string, children?: React.ReactNode }) => (
    <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-light-background">{title}</h2>
        {children}
    </div>
);

const KitchenManagement: React.FC<KitchenManagementProps> = ({ orders }) => {
    const kitchenOrders = orders
        .filter(o => o.status === OrderStatus.New)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const renderContent = () => {
        if (kitchenOrders.length === 0) return <p className="text-gray-500 dark:text-gray-400">No hay pedidos para preparar.</p>;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {kitchenOrders.map(order => <KitchenOrderCard key={order.id} order={order} />)}
            </div>
        );
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-light-background mb-6">Gestión de Cocina</h1>
            <Card title="Comandas Activas">
                {renderContent()}
            </Card>
        </div>
    );
};

export default KitchenManagement;
