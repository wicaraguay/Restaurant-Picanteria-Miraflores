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
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user
 *     description: Authenticates a user with username and password, returns JWT token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 format: password
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     token:
 *                       type: string
 *                     sessionId:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/auth/validate:
 *   get:
 *     summary: Validate JWT token
 *     description: Validates a JWT token and returns user data
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *       401:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logs out user by invalidating the session
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
