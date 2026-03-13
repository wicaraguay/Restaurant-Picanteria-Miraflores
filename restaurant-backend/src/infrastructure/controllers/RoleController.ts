import { Request, Response, NextFunction } from 'express';
import { CreateRole } from '../../application/use-cases/CreateRole';
import { GetRoles } from '../../application/use-cases/GetRoles';
import { UpdateRole } from '../../application/use-cases/UpdateRole';
import { DeleteRole } from '../../application/use-cases/DeleteRole';
import { IRoleRepository } from '../../domain/repositories/IRoleRepository';
import { ResponseFormatter } from '../utils/ResponseFormatter';
import { logger } from '../utils/Logger';
import { NotFoundError } from '../../domain/errors/CustomErrors';

export class RoleController {
    constructor(
        private createRole: CreateRole,
        private getRoles: GetRoles,
        private updateRole: UpdateRole,
        private deleteRole: DeleteRole,
        private roleRepository: IRoleRepository
    ) { }

    public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.debug('Fetching all roles');
            const roles = await this.getRoles.execute();
            logger.info('Roles fetched successfully', { count: roles.length });
            res.json(ResponseFormatter.success(roles));
        } catch (error) {
            next(error);
        }
    };

    public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.debug('Fetching role by ID', { id: req.params.id });
            const role = await this.roleRepository.findById(req.params.id);

            if (!role) {
                throw new NotFoundError('Role not found', 'Role');
            }

            logger.info('Role fetched successfully', { id: req.params.id });
            res.json(ResponseFormatter.success(role));
        } catch (error) {
            next(error);
        }
    };

    public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Creating new role', { name: req.body.name });
            const role = await this.createRole.execute(req.body);
            logger.info('Role created successfully', { id: role.id, name: role.name });
            res.status(201).json(ResponseFormatter.success(role));
        } catch (error) {
            next(error);
        }
    };

    public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Updating role', { id: req.params.id });
            const role = await this.updateRole.execute(req.params.id, req.body);
            logger.info('Role updated successfully', { id: role.id });
            res.json(ResponseFormatter.success(role));
        } catch (error) {
            next(error);
        }
    };

    public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            logger.info('Deleting role', { id: req.params.id });
            await this.deleteRole.execute(req.params.id);
            logger.info('Role deleted successfully', { id: req.params.id });
            res.json(ResponseFormatter.success({ message: 'Role deleted successfully' }));
        } catch (error) {
            next(error);
        }
    };
}
