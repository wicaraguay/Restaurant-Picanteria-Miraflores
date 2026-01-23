import React from 'react';
import { api } from '../api';
import { Order, OrderItem, OrderStatus, SetState } from '../types';

interface KitchenManagementProps {
    orders: Order[];
    setOrders: SetState<Order[]>;
}

const KitchenOrderCard: React.FC<{ order: Order; onMarkReady: (id: string, items: OrderItem[]) => void }> = ({ order, onMarkReady }) => {
    return (
        <div className={`p-4 rounded-lg shadow-md bg-blue-100 dark:bg-blue-900/30`}>
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">#{order.orderNumber || order.id.slice(-6)} - {order.customerName}</h3>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-300">{order.status}</span>
            </div>
            <ul className="space-y-1 text-sm list-inside text-gray-700 dark:text-gray-300 mb-4">
                {order.items.map((item: OrderItem, index: number) => (
                    <li key={index} className={`${item.prepared ? 'text-gray-400 line-through decoration-2 decoration-gray-400 bg-gray-50 p-1 rounded' : 'font-extrabold text-gray-900 dark:text-white text-lg bg-yellow-50 dark:bg-yellow-900/20 p-1 rounded border-l-4 border-yellow-500'}`}>
                        <span>{item.quantity}x</span> {item.name}
                        {item.prepared && <span className="ml-2 text-xs text-gray-500 font-normal no-underline">(Listo)</span>}
                        {!item.prepared && <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400 font-bold no-underline uppercase badge-pulse fa-fade">← PREPARAR</span>}
                    </li>
                ))}
            </ul>
            <button
                onClick={() => onMarkReady(order.id, order.items)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors shadow-sm"
            >
                Marcar como Listo
            </button>
        </div>
    );
};

const Card = ({ title, children }: { title: string, children?: React.ReactNode }) => (
    <div className="bg-white dark:bg-dark-800 p-4 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-light-background">{title}</h2>
        {children}
    </div>
);

const KitchenManagement: React.FC<KitchenManagementProps> = ({ orders, setOrders }) => {
    const kitchenOrders = orders
        .filter(o => o.status === OrderStatus.New)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const handleMarkReady = async (orderId: string, currentItems: OrderItem[]) => {
        try {
            // Mark all current items as prepared when completing the order
            const updatedItems = currentItems.map(item => ({ ...item, prepared: true }));
            const updated = await api.orders.update(orderId, {
                status: OrderStatus.Ready,
                items: updatedItems
            });
            setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Error al actualizar el estado.');
        }
    };

    const renderContent = () => {
        if (kitchenOrders.length === 0) return <p className="text-gray-500 dark:text-gray-400">No hay pedidos pendientes.</p>;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {kitchenOrders.map(order => (
                    <KitchenOrderCard
                        key={order.id}
                        order={order}
                        onMarkReady={handleMarkReady}
                    />
                ))}
            </div>
        );
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-light-background mb-6">Gestión de Cocina</h1>
            <Card title="Comandas Activas (Nuevas)">
                {renderContent()}
            </Card>
        </div>
    );
};

export default KitchenManagement;
