/**
 * @file AuditService.ts
 * @description Servicio de auditoría para registrar operaciones CRUD en el sistema.
 *
 * @purpose
 * Proporciona un registro completo de quién hizo qué, cuándo y qué cambió.
 * Útil para cumplimiento, debugging y recuperación de datos.
 *
 * @usage
 * - Automático: Integrado en BaseRepository para todas las operaciones
 * - Manual: AuditService.log() para operaciones especiales
 */

import { AuditLogModel, IAuditLog, AuditAction } from '../database/schemas/AuditLogSchema';
import { logger } from '../utils/Logger';
import { AsyncLocalStorage } from 'async_hooks';

// Context para pasar información del request a través de la cadena de llamadas
interface RequestContext {
    userId?: string;
    userEmail?: string;
    userRole?: string;
    ip?: string;
    userAgent?: string;
}

// Storage para contexto del request actual (similar a thread-local en otros lenguajes)
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Calcula las diferencias entre dos objetos
 */
function calculateChanges(
    before: Record<string, any> | null,
    after: Record<string, any> | null
): Record<string, { from: any; to: any }> | undefined {
    if (!before || !after) return undefined;

    const changes: Record<string, { from: any; to: any }> = {};

    // Campos a ignorar en la comparación
    const ignoreFields = ['updatedAt', '__v', '_id', 'id'];

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
        if (ignoreFields.includes(key)) continue;

        const fromVal = before[key];
        const toVal = after[key];

        // Comparación simple (no deep compare para objetos anidados)
        const fromStr = JSON.stringify(fromVal);
        const toStr = JSON.stringify(toVal);

        if (fromStr !== toStr) {
            changes[key] = { from: fromVal, to: toVal };
        }
    }

    return Object.keys(changes).length > 0 ? changes : undefined;
}

/**
 * Limpia un documento para almacenamiento (remueve campos sensibles)
 */
function sanitizeDocument(doc: any): Record<string, any> | null {
    if (!doc) return null;

    const sanitized = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };

    // Remover campos sensibles
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.__v;

    // Convertir _id a string
    if (sanitized._id) {
        sanitized._id = sanitized._id.toString();
    }

    return sanitized;
}

export class AuditService {
    private static instance: AuditService;
    private enabled: boolean = true;

    private constructor() {
        // Deshabilitar en tests si es necesario
        this.enabled = process.env.DISABLE_AUDIT !== 'true';
    }

    public static getInstance(): AuditService {
        if (!AuditService.instance) {
            AuditService.instance = new AuditService();
        }
        return AuditService.instance;
    }

    /**
     * Habilita o deshabilita la auditoría
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Registra una operación de auditoría
     */
    public async log(params: {
        action: AuditAction;
        collection: string;
        documentId: string;
        before?: any;
        after?: any;
        reason?: string;
    }): Promise<void> {
        if (!this.enabled) return;

        try {
            // Obtener contexto del request actual
            const context = requestContextStorage.getStore() || {};

            const sanitizedBefore = sanitizeDocument(params.before);
            const sanitizedAfter = sanitizeDocument(params.after);

            const auditEntry: IAuditLog = {
                action: params.action,
                collection: params.collection,
                documentId: params.documentId,
                before: sanitizedBefore,
                after: sanitizedAfter,
                changes: calculateChanges(sanitizedBefore, sanitizedAfter),
                userId: context.userId,
                userEmail: context.userEmail,
                userRole: context.userRole,
                ip: context.ip,
                userAgent: context.userAgent,
                reason: params.reason,
                timestamp: new Date()
            };

            // Guardar async (fire and forget para no bloquear la operación principal)
            AuditLogModel.create(auditEntry).catch(err => {
                logger.error('[AuditService] Failed to save audit log', err);
            });

            logger.debug(`[AuditService] ${params.action} on ${params.collection}:${params.documentId}`);
        } catch (error) {
            // No lanzar error - auditoría no debe bloquear operaciones
            logger.error('[AuditService] Error creating audit log', error);
        }
    }

    /**
     * Busca historial de un documento específico
     */
    public async getDocumentHistory(collection: string, documentId: string) {
        return AuditLogModel.find({ collection, documentId })
            .sort({ timestamp: -1 })
            .limit(100)
            .lean();
    }

    /**
     * Busca operaciones por usuario
     */
    public async getUserActivity(userId: string, limit: number = 50) {
        return AuditLogModel.find({ userId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
    }

    /**
     * Busca todas las eliminaciones en un rango de tiempo
     */
    public async getDeletedDocuments(since: Date, collection?: string) {
        const filter: any = {
            action: { $in: ['DELETE', 'SOFT_DELETE'] },
            timestamp: { $gte: since }
        };

        if (collection) {
            filter.collection = collection;
        }

        return AuditLogModel.find(filter)
            .sort({ timestamp: -1 })
            .lean();
    }

    /**
     * Estadísticas de auditoría
     */
    public async getStats(since?: Date) {
        const matchStage: any = {};
        if (since) {
            matchStage.timestamp = { $gte: since };
        }

        return AuditLogModel.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { action: '$action', collection: '$collection' },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.collection',
                    actions: {
                        $push: {
                            action: '$_id.action',
                            count: '$count'
                        }
                    },
                    total: { $sum: '$count' }
                }
            },
            { $sort: { total: -1 } }
        ]);
    }
}

export const auditService = AuditService.getInstance();
