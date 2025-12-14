/**
 * Rutas de Roles
 * 
 * Define los endpoints para gestión CRUD de roles.
 * Utiliza el DIContainer para obtener dependencias.
 * Implementa manejo de errores estandarizado y logging.
 */

import express from 'express';
import { container } from '../../di/DIContainer';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { ResponseFormatter } from '../../utils/ResponseFormatter';
import { logger } from '../../utils/Logger';

const router = express.Router();

/**
 * GET /api/roles
 * Obtiene todos los roles del sistema
 */
router.get('/', ErrorHandler.asyncHandler(async (req, res) => {
    logger.debug('Fetching all roles');

    const getRoles = container.getGetRolesUseCase();
    const roles = await getRoles.execute();

    logger.info('Roles fetched successfully', { count: roles.length });
    res.json(ResponseFormatter.success(roles));
}));

/**
 * GET /api/roles/:id
 * Obtiene un rol por ID
 */
router.get('/:id', ErrorHandler.asyncHandler(async (req, res) => {
    logger.debug('Fetching role by ID', { id: req.params.id });

    const roleRepo = container.getRoleRepository();
    const role = await roleRepo.findById(req.params.id);

    if (!role) {
        logger.warn('Role not found', { id: req.params.id });
        return res.status(404).json(ResponseFormatter.error('ROLE_NOT_FOUND', 'Role not found'));
    }

    logger.info('Role fetched successfully', { id: req.params.id });
    res.json(ResponseFormatter.success(role));
}));

/**
 * POST /api/roles
 * Crea un nuevo rol
 */
router.post('/', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Creating new role', { name: req.body.name });

    const createRole = container.getCreateRoleUseCase();
    const role = await createRole.execute(req.body);

    logger.info('Role created successfully', { id: role.id, name: role.name });
    res.status(201).json(ResponseFormatter.success(role));
}));

/**
 * PUT /api/roles/:id
 * Actualiza un rol existente
 */
router.put('/:id', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Updating role', { id: req.params.id });

    const updateRole = container.getUpdateRoleUseCase();
    const role = await updateRole.execute(req.params.id, req.body);

    logger.info('Role updated successfully', { id: role.id });
    res.json(ResponseFormatter.success(role));
}));

/**
 * DELETE /api/roles/:id
 * Elimina un rol
 */
router.delete('/:id', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Deleting role', { id: req.params.id });

    const deleteRole = container.getDeleteRoleUseCase();
    await deleteRole.execute(req.params.id);

    logger.info('Role deleted successfully', { id: req.params.id });
    res.json(ResponseFormatter.success({ message: 'Role deleted successfully' }));
}));

export default router;
