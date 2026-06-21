/**
 * @file CategorySchema.ts
 * @description Schema de Mongoose para la colección de categorías
 *
 * @purpose
 * Define la estructura de datos de MongoDB para categorías de productos.
 * Incluye validaciones, tipos, índices y configuración de timestamps.
 *
 * @connections
 * - Usa: Category entity (domain/entities) - como referencia de tipos
 * - Usado por: MongoCategoryRepository (infrastructure/repositories)
 * - Exporta: CategoryModel para operaciones de BD
 *
 * @layer Infrastructure - Persistencia de datos
 */

import mongoose, { Schema, Document } from 'mongoose';
import { ProductType } from '../../../domain/entities/Category';

export interface CategoryDocument extends Document {
    name: string;
    description: string;
    imageUrl: string;
    productType: ProductType;
    visibleOnWebsite: boolean;
    sortOrder: number;
    available: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
        },
        imageUrl: {
            type: String,
            default: '',
        },
        productType: {
            type: String,
            enum: ['menu', 'retail'],
            required: true,
            default: 'menu',
        },
        visibleOnWebsite: {
            type: Boolean,
            default: true,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
        available: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Índice para ordenamiento eficiente
CategorySchema.index({ sortOrder: 1 });
// Índice para filtrado por tipo de producto
CategorySchema.index({ productType: 1 });
// Índice compuesto para queries de web pública
CategorySchema.index({ visibleOnWebsite: 1, available: 1, sortOrder: 1 });

export const CategoryModel = mongoose.model<CategoryDocument>('Category', CategorySchema);
