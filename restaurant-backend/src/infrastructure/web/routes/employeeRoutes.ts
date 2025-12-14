/**
 * Rutas de Empleados
 * 
 * Define los endpoints para gestión CRUD de empleados.
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
 * GET /api/employees
 * Obtiene todos los empleados
 */
router.get('/', ErrorHandler.asyncHandler(async (req, res) => {
    logger.debug('Fetching all employees');

    const getEmployees = container.getGetEmployeesUseCase();
    const employees = await getEmployees.execute();

    logger.info('Employees fetched successfully', { count: employees.length });
    res.json(ResponseFormatter.success(employees));
}));

/**
 * GET /api/employees/:id
 * Obtiene un empleado por ID
 */
router.get('/:id', ErrorHandler.asyncHandler(async (req, res) => {
    logger.debug('Fetching employee by ID', { id: req.params.id });

    const getEmployee = container.getGetEmployeeUseCase();
    const employee = await getEmployee.execute(req.params.id);

    logger.info('Employee fetched successfully', { id: req.params.id });
    res.json(ResponseFormatter.success(employee));
}));

/**
 * POST /api/employees
 * Crea un nuevo empleado
 */
router.post('/', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Creating new employee', { username: req.body.username });

    const createEmployee = container.getCreateEmployeeUseCase();
    const employee = await createEmployee.execute(req.body);

    logger.info('Employee created successfully', { id: employee.id, username: employee.username });
    res.status(201).json(ResponseFormatter.success(employee));
}));

/**
 * PUT /api/employees/:id
 * Actualiza un empleado existente
 */
router.put('/:id', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Updating employee', { id: req.params.id });

    const updateEmployee = container.getUpdateEmployeeUseCase();
    const employee = await updateEmployee.execute(req.params.id, req.body);

    logger.info('Employee updated successfully', { id: employee.id });
    res.json(ResponseFormatter.success(employee));
}));

/**
 * DELETE /api/employees/:id
 * Elimina un empleado
 */
router.delete('/:id', ErrorHandler.asyncHandler(async (req, res) => {
    logger.info('Deleting employee', { id: req.params.id });

    const deleteEmployee = container.getDeleteEmployeeUseCase();
    await deleteEmployee.execute(req.params.id);

    logger.info('Employee deleted successfully', { id: req.params.id });
    res.json(ResponseFormatter.success({ message: 'Employee deleted successfully' }));
}));

export default router;
