/**
 * @file creditNoteRoutes.ts
 * @description Rutas de Notas de Crédito
 * 
 * @purpose
 * Define los endpoints para gestión de Notas de Crédito (crear, listar, verificar estado).
 * Utiliza el CreditNoteController para manejar la lógica.
 */

import { Router } from 'express';
import { container } from '../../di/DIContainer';
import { CreditNoteController } from '../../controllers/CreditNoteController';

const router = Router();

// Instantiate controller with dependencies from DI Container
const creditNoteController = new CreditNoteController(
    container.getGenerateCreditNoteUseCase(),
    container.getGetCreditNotesUseCase(),
    container.getCheckCreditNoteStatusUseCase()
);

/**
 * POST /api/credit-notes
 * Crear una nueva nota de crédito
 */
router.post('/', creditNoteController.create);

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
 */
router.post('/check-status', creditNoteController.checkStatus);

export default router;
