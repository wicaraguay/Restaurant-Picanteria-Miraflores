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

import { SRIService } from '../services/SRIService';
import { PDFService } from '../services/PDFService';
import { EmailService } from '../services/EmailService';

import { MongoCustomerRepository } from '../repositories/MongoCustomerRepository';
import { MongoEmployeeRepository } from '../repositories/MongoEmployeeRepository';
import { MongoOrderRepository } from '../repositories/MongoOrderRepository';
import { MongoMenuRepository } from '../repositories/MongoMenuRepository';
import { MongoRestaurantConfigRepository } from '../repositories/MongoRestaurantConfigRepository';
import { MongoBillRepository } from '../repositories/MongoBillRepository';
import { MongoRoleRepository } from '../repositories/MongoRoleRepository';
import { MongoCreditNoteRepository } from '../repositories/MongoCreditNoteRepository';

import { OrderController } from '../controllers/OrderController';
import { CustomerController } from '../controllers/CustomerController';

import { CreateCustomer } from '../../application/use-cases/CreateCustomer';
import { GetCustomers } from '../../application/use-cases/GetCustomers';
import { CreateOrder } from '../../application/use-cases/CreateOrder';
import { GetOrders } from '../../application/use-cases/GetOrders';
import { UpdateOrder } from '../../application/use-cases/UpdateOrder';
import { DeleteOrder } from '../../application/use-cases/DeleteOrder';
import { GetMenu } from '../../application/use-cases/GetMenu';
import { CreateMenu } from '../../application/use-cases/CreateMenu';
import { UpdateMenu } from '../../application/use-cases/UpdateMenu';
import { DeleteMenu } from '../../application/use-cases/DeleteMenu';
import { GenerateInvoice } from '../../application/use-cases/GenerateInvoice';
import { CheckInvoiceStatus } from '../../application/use-cases/CheckInvoiceStatus';
import { Login } from '../../application/use-cases/Login';
import { ValidateSession } from '../../application/use-cases/ValidateSession';
import { Logout } from '../../application/use-cases/Logout';
import { GetRestaurantConfig } from '../../application/use-cases/GetRestaurantConfig';
import { UpdateRestaurantConfig } from '../../application/use-cases/UpdateRestaurantConfig';
import { CreateBill } from '../../application/use-cases/CreateBill';
import { GetBills } from '../../application/use-cases/GetBills';
import { DeleteBill } from '../../application/use-cases/DeleteBill';
import { GenerateCreditNote } from '../../application/use-cases/GenerateCreditNote';
import { GetCreditNotes } from '../../application/use-cases/GetCreditNotes';
import { CheckCreditNoteStatus } from '../../application/use-cases/CheckCreditNoteStatus';
import { GetRoles } from '../../application/use-cases/GetRoles';
import { CreateRole } from '../../application/use-cases/CreateRole';
import { UpdateRole } from '../../application/use-cases/UpdateRole';
import { DeleteRole } from '../../application/use-cases/DeleteRole';
import { GetEmployees } from '../../application/use-cases/GetEmployees';
import { GetEmployee } from '../../application/use-cases/GetEmployee';
import { CreateEmployee } from '../../application/use-cases/CreateEmployee';
import { UpdateEmployee } from '../../application/use-cases/UpdateEmployee';
import { DeleteEmployee } from '../../application/use-cases/DeleteEmployee';
import { ResetBillingSystem } from '../../application/use-cases/ResetBillingSystem';

import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { IEmployeeRepository } from '../../domain/repositories/IEmployeeRepository';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { IMenuRepository } from '../../domain/repositories/IMenuRepository';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { IRoleRepository } from '../../domain/repositories/IRoleRepository';
import { ICreditNoteRepository } from '../../domain/repositories/ICreditNoteRepository';

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
    private roleRepository?: IRoleRepository;
    private creditNoteRepository?: ICreditNoteRepository;

    // Controllers
    private orderController?: OrderController;
    private customerController?: CustomerController;

    // Use Cases
    private createCustomerUseCase?: CreateCustomer;
    private getCustomersUseCase?: GetCustomers;
    private createOrderUseCase?: CreateOrder;
    private getOrdersUseCase?: GetOrders;
    private updateOrderUseCase?: UpdateOrder;
    private deleteOrderUseCase?: DeleteOrder;
    private getMenuUseCase?: GetMenu;
    private createMenuUseCase?: CreateMenu;
    private updateMenuUseCase?: UpdateMenu;
    private deleteMenuUseCase?: DeleteMenu;
    private generateInvoiceUseCase?: GenerateInvoice;
    private checkInvoiceStatusUseCase?: CheckInvoiceStatus;

    // Services
    private sriService?: SRIService;
    private pdfService?: PDFService;
    private emailService?: EmailService;

    private loginUseCase?: Login;
    private validateSessionUseCase?: ValidateSession;
    private logoutUseCase?: Logout;
    private getRestaurantConfigUseCase?: GetRestaurantConfig;
    private updateRestaurantConfigUseCase?: UpdateRestaurantConfig;
    private createBillUseCase?: CreateBill;
    private getBillsUseCase?: GetBills;
    private getRolesUseCase?: GetRoles;
    private createRoleUseCase?: CreateRole;
    private updateRoleUseCase?: UpdateRole;
    private deleteRoleUseCase?: DeleteRole;
    private getEmployeesUseCase?: GetEmployees;
    private getEmployeeUseCase?: GetEmployee;
    private createEmployeeUseCase?: CreateEmployee;
    private updateEmployeeUseCase?: UpdateEmployee;
    private deleteEmployeeUseCase?: DeleteEmployee;
    private deleteBillUseCase?: DeleteBill;
    private generateCreditNoteUseCase?: GenerateCreditNote;
    private getCreditNotesUseCase?: GetCreditNotes;
    private checkCreditNoteStatusUseCase?: CheckCreditNoteStatus;
    private resetBillingSystemUseCase?: ResetBillingSystem;

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

    // Controllers
    public getOrderController(): OrderController {
        if (!this.orderController) {
            this.orderController = new OrderController(
                this.getCreateOrderUseCase(),
                this.getGetOrdersUseCase(),
                this.getUpdateOrderUseCase(),
                this.getDeleteOrderUseCase()
            );
            logger.debug('OrderController instantiated');
        }
        return this.orderController;
    }

    public getCustomerController(): CustomerController {
        if (!this.customerController) {
            this.customerController = new CustomerController(
                this.getCreateCustomerUseCase(),
                this.getGetCustomersUseCase()
            );
            logger.debug('CustomerController instantiated');
        }
        return this.customerController;
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

    public getCreateMenuUseCase(): CreateMenu {
        if (!this.createMenuUseCase) {
            this.createMenuUseCase = new CreateMenu(this.getMenuRepository());
            logger.debug('CreateMenu use case instantiated');
        }
        return this.createMenuUseCase;
    }

    public getUpdateMenuUseCase(): UpdateMenu {
        if (!this.updateMenuUseCase) {
            this.updateMenuUseCase = new UpdateMenu(this.getMenuRepository());
            logger.debug('UpdateMenu use case instantiated');
        }
        return this.updateMenuUseCase;
    }

    public getDeleteMenuUseCase(): DeleteMenu {
        if (!this.deleteMenuUseCase) {
            this.deleteMenuUseCase = new DeleteMenu(this.getMenuRepository());
            logger.debug('DeleteMenu use case instantiated');
        }
        return this.deleteMenuUseCase;
    }

    // Services
    public getSRIService(): SRIService {
        if (!this.sriService) {
            this.sriService = new SRIService();
            logger.debug('SRIService instantiated');
        }
        return this.sriService;
    }

    public getPDFService(): PDFService {
        if (!this.pdfService) {
            this.pdfService = new PDFService();
            logger.debug('PDFService instantiated');
        }
        return this.pdfService;
    }

    public getEmailService(): EmailService {
        if (!this.emailService) {
            this.emailService = new EmailService();
            logger.debug('EmailService instantiated');
        }
        return this.emailService;
    }

    public getGenerateInvoiceUseCase(): GenerateInvoice {
        if (!this.generateInvoiceUseCase) {
            this.generateInvoiceUseCase = new GenerateInvoice(
                this.getRestaurantConfigRepository(),
                this.getBillRepository(),
                this.getOrderRepository(),
                this.getSRIService(),
                this.getPDFService(),
                this.getEmailService()
            );
            logger.debug('GenerateInvoice use case instantiated');
        }
        return this.generateInvoiceUseCase;
    }

    public getCheckInvoiceStatusUseCase(): CheckInvoiceStatus {
        if (!this.checkInvoiceStatusUseCase) {
            this.checkInvoiceStatusUseCase = new CheckInvoiceStatus(
                this.getRestaurantConfigRepository(),
                this.getBillRepository(),
                this.getOrderRepository(),
                this.getSRIService(),
                this.getPDFService(),
                this.getEmailService()
            );
            logger.debug('CheckInvoiceStatus use case instantiated');
        }
        return this.checkInvoiceStatusUseCase;
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

    public getDeleteBillUseCase(): DeleteBill {
        if (!this.deleteBillUseCase) {
            this.deleteBillUseCase = new DeleteBill(this.getBillRepository());
            logger.debug('DeleteBill use case instantiated');
        }
        return this.deleteBillUseCase;
    }

    public getGetRolesUseCase(): GetRoles {
        if (!this.getRolesUseCase) {
            this.getRolesUseCase = new GetRoles(this.getRoleRepository());
            logger.debug('GetRoles use case instantiated');
        }
        return this.getRolesUseCase;
    }

    public getCreateRoleUseCase(): CreateRole {
        if (!this.createRoleUseCase) {
            this.createRoleUseCase = new CreateRole(this.getRoleRepository());
            logger.debug('CreateRole use case instantiated');
        }
        return this.createRoleUseCase;
    }

    public getUpdateRoleUseCase(): UpdateRole {
        if (!this.updateRoleUseCase) {
            this.updateRoleUseCase = new UpdateRole(this.getRoleRepository());
            logger.debug('UpdateRole use case instantiated');
        }
        return this.updateRoleUseCase;
    }

    public getDeleteRoleUseCase(): DeleteRole {
        if (!this.deleteRoleUseCase) {
            this.deleteRoleUseCase = new DeleteRole(this.getRoleRepository(), this.getEmployeeRepository());
            logger.debug('DeleteRole use case instantiated');
        }
        return this.deleteRoleUseCase;
    }

    public getGetEmployeesUseCase(): GetEmployees {
        if (!this.getEmployeesUseCase) {
            this.getEmployeesUseCase = new GetEmployees(this.getEmployeeRepository());
            logger.debug('GetEmployees use case instantiated');
        }
        return this.getEmployeesUseCase;
    }

    public getGetEmployeeUseCase(): GetEmployee {
        if (!this.getEmployeeUseCase) {
            this.getEmployeeUseCase = new GetEmployee(this.getEmployeeRepository());
            logger.debug('GetEmployee use case instantiated');
        }
        return this.getEmployeeUseCase;
    }

    public getCreateEmployeeUseCase(): CreateEmployee {
        if (!this.createEmployeeUseCase) {
            this.createEmployeeUseCase = new CreateEmployee(this.getEmployeeRepository(), this.getRoleRepository());
            logger.debug('CreateEmployee use case instantiated');
        }
        return this.createEmployeeUseCase;
    }

    public getUpdateEmployeeUseCase(): UpdateEmployee {
        if (!this.updateEmployeeUseCase) {
            this.updateEmployeeUseCase = new UpdateEmployee(this.getEmployeeRepository(), this.getRoleRepository());
            logger.debug('UpdateEmployee use case instantiated');
        }
        return this.updateEmployeeUseCase;
    }

    public getDeleteEmployeeUseCase(): DeleteEmployee {
        if (!this.deleteEmployeeUseCase) {
            this.deleteEmployeeUseCase = new DeleteEmployee(this.getEmployeeRepository());
            logger.debug('DeleteEmployee use case instantiated');
        }
        return this.deleteEmployeeUseCase;
    }

    public getGenerateCreditNoteUseCase(): GenerateCreditNote {
        if (!this.generateCreditNoteUseCase) {
            this.generateCreditNoteUseCase = new GenerateCreditNote(
                this.getRestaurantConfigRepository(),
                this.getCreditNoteRepository(),
                this.getBillRepository(),
                this.getSRIService(),
                this.getPDFService(),
                this.getEmailService()
            );
            logger.debug('GenerateCreditNote use case instantiated');
        }
        return this.generateCreditNoteUseCase;
    }

    public getGetCreditNotesUseCase(): GetCreditNotes {
        if (!this.getCreditNotesUseCase) {
            this.getCreditNotesUseCase = new GetCreditNotes(this.getCreditNoteRepository());
            logger.debug('GetCreditNotes use case instantiated');
        }
        return this.getCreditNotesUseCase;
    }

    public getCheckCreditNoteStatusUseCase(): CheckCreditNoteStatus {
        if (!this.checkCreditNoteStatusUseCase) {
            this.checkCreditNoteStatusUseCase = new CheckCreditNoteStatus(
                this.getCreditNoteRepository(),
                this.getSRIService()
            );
            logger.debug('CheckCreditNoteStatus use case instantiated');
        }
        return this.checkCreditNoteStatusUseCase;
    }

    public getResetBillingSystemUseCase(): ResetBillingSystem {
        if (!this.resetBillingSystemUseCase) {
            this.resetBillingSystemUseCase = new ResetBillingSystem();
            logger.debug('ResetBillingSystem use case instantiated');
        }
        return this.resetBillingSystemUseCase;
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
        this.createMenuUseCase = undefined;
        this.updateMenuUseCase = undefined;
        this.deleteMenuUseCase = undefined;
        this.loginUseCase = undefined;
        this.validateSessionUseCase = undefined;
        this.logoutUseCase = undefined;
        this.getRestaurantConfigUseCase = undefined;
        this.updateRestaurantConfigUseCase = undefined;
        this.createBillUseCase = undefined;
        this.getBillsUseCase = undefined;
        this.deleteBillUseCase = undefined;
        this.roleRepository = undefined;
        this.getRolesUseCase = undefined;
        this.createRoleUseCase = undefined;
        this.updateRoleUseCase = undefined;
        this.deleteRoleUseCase = undefined;
        this.getEmployeesUseCase = undefined;
        this.getEmployeeUseCase = undefined;
        this.createEmployeeUseCase = undefined;
        this.updateEmployeeUseCase = undefined;
        this.deleteEmployeeUseCase = undefined;
        this.generateInvoiceUseCase = undefined;
        this.checkInvoiceStatusUseCase = undefined;
        this.sriService = undefined;
        this.pdfService = undefined;
        this.emailService = undefined;
        this.emailService = undefined;
        this.resetBillingSystemUseCase = undefined;
        logger.info('DIContainer reset');
    }
}

// Export singleton instance
export const container = DIContainer.getInstance();
