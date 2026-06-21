/**
 * @file creditNoteRoutes.ts
 * @description Rutas de Notas de Crédito
 *
 * @purpose
 * Define los endpoints para gestión de Notas de Crédito (crear, listar, verificar estado).
 * Utiliza el CreditNoteController para manejar la lógica.
 * FIX D-02: Rate limiting aplicado a operaciones SRI
 */

import { Router } from 'express';
import { container } from '../../di/DIContainer';
import { CreditNoteController } from '../../controllers/CreditNoteController';
import { creditNoteLimiter, statusCheckLimiter } from '../middleware/RateLimitMiddleware';

const router = Router();

// Instantiate controller with dependencies from DI Container
const creditNoteController = new CreditNoteController(
    container.getGenerateCreditNoteUseCase(),
    container.getGetCreditNotesUseCase(),
    container.getCheckCreditNoteStatusUseCase(),
    container.getDeleteCreditNoteUseCase(),
    container.getRestaurantConfigRepository() // ← taxRate source of truth
);

/**
 * POST /api/credit-notes
 * Crear una nueva nota de crédito
 * FIX D-02: Rate limited to 10 per minute
 */
router.post('/', creditNoteLimiter, creditNoteController.create);

/**
 * GET /api/credit-notes
 * Obtener todas las notas de crédito con paginación y filtros
 */
router.get('/', creditNoteController.getAll);

/**
 * GET /api/credit-notes/:id
 * Obtener una nota de crédito por ID
 */
router.get('/:id', creditNoteController.getById);

/**
 * POST /api/credit-notes/check-status
 * Verificar estado de autorización en el SRI
 * FIX D-02: Rate limited to 30 per minute
 */
router.post('/check-status', statusCheckLimiter, creditNoteController.checkStatus);

/**
 * DELETE /api/credit-notes/:id
 * Eliminar una nota de crédito (solo administrador)
 */
router.delete('/:id', creditNoteController.delete);

export default router;
