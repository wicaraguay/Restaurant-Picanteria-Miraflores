/**
 * Rutas de Empleados
 * 
 * Define los endpoints para gestión CRUD de empleados.
 * Utiliza el DIContainer para obtener dependencias e inyectarlas en el EmployeeController.
 */

import express from 'express';
import { container } from '../../di/DIContainer';
import { EmployeeController } from '../../controllers/EmployeeController';

const router = express.Router();

// Instantiate controller with dependencies from DI Container
const employeeController = new EmployeeController(
    container.getCreateEmployeeUseCase(),
    container.getGetEmployeesUseCase(),
    container.getGetEmployeeUseCase(),
    container.getUpdateEmployeeUseCase(),
    container.getDeleteEmployeeUseCase()
);

/**
 * GET /api/employees
 * Obtiene todos los empleados
 */
router.get('/', employeeController.getAll);

/**
 * GET /api/employees/:id
 * Obtiene un empleado por ID
 */
router.get('/:id', employeeController.getById);

/**
 * POST /api/employees
 * Crea un nuevo empleado
 */
router.post('/', employeeController.create);

/**
 * PUT /api/employees/:id
 * Actualiza un empleado existente
 */
router.put('/:id', employeeController.update);

/**
 * DELETE /api/employees/:id
 * Elimina un empleado
 */
router.delete('/:id', employeeController.delete);

export default router;
