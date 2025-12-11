/**
 * @file CustomerSchema.ts
 * @description Schema de Mongoose para la colección de clientes
 * 
 * @purpose
 * Define la estructura de datos de MongoDB para clientes usando Mongoose.
 * Incluye validaciones, tipos, y configuración de timestamps.
 * 
 * @connections
 * - Usa: Customer entity (domain/entities) - como referencia de tipos
 * - Usado por: MongoCustomerRepository (infrastructure/repositories)
 * - Exporta: CustomerModel para operaciones de BD
 * 
 * @layer Infrastructure - Persistencia de datos
 */

import mongoose, { Schema, Document } from 'mongoose';
import { Customer } from '../../../domain/entities/Customer';

export interface CustomerDocument extends Document {
    name: string;
    email: string;
    phone: string;
    loyaltyPoints: number;
    lastVisit: Date;
    identification?: string;
    address?: string;
    // id is virtual
}

const CustomerSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String }, // optional? types.ts didn't specify, assume required or optional based on frontend mocks
    phone: { type: String },
    loyaltyPoints: { type: Number, default: 0 },
    lastVisit: { type: Date, default: Date.now },
    identification: { type: String },
    address: { type: String },
}, { timestamps: true });

// ==================== INDEXES FOR PERFORMANCE ====================
// Unique index for email (if provided, must be unique)
CustomerSchema.index({ email: 1 }, { unique: true, sparse: true }); // sparse: true allows null values
CustomerSchema.index({ phone: 1 }); // For searching by phone
CustomerSchema.index({ name: 1 }); // For searching by name
CustomerSchema.index({ lastVisit: -1 }); // For sorting by last visit
CustomerSchema.index({ loyaltyPoints: -1 }); // For sorting by loyalty points

export const CustomerModel = mongoose.model<CustomerDocument>('Customer', CustomerSchema);
