/**
 * JWT Service
 * 
 * Maneja la generación y verificación de tokens JWT para autenticación.
 * Implementa generación de sessionId único para tracking de sesión única.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from './Logger';

// Secret key para firmar tokens (en producción usar variable de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'restaurant-pm-secret-key-change-in-production';
const JWT_EXPIRATION = '7d'; // 7 días

export interface JWTPayload {
    userId: string;
    username: string;
    roleId: string;
    sessionId: string;
}

export class JWTService {
    /**
     * Genera un sessionId único
     */
    static generateSessionId(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Genera un token JWT
     */
    static generateToken(payload: JWTPayload): string {
        try {
            const token = jwt.sign(payload, JWT_SECRET, {
                expiresIn: JWT_EXPIRATION,
            });
            logger.info('JWT token generated', { userId: payload.userId, sessionId: payload.sessionId });
            return token;
        } catch (error) {
            logger.error('Error generating JWT token', error);
            throw new Error('Failed to generate authentication token');
        }
    }

    /**
     * Verifica y decodifica un token JWT
     */
    static verifyToken(token: string): JWTPayload | null {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
            logger.debug('JWT token verified', { userId: decoded.userId });
            return decoded;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                logger.warn('JWT token expired');
            } else if (error instanceof jwt.JsonWebTokenError) {
                logger.warn('Invalid JWT token');
            } else {
                logger.error('Error verifying JWT token', error);
            }
            return null;
        }
    }

    /**
     * Extrae el token del header Authorization
     */
    static extractTokenFromHeader(authHeader: string | undefined): string | null {
        if (!authHeader) return null;

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }

        return parts[1];
    }
}
