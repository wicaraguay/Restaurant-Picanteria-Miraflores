/**
 * @file OrderSchema.ts
 * @description Schema de Mongoose para la colección de órdenes/pedidos
 * 
 * @purpose
 * Define la estructura de datos de MongoDB para órdenes incluyendo items, cliente,
 * tipo de servicio, estado y marca de facturación.
 * 
 * @connections
 * - Usa: Order, OrderStatus (domain/entities) - como referencia de tipos
 * - Usado por: MongoOrderRepository (infrastructure/repositories)
 * - Exporta: OrderModel para operaciones de BD
 * 
 * @layer Infrastructure - Persistencia de datos
 */

import mongoose, { Schema, Document } from 'mongoose';
import { Order, OrderStatus } from '../../../domain/entities/Order';

export interface OrderDocument extends Document {
    customerName: string;
    items: { name: string; quantity: number; price?: number }[];
    type: 'En Local' | 'Delivery' | 'Para Llevar';
    status: OrderStatus;
    createdAt: Date;
    billed?: boolean;
}

const OrderSchema: Schema = new Schema({
    customerName: { type: String, required: true },
    items: [{
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number }
    }],
    type: { type: String, enum: ['En Local', 'Delivery', 'Para Llevar'], required: true },
    status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.New },
    billed: { type: Boolean, default: false }
}, {
    timestamps: { createdAt: true, updatedAt: false } // We use createdAt from timestamps
});

export const OrderModel = mongoose.model<OrderDocument>('Order', OrderSchema);
