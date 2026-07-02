/**
 * @file auditRoutes.ts
 * @description Rutas para consultar logs de auditoría del sistema.
 * Solo accesible por administradores.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { auditService } from '../../services/AuditService';
import { jwtAuthMiddleware } from '../middleware/JWTAuthMiddleware';
import { logger } from '../../utils/Logger';
import { RoleModel } from '../../database/schemas/RoleSchema';

const router = Router();

// Middleware para verificar que el usuario es administrador
const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const roleId = user?.roleId;

        if (!roleId) {
            return res.status(403).json({
                success: false,
                error: { message: 'Solo administradores pueden acceder a los logs de auditoría' }
            });
        }

        const role = await RoleModel.findById(roleId).lean();
        const roleName = role?.name?.toLowerCase();

        if (roleName !== 'administrador' && roleName !== 'admin') {
            return res.status(403).json({
                success: false,
                error: { message: 'Solo administradores pueden acceder a los logs de auditoría' }
            });
        }

        next();
    } catch (error) {
        logger.error('[AuditRoutes] Error checking admin role', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Error al verificar permisos' }
        });
    }
};

// Historial de un documento
router.get('/history/:collection/:documentId', jwtAuthMiddleware, adminOnly, async (req: Request, res: Response) => {
    try {
        const { collection, documentId } = req.params;
        const history = await auditService.getDocumentHistory(collection, documentId);

        res.json({ success: true, data: history });
    } catch (error) {
        logger.error('[AuditRoutes] Error getting document history', error);
        res.status(500).json({
            success: false,
            error: { message: 'Error al obtener historial' }
        });
    }
});

// Documentos eliminados
router.get('/deleted', jwtAuthMiddleware, adminOnly, async (req: Request, res: Response) => {
    try {
        const since = req.query.since
            ? new Date(req.query.since as string)
            : new Date(Date.now() - 24 * 60 * 60 * 1000);

        const collection = req.query.collection as string | undefined;
        const deleted = await auditService.getDeletedDocuments(since, collection);

        res.json({ success: true, data: deleted });
    } catch (error) {
        logger.error('[AuditRoutes] Error getting deleted documents', error);
        res.status(500).json({
            success: false,
            error: { message: 'Error al obtener documentos eliminados' }
        });
    }
});

// Actividad de un usuario
router.get('/user/:userId', jwtAuthMiddleware, adminOnly, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;

        const activity = await auditService.getUserActivity(userId, limit);

        res.json({ success: true, data: activity });
    } catch (error) {
        logger.error('[AuditRoutes] Error getting user activity', error);
        res.status(500).json({
            success: false,
            error: { message: 'Error al obtener actividad del usuario' }
        });
    }
});

// Estadísticas de auditoría
router.get('/stats', jwtAuthMiddleware, adminOnly, async (req: Request, res: Response) => {
    try {
        const since = req.query.since
            ? new Date(req.query.since as string)
            : undefined;

        const stats = await auditService.getStats(since);

        res.json({ success: true, data: stats });
    } catch (error) {
        logger.error('[AuditRoutes] Error getting audit stats', error);
        res.status(500).json({
            success: false,
            error: { message: 'Error al obtener estadísticas' }
        });
    }
});

export default router;
