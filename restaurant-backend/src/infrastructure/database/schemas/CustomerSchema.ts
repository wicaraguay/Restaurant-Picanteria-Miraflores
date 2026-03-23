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
    identification?: string; // RUC or CI
    address?: string;
    // id is virtual
}

const CustomerSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        trim: true,
        // Same pattern as identification: email is optional but unique when provided.
        // Sparse index ignores absent fields so multiple customers can omit email.
        set: (v: any): string | undefined => {
            if (v === '' || v === null || v === undefined) return undefined;
            return String(v).trim().toLowerCase();
        }
    },
    phone: { type: String },
    loyaltyPoints: { type: Number, default: 0 },
    lastVisit: { type: Date, default: Date.now },
    identification: {
        type: String,
        trim: true,
        // CRITICAL: Convert empty strings to undefined so the sparse unique index works.
        // sparse index ignores null/absent fields but NOT empty strings "".
        // Without this, multiple customers without ID all get identification:"" and collide.
        set: (v: any): string | undefined => {
            if (v === '' || v === null || v === undefined) return undefined;
            return String(v).trim();
        }
    },
    address: { type: String },
}, { timestamps: true });

// ── UNIQUE SPARSE indexes: optional fields that must be unique when present ──
CustomerSchema.index({ email: 1 }, { unique: true, sparse: true });         // Email unique when provided
CustomerSchema.index({ identification: 1 }, { unique: true, sparse: true }); // RUC/CI unique when provided
// ── Performance indexes ──
CustomerSchema.index({ phone: 1 });          // Search by phone
CustomerSchema.index({ name: 1 });           // Search by name
CustomerSchema.index({ lastVisit: -1 });     // Sort by last visit
CustomerSchema.index({ loyaltyPoints: -1 }); // Sort by loyalty

export const CustomerModel = mongoose.model<CustomerDocument>('Customer', CustomerSchema);
