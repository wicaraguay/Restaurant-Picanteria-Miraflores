/**
 * Rutas de Menú
 * 
 * Define los endpoints para gestión del menú (listar, crear items).
 * Utiliza el DIContainer y MenuController.
 */

import express from 'express';
import { container } from '../../di/DIContainer';
import { MenuController } from '../../controllers/MenuController';

const router = express.Router();

// Instantiate controller with dependencies from DI Container
const menuController = new MenuController(
    container.getGetMenuUseCase(),
    container.getCreateMenuUseCase(),
    container.getUpdateMenuUseCase(),
    container.getDeleteMenuUseCase()
);

// GET /api/menu - Obtener todo el menú (cacheado)
router.get('/', menuController.getAll);

// POST /api/menu - Crear un nuevo item
router.post('/', menuController.create);

// PUT /api/menu/:id - Actualizar un item
router.put('/:id', menuController.update);

// DELETE /api/menu/:id - Eliminar un item
router.delete('/:id', menuController.delete);

export default router;
