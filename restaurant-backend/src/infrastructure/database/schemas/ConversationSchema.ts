/**
 * @file ConversationSchema.ts
 * @description Schema de Mongoose para la colección de conversaciones de WhatsApp
 *
 * @purpose
 * Define la estructura de datos de MongoDB para persistir conversaciones
 * del chatbot de WhatsApp. Permite:
 * - Recuperar conversaciones tras reinicio del servidor
 * - Mantener historial de interacciones por cliente
 * - Tracking de pedidos por conversación
 *
 * @connections
 * - Usado por: ConversationRepository (infrastructure/repositories)
 * - Usado por: WhatsAppChatbot (para recuperar estado)
 * - Exporta: ConversationModel para operaciones de BD
 *
 * @layer Infrastructure - Persistencia de datos
 */

import mongoose, { Schema, Document } from 'mongoose';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CartItem {
    name: string;
    quantity: number;
    price: number;
    taxRate: number;
}

export interface CustomerLocation {
    latitude: number;
    longitude: number;
    address?: string;
}

export type ConversationStep =
    | 'IDLE'
    | 'SHOWING_MENU'
    | 'SELECTING_ITEMS'
    | 'CONFIRMING'
    | 'WAITING_NAME'
    | 'WAITING_ADDRESS'
    | 'WAITING_LOCATION'
    | 'WAITING_FINAL_CONFIRM'
    | 'WAITING_PAYMENT'
    | 'MANUAL';

export interface ChatMessage {
    direction: 'in' | 'out';
    text: string;
    timestamp: Date;
    type?: 'text' | 'image' | 'location' | 'button';
}

export interface ConversationDocument extends Document {
    phone: string;
    step: ConversationStep;
    items: CartItem[];
    customerName?: string;
    customerAddress?: string;
    lastActivity: Date;
    lastOrderId?: string;
    manualMode: boolean;
    manualModeStartedAt?: Date;
    customerLocation?: CustomerLocation;
    deliveryDistance?: number;
    deliveryCost?: number;
    // Historial de pedidos del cliente
    orderHistory: string[];
    // Historial de mensajes de la conversación
    messages: ChatMessage[];
    // Metadatos
    createdAt: Date;
    updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const CartItemSchema = new Schema({
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, default: 0 }
}, { _id: false });

const CustomerLocationSchema = new Schema({
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String }
}, { _id: false });

const ChatMessageSchema = new Schema({
    direction: { type: String, enum: ['in', 'out'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['text', 'image', 'location', 'button'], default: 'text' }
}, { _id: false });

const ConversationSchema = new Schema({
    // Identificador único: número de teléfono
    phone: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Estado actual de la conversación
    step: {
        type: String,
        enum: ['IDLE', 'SHOWING_MENU', 'SELECTING_ITEMS', 'CONFIRMING', 'WAITING_NAME', 'WAITING_ADDRESS', 'WAITING_LOCATION', 'WAITING_FINAL_CONFIRM', 'WAITING_PAYMENT', 'MANUAL'],
        default: 'IDLE'
    },

    // Carrito de compras actual
    items: {
        type: [CartItemSchema],
        default: []
    },

    // Información del cliente
    customerName: { type: String },
    customerAddress: { type: String },

    // Timestamp de última actividad (para cleanup)
    lastActivity: {
        type: Date,
        default: Date.now,
        index: true
    },

    // Último pedido realizado
    lastOrderId: { type: String },

    // Modo manual (control por admin)
    manualMode: {
        type: Boolean,
        default: false
    },
    manualModeStartedAt: { type: Date },

    // Ubicación del cliente para delivery
    customerLocation: { type: CustomerLocationSchema },
    deliveryDistance: { type: Number },
    deliveryCost: { type: Number },

    // Historial de IDs de pedidos del cliente
    orderHistory: {
        type: [String],
        default: []
    },

    // Historial de mensajes (últimos 50 para no sobrecargar)
    messages: {
        type: [ChatMessageSchema],
        default: []
    }
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════════════════

// Índice para buscar conversaciones inactivas (cleanup)
ConversationSchema.index({ lastActivity: 1, step: 1 });

// Índice para buscar conversaciones en modo manual
ConversationSchema.index({ manualMode: 1, manualModeStartedAt: 1 });

// TTL index opcional: auto-eliminar conversaciones inactivas después de 7 días
// Comentado por ahora - descomentar si se desea limpieza automática
// ConversationSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const ConversationModel = mongoose.model<ConversationDocument>('Conversation', ConversationSchema);
