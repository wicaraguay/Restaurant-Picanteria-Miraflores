/**
 * Backup Routes - Sistema de respaldos de base de datos
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getBackupService } from '../../services/BackupService';
import { jwtAuthMiddleware } from '../middleware/JWTAuthMiddleware';
import { logger } from '../../utils/Logger';
import { RoleModel } from '../../database/schemas/RoleSchema';

const router = Router();

// Middleware: solo administradores
const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const roleId = user?.roleId;

        if (!roleId) {
            return res.status(403).json({
                success: false,
                error: { message: 'Solo administradores pueden gestionar backups' }
            });
        }

        const role = await RoleModel.findById(roleId).lean();
        const roleName = role?.name?.toLowerCase();

        if (roleName !== 'administrador' && roleName !== 'admin') {
            return res.status(403).json({
                success: false,
                error: { message: 'Solo administradores pueden gestionar backups' }
            });
        }

        next();
    } catch (error) {
        logger.error('[BackupRoutes] Error checking admin role', error);
        return res.status(500).json({
            success: false,
            error: { message: 'Error al verificar permisos' }
        });
    }
};

// Listar backups
router.get('/', jwtAuthMiddleware, adminOnly, async (req: Request, res: Response) => {
    try {
        const backupService = getBackupService();
        const backups = await backupService.listBackups();

        res.json({
            success: true,
            data: backups
        });
    } catch (error: any) {
        logger.error('[BackupRoutes] Error listing backups', { error: error.message });
        res.status(500).json({
            success: false,
            error: { message: 'Error al listar backups' }
        });
    }
});

// Crear backup
router.post('/', jwtAuthMiddleware, adminOnly, async (req: Request, res: Response) => {
    try {
        const backupService = getBackupService();
        const backup = await backupService.createBackup();

        logger.info('[BackupRoutes] Backup created by user', {
            userId: (req as any).user?.userId,
            backup: backup.filename
        });

        res.json({
            success: true,
            data: backup,
            message: 'Backup creado exitosamente'
        });
    } catch (error: any) {
        logger.error('[BackupRoutes] Error creating backup', { error: error.message });
        res.status(500).json({
            success: false,
            error: { message: 'Error al crear backup: ' + error.message }
        });
    }
});

// Descargar backup
router.get('/:id/download', jwtAuthMiddleware, adminOnly, async (req: Request, res: Response) => {
    try {
        const backupService = getBackupService();
        const filepath = backupService.getBackupPath(req.params.id);

        if (!filepath) {
            return res.status(404).json({
                success: false,
                error: { message: 'Backup no encontrado' }
            });
        }

        res.download(filepath);
    } catch (error: any) {
        logger.error('[BackupRoutes] Error downloading backup', { error: error.message });
        res.status(500).json({
            success: false,
            error: { message: 'Error al descargar backup' }
        });
    }
});

// Eliminar backup
router.delete('/:id', jwtAuthMiddleware, adminOnly, async (req: Request, res: Response) => {
    try {
        const backupService = getBackupService();
        const deleted = await backupService.deleteBackup(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: { message: 'Backup no encontrado' }
            });
        }

        logger.info('[BackupRoutes] Backup deleted by user', {
            userId: (req as any).user?.userId,
            backupId: req.params.id
        });

        res.json({
            success: true,
            message: 'Backup eliminado'
        });
    } catch (error: any) {
        logger.error('[BackupRoutes] Error deleting backup', { error: error.message });
        res.status(500).json({
            success: false,
            error: { message: 'Error al eliminar backup' }
        });
    }
});

export default router;
