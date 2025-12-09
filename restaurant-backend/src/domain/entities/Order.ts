/**
 * @file Order.ts
 * @description Entidad de dominio que representa una orden/pedido del restaurante
 * 
 * @purpose
 * Define la estructura de datos de una orden incluyendo items, cliente, tipo de servicio,
 * estado y marca de facturación. Incluye enums y tipos auxiliares (OrderStatus, OrderItem).
 * 
 * @connections
 * - Usado por: IOrderRepository (domain/repositories)
 * - Usado por: MongoOrderRepository (infrastructure/repositories)
 * - Usado por: OrderSchema (infrastructure/database/schemas)
 * - Usado por: CreateOrder, GetOrders, UpdateOrder, DeleteOrder (application/use-cases)
 * - Usado por: orderRoutes (infrastructure/web/routes)
 * - Usado por: Bill entity (para generar facturas de órdenes)
 * 
 * @layer Domain - Entidad pura sin dependencias externas
 */

export enum OrderStatus {
    New = 'Nuevo',
    Completed = 'Completado',
}

export interface OrderItem {
    name: string;
    quantity: number;
    price?: number;
}

export interface Order {
    id: string;
    customerName: string;
    items: OrderItem[];
    type: 'En Local' | 'Delivery' | 'Para Llevar';
    status: OrderStatus;
    createdAt: Date;
    billed?: boolean;
}
