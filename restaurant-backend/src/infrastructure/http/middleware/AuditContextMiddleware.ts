/**
 * @file AuditContextMiddleware.ts
 * @description Middleware que captura el contexto del request para auditoría.
 *
 * Este middleware extrae userId, userEmail, IP y userAgent del request
 * y los almacena en AsyncLocalStorage para que estén disponibles
 * en cualquier parte de la cadena de llamadas (incluido BaseRepository).
 */

import { Request, Response, NextFunction } from 'express';
import { requestContextStorage } from '../../services/AuditService';

export function auditContextMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Extraer información del usuario autenticado (si existe)
    const user = (req as any).user;

    const context = {
        userId: user?.id || user?.userId,
        userEmail: user?.email,
        userRole: user?.role || user?.roleName,
        ip: req.ip || req.socket?.remoteAddress || req.headers['x-forwarded-for'] as string,
        userAgent: req.headers['user-agent']
    };

    // Ejecutar el resto del request dentro del contexto de auditoría
    requestContextStorage.run(context, () => {
        next();
    });
}
