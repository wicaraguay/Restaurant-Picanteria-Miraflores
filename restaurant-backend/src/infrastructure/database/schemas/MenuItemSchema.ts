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
    category: string;
    available: boolean;
}

const MenuItemSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    imageUrl: { type: String },
    category: { type: String, required: true },
    available: { type: Boolean, default: true }
}, { timestamps: true });

export const MenuItemModel = mongoose.model<MenuItemDocument>('MenuItem', MenuItemSchema);
