/**
 * @file RoleSchema.ts
 * @description Esquema de MongoDB para la colección de roles
 * 
 * @purpose
 * Define la estructura de la colección 'roles' en MongoDB.
 * Incluye validaciones, índices y configuración de timestamps.
 * 
 * @connections
 * - Usado por: MongoRoleRepository (infrastructure/repositories)
 * - Mapea a: Role entity (domain/entities)
 * 
 * @layer Infrastructure - Implementación específica de MongoDB
 */

import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    permissions: {
        type: Map,
        of: Boolean,
        required: true,
        default: {}
    },
    isSystem: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'roles'
});

// Índice para búsquedas rápidas por nombre
roleSchema.index({ name: 1 });

export const RoleModel = mongoose.model('Role', roleSchema);
