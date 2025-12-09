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
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
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


export const EmployeeModel = mongoose.model<EmployeeDocument>('Employee', EmployeeSchema);
