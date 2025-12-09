/**
 * Rutas de Autenticación
 * 
 * Define los endpoints relacionados con autenticación de usuarios.
 * Utiliza el DIContainer para obtener dependencias.
 * Implementa manejo de errores estandarizado y logging.
 */

import express from 'express';
import { container } from '../../di/DIContainer';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { ResponseFormatter } from '../../utils/ResponseFormatter';
import { logger } from '../../utils/Logger';
import { AuthenticationError } from '../../../domain/errors/CustomErrors';
import { JWTService } from '../../utils/JWTService';

const router = express.Router();

/**
 * POST /api/auth/login
 * Autentica un usuario y retorna JWT token
 */
router.post('/login', ErrorHandler.asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    logger.info('Login attempt', { username });

    const loginUseCase = container.getLoginUseCase();
    const result = await loginUseCase.execute(username, password);

    if (result) {
        logger.info('Login successful', { username, userId: result.user.id });
        res.json(ResponseFormatter.success({
            user: result.user,
            token: result.token,
            sessionId: result.sessionId
        }));
    } else {
        logger.warn('Login failed - invalid credentials', { username });
        throw new AuthenticationError('Invalid credentials');
    }
}));

/**
 * GET /api/auth/validate
 * Valida un token JWT y retorna datos del usuario
 */
router.get('/validate', ErrorHandler.asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader);

    if (!token) {
        throw new AuthenticationError('No token provided');
    }

    const validateSessionUseCase = container.getValidateSessionUseCase();
    const user = await validateSessionUseCase.execute(token);

    if (user) {
        logger.info('Session validated', { userId: user.id });
        res.json(ResponseFormatter.success({ user }));
    } else {
        logger.warn('Session validation failed');
        throw new AuthenticationError('Invalid or expired session');
    }
}));

/**
 * POST /api/auth/logout
 * Cierra sesión invalidando el sessionId
 */
router.post('/logout', ErrorHandler.asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = JWTService.extractTokenFromHeader(authHeader);

    if (!token) {
        throw new AuthenticationError('No token provided');
    }

    const payload = JWTService.verifyToken(token);
    if (!payload) {
        throw new AuthenticationError('Invalid token');
    }

    const logoutUseCase = container.getLogoutUseCase();
    await logoutUseCase.execute(payload.userId);

    logger.info('Logout successful', { userId: payload.userId });
    res.json(ResponseFormatter.success({ message: 'Logged out successfully' }));
}));

/**
 * POST /api/auth/register
 * Helper para desarrollo: Crear empleado inicial si no existe
 */
router.post('/register', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Employee registration attempt', { username: req.body.username });

    const employeeRepo = container.getEmployeeRepository();
    const newEmployee = await employeeRepo.create(req.body);

    logger.info('Employee registered successfully', { id: newEmployee.id });
    res.status(201).json(ResponseFormatter.success(newEmployee));
}));

export default router;
