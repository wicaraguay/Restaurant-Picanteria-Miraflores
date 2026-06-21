/**
 * @file EmployeeSchema.ts
 * @description Schema de Mongoose para la colección de empleados
 * 
 * @purpose
 * Define la estructura de datos de MongoDB para empleados incluyendo credenciales,
 * información laboral, y gestión de sesiones. Usa Map para shifts.
 * 
 * @connections
 * - Usa: Employee entity (domain/entities) - como referencia de tipos
 * - Usado por: MongoEmployeeRepository (infrastructure/repositories)
 * - Exporta: EmployeeModel para operaciones de BD
 * 
 * @layer Infrastructure - Persistencia de datos
 */

import mongoose, { Schema, Document } from 'mongoose';
import { Employee } from '../../../domain/entities/Employee';

export interface EmployeeDocument extends Document {
    name: string;
    identification: string;
    username: string;
    password?: string;
    roleId: string;
    phone: string;
    salary: number;
    shifts: { [key: string]: string };
    equipment: { uniform: boolean; epp: boolean };
    activeSessionId?: string;
    lastLoginAt?: Date;
}

const EmployeeSchema: Schema = new Schema({
    name: { type: String, required: true },
    identification: { type: String },
    username: { type: String, required: true, unique: true },
    // SECURITY: password excluded from queries by default with select: false
    // Use .select('+password') explicitly when needed (e.g., authentication)
    password: { type: String, required: true, select: false },
    roleId: { type: String, required: true },
    phone: { type: String },
    salary: { type: Number },
    shifts: { type: Map, of: String },
    equipment: {
        uniform: { type: Boolean, default: false },
        epp: { type: Boolean, default: false }
    },
    activeSessionId: { type: String },
    lastLoginAt: { type: Date }
}, { timestamps: true });

// ==================== INDEXES FOR PERFORMANCE ====================
// username already has unique: true which creates an index
EmployeeSchema.index({ roleId: 1 }); // For filtering employees by role
EmployeeSchema.index({ identification: 1 }, { sparse: true }); // For employee lookup by ID
EmployeeSchema.index({ activeSessionId: 1 }, { sparse: true }); // For session validation
EmployeeSchema.index({ name: 1 }); // For searching employees by name
EmployeeSchema.index({ lastLoginAt: -1 }); // For sorting by last login

export const EmployeeModel = mongoose.models.Employee || mongoose.model<EmployeeDocument>('Employee', EmployeeSchema);
