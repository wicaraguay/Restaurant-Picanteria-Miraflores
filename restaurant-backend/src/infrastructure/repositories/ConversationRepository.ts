/**
 * @file ConversationRepository.ts
 * @description Repositorio para persistencia de conversaciones de WhatsApp
 *
 * @purpose
 * Proporciona persistencia de conversaciones del chatbot para:
 * - Recuperar conversaciones tras reinicio del servidor
 * - Operaciones CRUD sobre conversaciones
 * - Cleanup de conversaciones inactivas
 *
 * @pattern
 * Repository Pattern - especializado para conversaciones (no extiende BaseRepository
 * debido a la naturaleza única del modelo: findByPhone en lugar de findById)
 *
 * @layer Infrastructure - Persistencia de datos
 */

import {
    ConversationModel,
    ConversationDocument,
    ConversationStep,
    CartItem,
    CustomerLocation
} from '../database/schemas/ConversationSchema';
import { logger } from '../utils/Logger';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (para compatibilidad con WhatsAppChatbot)
// ═══════════════════════════════════════════════════════════════════════════

export interface ConversationState {
    phone: string;
    step: ConversationStep;
    items: CartItem[];
    customerName?: string;
    customerAddress?: string;
    lastActivity: Date;
    menuIndexMap?: Map<number, any>; // No se persiste, se reconstruye en memoria
    lastOrderId?: string;
    manualMode?: boolean;
    manualModeStartedAt?: Date;
    customerLocation?: CustomerLocation;
    deliveryDistance?: number;
    deliveryCost?: number;
    orderHistory?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// REPOSITORY
// ═══════════════════════════════════════════════════════════════════════════

export class ConversationRepository {
    /**
     * Buscar conversación por número de teléfono
     */
    async findByPhone(phone: string): Promise<ConversationState | null> {
        try {
            const doc = await ConversationModel.findOne({ phone }).lean();
            if (!doc) return null;
            return this.mapToState(doc);
        } catch (error) {
            logger.error('[ConversationRepository] Error finding conversation', { phone, error });
            return null;
        }
    }

    /**
     * Crear o actualizar conversación (upsert)
     * Este es el método principal para persistir el estado
     */
    async upsert(state: ConversationState): Promise<ConversationState | null> {
        try {
            const doc = await ConversationModel.findOneAndUpdate(
                { phone: state.phone },
                {
                    $set: {
                        step: state.step,
                        items: state.items,
                        customerName: state.customerName,
                        customerAddress: state.customerAddress,
                        lastActivity: state.lastActivity,
                        lastOrderId: state.lastOrderId,
                        manualMode: state.manualMode || false,
                        manualModeStartedAt: state.manualModeStartedAt,
                        customerLocation: state.customerLocation,
                        deliveryDistance: state.deliveryDistance,
                        deliveryCost: state.deliveryCost
                    }
                },
                { new: true, upsert: true }
            ).lean();

            if (!doc) return null;

            logger.debug('[ConversationRepository] Conversation upserted', {
                phone: state.phone,
                step: state.step
            });

            return this.mapToState(doc);
        } catch (error) {
            logger.error('[ConversationRepository] Error upserting conversation', { phone: state.phone, error });
            return null;
        }
    }

    /**
     * Actualizar solo el paso actual de la conversación
     */
    async updateStep(phone: string, step: ConversationStep): Promise<boolean> {
        try {
            const result = await ConversationModel.updateOne(
                { phone },
                { $set: { step, lastActivity: new Date() } }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('[ConversationRepository] Error updating step', { phone, step, error });
            return false;
        }
    }

    /**
     * Actualizar items del carrito
     */
    async updateItems(phone: string, items: CartItem[]): Promise<boolean> {
        try {
            const result = await ConversationModel.updateOne(
                { phone },
                { $set: { items, lastActivity: new Date() } }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('[ConversationRepository] Error updating items', { phone, error });
            return false;
        }
    }

    /**
     * Agregar pedido al historial del cliente
     */
    async addToOrderHistory(phone: string, orderId: string): Promise<boolean> {
        try {
            const result = await ConversationModel.updateOne(
                { phone },
                {
                    $set: { lastOrderId: orderId, lastActivity: new Date() },
                    $push: { orderHistory: orderId }
                }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('[ConversationRepository] Error adding to order history', { phone, orderId, error });
            return false;
        }
    }

    /**
     * Activar modo manual
     */
    async setManualMode(phone: string, active: boolean): Promise<boolean> {
        try {
            const update: any = {
                manualMode: active,
                lastActivity: new Date()
            };

            if (active) {
                update.manualModeStartedAt = new Date();
                update.step = 'MANUAL';
            } else {
                update.manualModeStartedAt = undefined;
                update.step = 'IDLE';
            }

            const result = await ConversationModel.updateOne({ phone }, { $set: update });
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('[ConversationRepository] Error setting manual mode', { phone, active, error });
            return false;
        }
    }

    /**
     * Resetear conversación (mantiene historial)
     */
    async reset(phone: string): Promise<boolean> {
        try {
            const result = await ConversationModel.updateOne(
                { phone },
                {
                    $set: {
                        step: 'IDLE',
                        items: [],
                        customerName: undefined,
                        customerAddress: undefined,
                        lastActivity: new Date(),
                        manualMode: false,
                        manualModeStartedAt: undefined,
                        customerLocation: undefined,
                        deliveryDistance: undefined,
                        deliveryCost: undefined
                    }
                }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('[ConversationRepository] Error resetting conversation', { phone, error });
            return false;
        }
    }

    /**
     * Eliminar conversación completamente
     */
    async delete(phone: string): Promise<boolean> {
        try {
            const result = await ConversationModel.deleteOne({ phone });
            return result.deletedCount > 0;
        } catch (error) {
            logger.error('[ConversationRepository] Error deleting conversation', { phone, error });
            return false;
        }
    }

    /**
     * Obtener todas las conversaciones activas (no IDLE, no muy antiguas)
     */
    async findAllActive(): Promise<ConversationState[]> {
        try {
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
            const docs = await ConversationModel.find({
                $or: [
                    { step: { $ne: 'IDLE' } },
                    { lastActivity: { $gte: thirtyMinutesAgo } }
                ]
            }).lean();

            return docs.map(doc => this.mapToState(doc));
        } catch (error) {
            logger.error('[ConversationRepository] Error finding active conversations', { error });
            return [];
        }
    }

    /**
     * Cargar todas las conversaciones (para inicialización del chatbot)
     */
    async loadAll(): Promise<Map<string, ConversationState>> {
        try {
            // Solo cargar conversaciones de los últimos 7 días
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const docs = await ConversationModel.find({
                lastActivity: { $gte: sevenDaysAgo }
            }).lean();

            const map = new Map<string, ConversationState>();
            for (const doc of docs) {
                const state = this.mapToState(doc);
                // Usar phone con formato @c.us para compatibilidad con WhatsApp
                const phoneKey = state.phone.includes('@c.us') ? state.phone : `${state.phone}@c.us`;
                map.set(phoneKey, state);
            }

            logger.info('[ConversationRepository] Loaded conversations from DB', {
                count: map.size
            });

            return map;
        } catch (error) {
            logger.error('[ConversationRepository] Error loading all conversations', { error });
            return new Map();
        }
    }

    /**
     * Cleanup: eliminar conversaciones inactivas
     * @param inactiveMinutes - Minutos de inactividad para considerar inactiva (default: 60)
     */
    async cleanupInactive(inactiveMinutes: number = 60): Promise<number> {
        try {
            const cutoff = new Date(Date.now() - inactiveMinutes * 60 * 1000);

            // Solo limpiar conversaciones IDLE o con mucha inactividad
            const result = await ConversationModel.deleteMany({
                lastActivity: { $lt: cutoff },
                step: 'IDLE',
                // Mantener si tiene historial de pedidos (cliente recurrente)
                $or: [
                    { orderHistory: { $size: 0 } },
                    { orderHistory: { $exists: false } }
                ]
            });

            if (result.deletedCount > 0) {
                logger.info('[ConversationRepository] Cleaned up inactive conversations', {
                    deleted: result.deletedCount
                });
            }

            return result.deletedCount;
        } catch (error) {
            logger.error('[ConversationRepository] Error cleaning up conversations', { error });
            return 0;
        }
    }

    /**
     * Obtener conversaciones en modo manual que exceden el timeout
     */
    async findManualModeTimeouts(timeoutMs: number): Promise<ConversationState[]> {
        try {
            const cutoff = new Date(Date.now() - timeoutMs);
            const docs = await ConversationModel.find({
                manualMode: true,
                manualModeStartedAt: { $lt: cutoff }
            }).lean();

            return docs.map(doc => this.mapToState(doc));
        } catch (error) {
            logger.error('[ConversationRepository] Error finding manual mode timeouts', { error });
            return [];
        }
    }

    /**
     * Obtener historial de pedidos de un cliente
     */
    async getOrderHistory(phone: string): Promise<string[]> {
        try {
            const doc = await ConversationModel.findOne({ phone }).select('orderHistory').lean();
            return doc?.orderHistory || [];
        } catch (error) {
            logger.error('[ConversationRepository] Error getting order history', { phone, error });
            return [];
        }
    }

    /**
     * Mapear documento de MongoDB a ConversationState
     */
    private mapToState(doc: any): ConversationState {
        return {
            phone: doc.phone,
            step: doc.step,
            items: doc.items || [],
            customerName: doc.customerName,
            customerAddress: doc.customerAddress,
            lastActivity: doc.lastActivity ? new Date(doc.lastActivity) : new Date(),
            lastOrderId: doc.lastOrderId,
            manualMode: doc.manualMode,
            manualModeStartedAt: doc.manualModeStartedAt ? new Date(doc.manualModeStartedAt) : undefined,
            customerLocation: doc.customerLocation,
            deliveryDistance: doc.deliveryDistance,
            deliveryCost: doc.deliveryCost,
            orderHistory: doc.orderHistory || []
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

let instance: ConversationRepository | null = null;

export function getConversationRepository(): ConversationRepository {
    if (!instance) {
        instance = new ConversationRepository();
    }
    return instance;
}
