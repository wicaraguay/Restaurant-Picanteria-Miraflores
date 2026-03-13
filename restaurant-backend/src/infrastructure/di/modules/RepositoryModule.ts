
import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';
import { IEmployeeRepository } from '../../../domain/repositories/IEmployeeRepository';
import { IOrderRepository } from '../../../domain/repositories/IOrderRepository';
import { IMenuRepository } from '../../../domain/repositories/IMenuRepository';
import { IRestaurantConfigRepository } from '../../../domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../../domain/repositories/IBillRepository';
import { IRoleRepository } from '../../../domain/repositories/IRoleRepository';
import { ICreditNoteRepository } from '../../../domain/repositories/ICreditNoteRepository';

import { MongoCustomerRepository } from '../../repositories/MongoCustomerRepository';
import { MongoEmployeeRepository } from '../../repositories/MongoEmployeeRepository';
import { MongoOrderRepository } from '../../repositories/MongoOrderRepository';
import { MongoMenuRepository } from '../../repositories/MongoMenuRepository';
import { MongoRestaurantConfigRepository } from '../../repositories/MongoRestaurantConfigRepository';
import { MongoBillRepository } from '../../repositories/MongoBillRepository';
import { MongoRoleRepository } from '../../repositories/MongoRoleRepository';
import { MongoCreditNoteRepository } from '../../repositories/MongoCreditNoteRepository';
import { logger } from '../../utils/Logger';

export class RepositoryModule {
    private customerRepository?: ICustomerRepository;
    private employeeRepository?: IEmployeeRepository;
    private orderRepository?: IOrderRepository;
    private menuRepository?: IMenuRepository;
    private configRepository?: IRestaurantConfigRepository;
    private billRepository?: IBillRepository;
    private roleRepository?: IRoleRepository;
    private creditNoteRepository?: ICreditNoteRepository;

    public getCustomerRepository(): ICustomerRepository {
        if (!this.customerRepository) {
            this.customerRepository = new MongoCustomerRepository();
            logger.debug('CustomerRepository instantiated');
        }
        return this.customerRepository;
    }

    public getEmployeeRepository(): IEmployeeRepository {
        if (!this.employeeRepository) {
            this.employeeRepository = new MongoEmployeeRepository();
            logger.debug('EmployeeRepository instantiated');
        }
        return this.employeeRepository;
    }

    public getOrderRepository(): IOrderRepository {
        if (!this.orderRepository) {
            this.orderRepository = new MongoOrderRepository();
            logger.debug('OrderRepository instantiated');
        }
        return this.orderRepository;
    }

    public getMenuRepository(): IMenuRepository {
        if (!this.menuRepository) {
            this.menuRepository = new MongoMenuRepository();
            logger.debug('MenuRepository instantiated');
        }
        return this.menuRepository;
    }

    public getRestaurantConfigRepository(): IRestaurantConfigRepository {
        if (!this.configRepository) {
            this.configRepository = new MongoRestaurantConfigRepository();
            logger.debug('RestaurantConfigRepository instantiated');
        }
        return this.configRepository;
    }

    public getBillRepository(): IBillRepository {
        if (!this.billRepository) {
            this.billRepository = new MongoBillRepository();
            logger.debug('BillRepository instantiated');
        }
        return this.billRepository;
    }

    public getRoleRepository(): IRoleRepository {
        if (!this.roleRepository) {
            this.roleRepository = new MongoRoleRepository();
            logger.debug('RoleRepository instantiated');
        }
        return this.roleRepository;
    }

    public getCreditNoteRepository(): ICreditNoteRepository {
        if (!this.creditNoteRepository) {
            this.creditNoteRepository = new MongoCreditNoteRepository();
            logger.debug('CreditNoteRepository instantiated');
        }
        return this.creditNoteRepository;
    }

    public reset(): void {
        this.customerRepository = undefined;
        this.employeeRepository = undefined;
        this.orderRepository = undefined;
        this.menuRepository = undefined;
        this.configRepository = undefined;
        this.billRepository = undefined;
        this.roleRepository = undefined;
        this.creditNoteRepository = undefined;
    }
}
