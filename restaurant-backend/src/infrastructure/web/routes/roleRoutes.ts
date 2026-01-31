/**
 * Rutas de Roles
 * 
 * Define los endpoints para gestión CRUD de roles.
 * Utiliza el DIContainer para obtener dependencias e inyectarlas en el RoleController.
 */

import express from 'express';
import { container } from '../../di/DIContainer';
import { RoleController } from '../../controllers/RoleController';

const router = express.Router();

// Instantiate controller with dependencies from DI Container
const roleController = new RoleController(
    container.getCreateRoleUseCase(),
    container.getGetRolesUseCase(),
    container.getUpdateRoleUseCase(),
    container.getDeleteRoleUseCase(),
    container.getRoleRepository()
);

/**
 * GET /api/roles
 * Obtiene todos los roles del sistema
 */
router.get('/', roleController.getAll);

/**
 * GET /api/roles/:id
 * Obtiene un rol por ID
 */
router.get('/:id', roleController.getById);

/**
 * POST /api/roles
 * Crea un nuevo rol
 */
router.post('/', roleController.create);

/**
 * PUT /api/roles/:id
 * Actualiza un rol existente
 */
router.put('/:id', roleController.update);

/**
 * DELETE /api/roles/:id
 * Elimina un rol
 */
router.delete('/:id', roleController.delete);

export default router;
