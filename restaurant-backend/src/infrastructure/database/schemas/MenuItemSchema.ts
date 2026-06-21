/**
 * @file MenuItemSchema.ts
 * @description Schema de Mongoose para la colección de items del menú
 * 
 * @purpose
 * Define la estructura de datos de MongoDB para productos/platos del menú.
 * Incluye validaciones, tipos, y configuración de timestamps.
 * 
 * @connections
 * - Usa: MenuItem entity (domain/entities) - como referencia de tipos
 * - Usado por: MongoMenuRepository (infrastructure/repositories)
 * - Exporta: MenuItemModel para operaciones de BD
 * 
 * @layer Infrastructure - Persistencia de datos
 */

import mongoose, { Schema, Document } from 'mongoose';
import { MenuItem } from '../../../domain/entities/MenuItem';

export interface MenuItemDocument extends Document {
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    category: string; // Legacy: texto libre
    categoryId?: mongoose.Types.ObjectId; // Referencia a Category
    available: boolean;
    taxRate: number;
}

const MenuItemSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    imageUrl: { type: String },
    category: { type: String, required: true }, // Se mantiene para compatibilidad
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' }, // Nueva referencia
    available: { type: Boolean, default: true },
    taxRate: { type: Number, default: 15, min: 0, max: 100 } // IVA por producto (0, 5, 12, 15)
}, { timestamps: true });

// Índice para filtrado por categoría
MenuItemSchema.index({ categoryId: 1 });

export const MenuItemModel = mongoose.model<MenuItemDocument>('MenuItem', MenuItemSchema);
