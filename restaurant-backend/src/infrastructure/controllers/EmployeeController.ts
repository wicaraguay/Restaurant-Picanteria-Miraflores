import { Request, Response, NextFunction } from 'express';
import { CreateEmployee } from '../../application/use-cases/CreateEmployee';
import { GetEmployees } from '../../application/use-cases/GetEmployees';
import { GetEmployee } from '../../application/use-cases/GetEmployee';
import { UpdateEmployee } from '../../application/use-cases/UpdateEmployee';
import { DeleteEmployee } from '../../application/use-cases/DeleteEmployee';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';

export class EmployeeController {
    constructor(
        private createEmployee: CreateEmployee,
        private getEmployees: GetEmployees,
        private getEmployee: GetEmployee,
        private updateEmployee: UpdateEmployee,
        private deleteEmployee: DeleteEmployee
    ) { }

    public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.debug('Fetching all employees');
            const employees = await this.getEmployees.execute();
            logger.info('Employees fetched successfully', { count: employees.length });
            res.json(ResponseFormatter.success(employees));
        } catch (error) {
            next(error);
        }
    };

    public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.debug('Fetching employee by ID', { id: req.params.id });
            const employee = await this.getEmployee.execute(req.params.id);
            logger.info('Employee fetched successfully', { id: req.params.id });
            res.json(ResponseFormatter.success(employee));
        } catch (error) {
            next(error);
        }
    };

    public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Creating new employee', { username: req.body.username });
            const employee = await this.createEmployee.execute(req.body);
            logger.info('Employee created successfully', { id: employee.id, username: employee.username });
            res.status(201).json(ResponseFormatter.success(employee));
        } catch (error) {
            next(error);
        }
    };

    public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Updating employee', { id: req.params.id });
            const employee = await this.updateEmployee.execute(req.params.id, req.body);
            logger.info('Employee updated successfully', { id: employee.id });
            res.json(ResponseFormatter.success(employee));
        } catch (error) {
            next(error);
        }
    };

    public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Deleting employee', { id: req.params.id });
            await this.deleteEmployee.execute(req.params.id);
            logger.info('Employee deleted successfully', { id: req.params.id });
            res.json(ResponseFormatter.success({ message: 'Employee deleted successfully' }));
        } catch (error) {
            next(error);
        }
    };
}
