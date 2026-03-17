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
    readyAt?: string | null;
    estimatedMinutes?: number | null;
    estimateSetAt?: string | null;
    billed?: boolean;
    billingType?: 'Factura' | 'Consumidor Final' | 'Sin Factura';
    orderNumber?: string;
}
