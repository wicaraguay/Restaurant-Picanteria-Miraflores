/**
 * @file auditRoutes.ts
 * @description Rutas para consultar logs de auditoría del sistema.
 *
 * Solo accesible por administradores.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { auditService } from '../../services/AuditService';
import { jwtAuthMiddleware } from '../middleware/JWTAuthMiddleware';
import { logger } from '../../utils/Logger';

const router = Router();

// Middleware para verificar que el usuario es administrador
const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const roleName = user?.roleName?.toLowerCase() || user?.role?.toLowerCase();

    if (roleName !== 'administrador' && roleName !== 'admin') {
        return res.status(403).json({
            status: 'error',
            message: 'Solo administradores pueden acceder a los logs de auditoría'
        });
    }
    next();
};

/**
 * @swagger
 * /api/audit/history/{collection}/{documentId}:
 *   get:
 *     summary: Obtener historial de cambios de un documento
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: collection
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre de la colección (Order, Bill, Customer, etc.)
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Historial del documento
 */
router.get('/history/:collection/:documentId', jwtAuthMiddleware, adminOnly, async (req: Request, res: Response) => {
    try {
        const { collection, documentId } = req.params;
        const history = await auditService.getDocumentHistory(collection, documentId);

        res.json({
            status: 'success',
            data: history
        });
    } catch (error) {
        logger.error('[AuditRoutes] Error getting document history', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener historial'
        });
    }
});

/**
 * @swagger
 * /api/audit/deleted:
 *   get:
 *     summary: Obtener documentos eliminados recientemente
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha desde la cual buscar (default: últimas 24 horas)
 *       - in: query
 *         name: collection
 *         schema:
 *           type: string
 *         description: Filtrar por colección específica
 *     responses:
 *       200:
 *         description: Lista de documentos eliminados
 */
router.get('/deleted', jwtAuthMiddleware, adminOnly, async (req: Request, res: Response) => {
    try {
        const since = req.query.since
            ? new Date(req.query.since as string)
            : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: últimas 24 horas

        const collection = req.query.collection as string | undefined;
        const deleted = await auditService.getDeletedDocuments(since, collection);

        res.json({
            status: 'success',
            data: deleted,
            meta: {
                since: since.toISOString(),
                collection: collection || 'all',
                count: deleted.length
            }
        });
    } catch (error) {
        logger.error('[AuditRoutes] Error getting deleted documents', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener documentos eliminados'
        });
    }
});

/**
 * @swagger
 * /api/audit/user/{userId}:
 *   get:
 *     summary: Obtener actividad de un usuario
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Actividad del usuario
 */
router.get('/user/:userId', jwtAuthMiddleware, adminOnly, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;

        const activity = await auditService.getUserActivity(userId, limit);

        res.json({
            status: 'success',
            data: activity
        });
    } catch (error) {
        logger.error('[AuditRoutes] Error getting user activity', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener actividad del usuario'
        });
    }
});

/**
 * @swagger
 * /api/audit/stats:
 *   get:
 *     summary: Obtener estadísticas de auditoría
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha desde la cual calcular estadísticas
 *     responses:
 *       200:
 *         description: Estadísticas de operaciones
 */
router.get('/stats', jwtAuthMiddleware, adminOnly, async (req: Request, res: Response) => {
    try {
        const since = req.query.since
            ? new Date(req.query.since as string)
            : undefined;

        const stats = await auditService.getStats(since);

        res.json({
            status: 'success',
            data: stats,
            meta: {
                since: since?.toISOString() || 'all time'
            }
        });
    } catch (error) {
        logger.error('[AuditRoutes] Error getting audit stats', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener estadísticas'
        });
    }
});

export default router;
