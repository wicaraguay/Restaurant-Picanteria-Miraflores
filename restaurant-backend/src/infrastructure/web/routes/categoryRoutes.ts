/**
 * Rutas de Categorías
 *
 * Define los endpoints para gestión CRUD de categorías.
 * Utiliza el DIContainer para obtener dependencias e inyectarlas en el CategoryController.
 */

import express from 'express';
import { container } from '../../di/DIContainer';
import { CategoryController } from '../../controllers/CategoryController';

const router = express.Router();

// Instantiate controller with dependencies from DI Container
const categoryController = new CategoryController(
    container.getCreateCategoryUseCase(),
    container.getUpdateCategoryUseCase(),
    container.getDeleteCategoryUseCase(),
    container.getGetCategoriesUseCase(),
    container.getReorderCategoriesUseCase(),
    container.getCategoryRepository()
);

/**
 * GET /api/categories
 * Obtiene todas las categorías
 * Query params: productType, visibleOnWebsite, includeProductCount
 */
router.get('/', categoryController.getAll);

/**
 * GET /api/categories/:id
 * Obtiene una categoría por ID
 */
router.get('/:id', categoryController.getById);

/**
 * POST /api/categories
 * Crea una nueva categoría
 */
router.post('/', categoryController.create);

/**
 * PATCH /api/categories/reorder
 * Reordena las categorías
 * Body: { items: [{ id: string, sortOrder: number }] }
 */
router.patch('/reorder', categoryController.reorder);

/**
 * PUT /api/categories/:id
 * Actualiza una categoría existente
 */
router.put('/:id', categoryController.update);

/**
 * DELETE /api/categories/:id
 * Elimina una categoría
 */
router.delete('/:id', categoryController.delete);

export default router;
