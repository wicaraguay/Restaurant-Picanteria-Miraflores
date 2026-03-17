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
    readyAt?: Date;
    estimatedMinutes?: number;
    estimateSetAt?: Date;
    billed?: boolean;
    billingType?: 'Factura' | 'Consumidor Final' | 'Sin Factura';
}

const OrderSchema: Schema = new Schema({
    customerName: { type: String, required: true },
    items: [{
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number },
        prepared: { type: Boolean, default: false }
    }],
    type: { type: String, enum: ['En Local', 'Delivery', 'Para Llevar'], required: true },
    status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.New },
    billed: { type: Boolean, default: false },
    billingType: { type: String, enum: ['Factura', 'Consumidor Final', 'Sin Factura'] },
    orderNumber: { type: String },
    estimatedMinutes: { type: Number },
    readyAt: { type: Date },
    estimateSetAt: { type: Date }
}, {
    timestamps: { createdAt: true, updatedAt: false } // We use createdAt from timestamps. Schema updated for prepared flag.
});

// ==================== INDEXES FOR PERFORMANCE ====================
// Single field indexes
OrderSchema.index({ customerName: 1 }); // For searching orders by customer
OrderSchema.index({ status: 1 }); // For filtering by status (New, InProgress, etc.)
OrderSchema.index({ createdAt: -1 }); // For sorting by date (most recent first)
OrderSchema.index({ billed: 1 }); // For filtering billed/unbilled orders

// Compound indexes for common query patterns
OrderSchema.index({ status: 1, createdAt: -1 }); // Filter by status + sort by date
OrderSchema.index({ customerName: 1, createdAt: -1 }); // Customer orders sorted by date
OrderSchema.index({ billed: 1, createdAt: -1 }); // Unbilled orders sorted by date

export const OrderModel = mongoose.model<OrderDocument>('Order', OrderSchema);
