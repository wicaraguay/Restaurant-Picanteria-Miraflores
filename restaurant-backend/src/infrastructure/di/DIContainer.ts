/**
 * Contenedor de Inyección de Dependencias - Patrón Singleton
 * 
 * Este archivo implementa un contenedor DI que gestiona todas las dependencias de la aplicación.
 * Centraliza la creación de repositorios y casos de uso, aplicando el patrón Factory.
 * Utiliza inicialización perezosa (lazy initialization) para mejor rendimiento.
 * Garantiza que todas las dependencias se resuelvan de forma type-safe.
 * 
 * Patrones utilizados: Singleton, Factory, Dependency Injection
 */

import { MongoCustomerRepository } from '../repositories/MongoCustomerRepository';
import { MongoEmployeeRepository } from '../repositories/MongoEmployeeRepository';
import { MongoOrderRepository } from '../repositories/MongoOrderRepository';
import { MongoMenuRepository } from '../repositories/MongoMenuRepository';
import { MongoRestaurantConfigRepository } from '../repositories/MongoRestaurantConfigRepository';
import { MongoBillRepository } from '../repositories/MongoBillRepository';

import { CreateCustomer } from '../../application/use-cases/CreateCustomer';
import { GetCustomers } from '../../application/use-cases/GetCustomers';
import { CreateOrder } from '../../application/use-cases/CreateOrder';
import { GetOrders } from '../../application/use-cases/GetOrders';
import { UpdateOrder } from '../../application/use-cases/UpdateOrder';
import { DeleteOrder } from '../../application/use-cases/DeleteOrder';
import { GetMenu } from '../../application/use-cases/GetMenu';
import { Login } from '../../application/use-cases/Login';
import { ValidateSession } from '../../application/use-cases/ValidateSession';
import { Logout } from '../../application/use-cases/Logout';
import { GetRestaurantConfig } from '../../application/use-cases/GetRestaurantConfig';
import { UpdateRestaurantConfig } from '../../application/use-cases/UpdateRestaurantConfig';
import { CreateBill } from '../../application/use-cases/CreateBill';
import { GetBills } from '../../application/use-cases/GetBills';

import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { IEmployeeRepository } from '../../domain/repositories/IEmployeeRepository';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { IMenuRepository } from '../../domain/repositories/IMenuRepository';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';

import { logger } from '../utils/Logger';

/**
 * Clase DIContainer - Implementa patrón Singleton
 * Gestiona todas las dependencias de la aplicación de forma centralizada
 */
export class DIContainer {
    private static instance: DIContainer;

    // Repositories
    private customerRepository?: ICustomerRepository;
    private employeeRepository?: IEmployeeRepository;
    private orderRepository?: IOrderRepository;
    private menuRepository?: IMenuRepository;
    private configRepository?: IRestaurantConfigRepository;
    private billRepository?: IBillRepository;

    // Use Cases
    private createCustomerUseCase?: CreateCustomer;
    private getCustomersUseCase?: GetCustomers;
    private createOrderUseCase?: CreateOrder;
    private getOrdersUseCase?: GetOrders;
    private updateOrderUseCase?: UpdateOrder;
    private deleteOrderUseCase?: DeleteOrder;
    private getMenuUseCase?: GetMenu;
    private loginUseCase?: Login;
    private validateSessionUseCase?: ValidateSession;
    private logoutUseCase?: Logout;
    private getRestaurantConfigUseCase?: GetRestaurantConfig;
    private updateRestaurantConfigUseCase?: UpdateRestaurantConfig;
    private createBillUseCase?: CreateBill;
    private getBillsUseCase?: GetBills;

    private constructor() {
        logger.info('DIContainer initialized');
    }

    public static getInstance(): DIContainer {
        if (!DIContainer.instance) {
            DIContainer.instance = new DIContainer();
        }
        return DIContainer.instance;
    }

    // Repository Getters (Lazy Initialization)

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

    // Use Case Getters (Lazy Initialization with Dependencies)

    public getCreateCustomerUseCase(): CreateCustomer {
        if (!this.createCustomerUseCase) {
            this.createCustomerUseCase = new CreateCustomer(this.getCustomerRepository());
            logger.debug('CreateCustomer use case instantiated');
        }
        return this.createCustomerUseCase;
    }

    public getGetCustomersUseCase(): GetCustomers {
        if (!this.getCustomersUseCase) {
            this.getCustomersUseCase = new GetCustomers(this.getCustomerRepository());
            logger.debug('GetCustomers use case instantiated');
        }
        return this.getCustomersUseCase;
    }

    public getCreateOrderUseCase(): CreateOrder {
        if (!this.createOrderUseCase) {
            this.createOrderUseCase = new CreateOrder(this.getOrderRepository());
            logger.debug('CreateOrder use case instantiated');
        }
        return this.createOrderUseCase;
    }

    public getGetOrdersUseCase(): GetOrders {
        if (!this.getOrdersUseCase) {
            this.getOrdersUseCase = new GetOrders(this.getOrderRepository());
            logger.debug('GetOrders use case instantiated');
        }
        return this.getOrdersUseCase;
    }

    public getUpdateOrderUseCase(): UpdateOrder {
        if (!this.updateOrderUseCase) {
            this.updateOrderUseCase = new UpdateOrder(this.getOrderRepository());
            logger.debug('UpdateOrder use case instantiated');
        }
        return this.updateOrderUseCase;
    }

    public getDeleteOrderUseCase(): DeleteOrder {
        if (!this.deleteOrderUseCase) {
            this.deleteOrderUseCase = new DeleteOrder(this.getOrderRepository());
            logger.debug('DeleteOrder use case instantiated');
        }
        return this.deleteOrderUseCase;
    }

    public getGetMenuUseCase(): GetMenu {
        if (!this.getMenuUseCase) {
            this.getMenuUseCase = new GetMenu(this.getMenuRepository());
            logger.debug('GetMenu use case instantiated');
        }
        return this.getMenuUseCase;
    }

    public getLoginUseCase(): Login {
        if (!this.loginUseCase) {
            this.loginUseCase = new Login(this.getEmployeeRepository());
            logger.debug('Login use case instantiated');
        }
        return this.loginUseCase;
    }

    public getValidateSessionUseCase(): ValidateSession {
        if (!this.validateSessionUseCase) {
            this.validateSessionUseCase = new ValidateSession(this.getEmployeeRepository());
            logger.debug('ValidateSession use case instantiated');
        }
        return this.validateSessionUseCase;
    }

    public getLogoutUseCase(): Logout {
        if (!this.logoutUseCase) {
            this.logoutUseCase = new Logout(this.getEmployeeRepository());
            logger.debug('Logout use case instantiated');
        }
        return this.logoutUseCase;
    }

    public getGetRestaurantConfigUseCase(): GetRestaurantConfig {
        if (!this.getRestaurantConfigUseCase) {
            this.getRestaurantConfigUseCase = new GetRestaurantConfig(this.getRestaurantConfigRepository());
            logger.debug('GetRestaurantConfig use case instantiated');
        }
        return this.getRestaurantConfigUseCase;
    }

    public getUpdateRestaurantConfigUseCase(): UpdateRestaurantConfig {
        if (!this.updateRestaurantConfigUseCase) {
            this.updateRestaurantConfigUseCase = new UpdateRestaurantConfig(this.getRestaurantConfigRepository());
            logger.debug('UpdateRestaurantConfig use case instantiated');
        }
        return this.updateRestaurantConfigUseCase;
    }

    public getCreateBillUseCase(): CreateBill {
        if (!this.createBillUseCase) {
            this.createBillUseCase = new CreateBill(this.getBillRepository());
            logger.debug('CreateBill use case instantiated');
        }
        return this.createBillUseCase;
    }

    public getGetBillsUseCase(): GetBills {
        if (!this.getBillsUseCase) {
            this.getBillsUseCase = new GetBills(this.getBillRepository());
            logger.debug('GetBills use case instantiated');
        }
        return this.getBillsUseCase;
    }

    /**
     * Reset all dependencies (useful for testing)
     */
    public reset(): void {
        this.customerRepository = undefined;
        this.employeeRepository = undefined;
        this.orderRepository = undefined;
        this.menuRepository = undefined;
        this.configRepository = undefined;
        this.billRepository = undefined;
        this.createCustomerUseCase = undefined;
        this.getCustomersUseCase = undefined;
        this.createOrderUseCase = undefined;
        this.getOrdersUseCase = undefined;
        this.updateOrderUseCase = undefined;
        this.deleteOrderUseCase = undefined;
        this.getMenuUseCase = undefined;
        this.loginUseCase = undefined;
        this.validateSessionUseCase = undefined;
        this.logoutUseCase = undefined;
        this.getRestaurantConfigUseCase = undefined;
        this.updateRestaurantConfigUseCase = undefined;
        this.createBillUseCase = undefined;
        this.getBillsUseCase = undefined;
        logger.info('DIContainer reset');
    }
}

// Export singleton instance
export const container = DIContainer.getInstance();
