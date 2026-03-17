import { Request, Response, NextFunction } from 'express';
import { JWTService, JWTPayload } from '../../utils/JWTService';
import { AuthenticationError } from '../../../domain/errors/CustomErrors';
import { logger } from '../../utils/Logger';

/**
 * Extensión de la interfaz Request para incluir los datos del usuario autenticado
 */
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

/**
 * Middleware para validar el token JWT
 */
export const jwtAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const token = JWTService.extractTokenFromHeader(authHeader);

        if (!token) {
            logger.warn('Authentication failed - No token provided', { path: req.path });
            throw new AuthenticationError('No token provided');
        }

        const payload = JWTService.verifyToken(token);

        if (!payload) {
            logger.warn('Authentication failed - Invalid or expired token', { path: req.path });
            throw new AuthenticationError('Invalid or expired token');
        }

        // Adjuntar el payload del usuario a la request
        req.user = payload;
        
        logger.debug('User authenticated', { userId: payload.userId, roleId: payload.roleId });
        
        next();
    } catch (error) {
        next(error);
    }
};
