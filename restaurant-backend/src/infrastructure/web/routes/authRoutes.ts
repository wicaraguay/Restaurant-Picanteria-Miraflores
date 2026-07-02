/**
 * Rutas de Autenticación
 * 
 * Define los endpoints relacionados con autenticación de usuarios.
 * Utiliza el DIContainer para obtener dependencias.
 * Implementa manejo de errores estandarizado y logging.
 */

import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { container } from '../../di/DIContainer';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { ResponseFormatter } from '../../utils/ResponseFormatter';
import { logger } from '../../utils/Logger';
import { AuthenticationError, ValidationError } from '../../../domain/errors/CustomErrors';
import { JWTService } from '../../utils/JWTService';
import { jwtAuthMiddleware } from '../middleware/JWTAuthMiddleware';
import { ResendEmailService } from '../../services/ResendEmailService';

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

/**
 * PUT /api/auth/change-password
 * Cambiar contraseña (usuario autenticado)
 */
router.put('/change-password', jwtAuthMiddleware, ErrorHandler.asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user?.userId;

    if (!currentPassword || !newPassword) {
        throw new ValidationError('Se requiere contraseña actual y nueva');
    }

    if (newPassword.length < 6) {
        throw new ValidationError('La nueva contraseña debe tener al menos 6 caracteres');
    }

    const employeeRepo = container.getEmployeeRepository();
    const employee = await employeeRepo.findByUsername((req as any).user?.username);

    if (!employee || !employee.password) {
        throw new AuthenticationError('Usuario no encontrado');
    }

    const isValid = await bcrypt.compare(currentPassword, employee.password);
    if (!isValid) {
        throw new AuthenticationError('Contraseña actual incorrecta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await employeeRepo.updatePassword(userId, hashedPassword);

    logger.info('Password changed successfully', { userId });
    res.json(ResponseFormatter.success({ message: 'Contraseña actualizada correctamente' }));
}));

/**
 * PUT /api/auth/profile
 * Actualizar perfil del usuario autenticado
 */
router.put('/profile', jwtAuthMiddleware, ErrorHandler.asyncHandler(async (req, res) => {
    const userId = (req as any).user?.userId;
    const { name, email, phone } = req.body;

    const employeeRepo = container.getEmployeeRepository();

    // Verificar si el email ya existe en otro usuario
    if (email) {
        const existingWithEmail = await employeeRepo.findByEmail(email);
        if (existingWithEmail && existingWithEmail.id !== userId) {
            throw new ValidationError('Este email ya está en uso');
        }
    }

    const updated = await employeeRepo.update(userId, { name, email, phone });

    if (!updated) {
        throw new AuthenticationError('Usuario no encontrado');
    }

    logger.info('Profile updated', { userId });
    res.json(ResponseFormatter.success(updated));
}));

/**
 * GET /api/auth/me
 * Obtener datos del usuario autenticado
 */
router.get('/me', jwtAuthMiddleware, ErrorHandler.asyncHandler(async (req, res) => {
    const userId = (req as any).user?.userId;

    const employeeRepo = container.getEmployeeRepository();
    const employee = await employeeRepo.findById(userId);

    if (!employee) {
        throw new AuthenticationError('Usuario no encontrado');
    }

    // No enviar password
    const { password, resetPasswordToken, resetPasswordExpires, ...safeEmployee } = employee;

    res.json(ResponseFormatter.success(safeEmployee));
}));

/**
 * POST /api/auth/forgot-password
 * Solicitar recuperación de contraseña
 */
router.post('/forgot-password', ErrorHandler.asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ValidationError('Se requiere el email');
    }

    const employeeRepo = container.getEmployeeRepository();
    const employee = await employeeRepo.findByEmail(email.toLowerCase());

    // Siempre responder igual para no revelar si el email existe
    if (!employee) {
        logger.warn('Password reset requested for non-existent email', { email });
        res.json(ResponseFormatter.success({
            message: 'Si el email existe, recibirás instrucciones para recuperar tu contraseña'
        }));
        return;
    }

    // Generar token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await employeeRepo.setResetPasswordToken(employee.id, resetToken, resetExpires);

    // Enviar email
    try {
        const emailService = new ResendEmailService();
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

        await emailService.sendPasswordResetEmail(email, employee.name, resetUrl);
        logger.info('Password reset email sent', { email });
    } catch (error) {
        logger.error('Failed to send password reset email', error);
    }

    res.json(ResponseFormatter.success({
        message: 'Si el email existe, recibirás instrucciones para recuperar tu contraseña'
    }));
}));

/**
 * POST /api/auth/reset-password
 * Resetear contraseña con token
 */
router.post('/reset-password', ErrorHandler.asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        throw new ValidationError('Se requiere token y nueva contraseña');
    }

    if (newPassword.length < 6) {
        throw new ValidationError('La contraseña debe tener al menos 6 caracteres');
    }

    const employeeRepo = container.getEmployeeRepository();
    const employee = await employeeRepo.findByResetToken(token);

    if (!employee) {
        throw new AuthenticationError('Token inválido o expirado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await employeeRepo.updatePassword(employee.id, hashedPassword);

    logger.info('Password reset successful', { userId: employee.id });
    res.json(ResponseFormatter.success({ message: 'Contraseña actualizada correctamente' }));
}));

/**
 * GET /api/auth/verify-reset-token
 * Verificar si un token de reset es válido
 */
router.get('/verify-reset-token', ErrorHandler.asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
        throw new ValidationError('Se requiere token');
    }

    const employeeRepo = container.getEmployeeRepository();
    const employee = await employeeRepo.findByResetToken(token as string);

    if (!employee) {
        throw new AuthenticationError('Token inválido o expirado');
    }

    res.json(ResponseFormatter.success({ valid: true, name: employee.name }));
}));

export default router;
