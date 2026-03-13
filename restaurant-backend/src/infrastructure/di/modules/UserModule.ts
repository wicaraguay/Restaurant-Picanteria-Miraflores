
import { RepositoryModule } from './RepositoryModule';
import { Login } from '../../../application/use-cases/Login';
import { ValidateSession } from '../../../application/use-cases/ValidateSession';
import { Logout } from '../../../application/use-cases/Logout';
import { GetEmployees } from '../../../application/use-cases/GetEmployees';
import { GetEmployee } from '../../../application/use-cases/GetEmployee';
import { CreateEmployee } from '../../../application/use-cases/CreateEmployee';
import { UpdateEmployee } from '../../../application/use-cases/UpdateEmployee';
import { DeleteEmployee } from '../../../application/use-cases/DeleteEmployee';
import { GetRoles } from '../../../application/use-cases/GetRoles';
import { CreateRole } from '../../../application/use-cases/CreateRole';
import { UpdateRole } from '../../../application/use-cases/UpdateRole';
import { DeleteRole } from '../../../application/use-cases/DeleteRole';
import { logger } from '../../utils/Logger';

export class UserModule {
    private loginUseCase?: Login;
    private validateSessionUseCase?: ValidateSession;
    private logoutUseCase?: Logout;
    private getEmployeesUseCase?: GetEmployees;
    private getEmployeeUseCase?: GetEmployee;
    private createEmployeeUseCase?: CreateEmployee;
    private updateEmployeeUseCase?: UpdateEmployee;
    private deleteEmployeeUseCase?: DeleteEmployee;
    private getRolesUseCase?: GetRoles;
    private createRoleUseCase?: CreateRole;
    private updateRoleUseCase?: UpdateRole;
    private deleteRoleUseCase?: DeleteRole;

    constructor(private repoModule: RepositoryModule) {}

    public getLoginUseCase(): Login {
        if (!this.loginUseCase) {
            this.loginUseCase = new Login(this.repoModule.getEmployeeRepository());
            logger.debug('Login use case instantiated');
        }
        return this.loginUseCase;
    }

    public getValidateSessionUseCase(): ValidateSession {
        if (!this.validateSessionUseCase) {
            this.validateSessionUseCase = new ValidateSession(this.repoModule.getEmployeeRepository());
            logger.debug('ValidateSession use case instantiated');
        }
        return this.validateSessionUseCase;
    }

    public getLogoutUseCase(): Logout {
        if (!this.logoutUseCase) {
            this.logoutUseCase = new Logout(this.repoModule.getEmployeeRepository());
            logger.debug('Logout use case instantiated');
        }
        return this.logoutUseCase;
    }

    public getGetEmployeesUseCase(): GetEmployees {
        if (!this.getEmployeesUseCase) {
            this.getEmployeesUseCase = new GetEmployees(this.repoModule.getEmployeeRepository());
            logger.debug('GetEmployees use case instantiated');
        }
        return this.getEmployeesUseCase;
    }

    public getGetEmployeeUseCase(): GetEmployee {
        if (!this.getEmployeeUseCase) {
            this.getEmployeeUseCase = new GetEmployee(this.repoModule.getEmployeeRepository());
            logger.debug('GetEmployee use case instantiated');
        }
        return this.getEmployeeUseCase;
    }

    public getCreateEmployeeUseCase(): CreateEmployee {
        if (!this.createEmployeeUseCase) {
            this.createEmployeeUseCase = new CreateEmployee(
                this.repoModule.getEmployeeRepository(),
                this.repoModule.getRoleRepository()
            );
            logger.debug('CreateEmployee use case instantiated');
        }
        return this.createEmployeeUseCase;
    }

    public getUpdateEmployeeUseCase(): UpdateEmployee {
        if (!this.updateEmployeeUseCase) {
            this.updateEmployeeUseCase = new UpdateEmployee(
                this.repoModule.getEmployeeRepository(),
                this.repoModule.getRoleRepository()
            );
            logger.debug('UpdateEmployee use case instantiated');
        }
        return this.updateEmployeeUseCase;
    }

    public getDeleteEmployeeUseCase(): DeleteEmployee {
        if (!this.deleteEmployeeUseCase) {
            this.deleteEmployeeUseCase = new DeleteEmployee(this.repoModule.getEmployeeRepository());
            logger.debug('DeleteEmployee use case instantiated');
        }
        return this.deleteEmployeeUseCase;
    }

    public getGetRolesUseCase(): GetRoles {
        if (!this.getRolesUseCase) {
            this.getRolesUseCase = new GetRoles(this.repoModule.getRoleRepository());
            logger.debug('GetRoles use case instantiated');
        }
        return this.getRolesUseCase;
    }

    public getCreateRoleUseCase(): CreateRole {
        if (!this.createRoleUseCase) {
            this.createRoleUseCase = new CreateRole(this.repoModule.getRoleRepository());
            logger.debug('CreateRole use case instantiated');
        }
        return this.createRoleUseCase;
    }

    public getUpdateRoleUseCase(): UpdateRole {
        if (!this.updateRoleUseCase) {
            this.updateRoleUseCase = new UpdateRole(this.repoModule.getRoleRepository());
            logger.debug('UpdateRole use case instantiated');
        }
        return this.updateRoleUseCase;
    }

    public getDeleteRoleUseCase(): DeleteRole {
        if (!this.deleteRoleUseCase) {
            this.deleteRoleUseCase = new DeleteRole(
                this.repoModule.getRoleRepository(),
                this.repoModule.getEmployeeRepository()
            );
            logger.debug('DeleteRole use case instantiated');
        }
        return this.deleteRoleUseCase;
    }

    public reset(): void {
        this.loginUseCase = undefined;
        this.validateSessionUseCase = undefined;
        this.logoutUseCase = undefined;
        this.getEmployeesUseCase = undefined;
        this.getEmployeeUseCase = undefined;
        this.createEmployeeUseCase = undefined;
        this.updateEmployeeUseCase = undefined;
        this.deleteEmployeeUseCase = undefined;
        this.getRolesUseCase = undefined;
        this.createRoleUseCase = undefined;
        this.updateRoleUseCase = undefined;
        this.deleteRoleUseCase = undefined;
    }
}
