/**
 * @file order.types.ts
 * @description Definiciones de tipos para el dominio de Pedidos (Orders).
 */

export enum OrderStatus {
    New = 'Nuevo',
    Ready = 'Listo',
    Completed = 'Completado',
}

export interface OrderItem {
    name: string;
    quantity: number;
    price?: number;
    prepared?: boolean;
}

export interface Order {
    id: string;
    customerName: string;
    items: OrderItem[];
    type: 'En Local' | 'Delivery' | 'Para Llevar';
    status: OrderStatus;
    createdAt: string;
    billed?: boolean;
    orderNumber?: string;
}
