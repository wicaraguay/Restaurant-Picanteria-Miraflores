/**
 * @file CounterSchema.ts
 * @description Contadores atómicos de secuencias (ej. número de pedido).
 *
 * @purpose
 * Un documento por secuencia ({_id: nombre, seq: número}). El incremento se
 * hace con findOneAndUpdate + $inc, que es atómico en MongoDB: dos procesos
 * concurrentes NUNCA reciben el mismo valor.
 *
 * @connections
 * - Usado por: MongoOrderRepository (getNextOrderNumber)
 *
 * @layer Infrastructure - Persistencia
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface CounterDocument extends Document<string> {
    seq: number;
}

const CounterSchema = new Schema<CounterDocument>({
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 }
}, { versionKey: false });

export const CounterModel = mongoose.model<CounterDocument>('Counter', CounterSchema);
