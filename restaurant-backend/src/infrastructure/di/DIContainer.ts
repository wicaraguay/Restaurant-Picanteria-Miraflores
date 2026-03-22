/**
 * Contenedor de Inyección de Dependencias - Patrón Singleton (Modularizado)
 * 
 * Este archivo actúa como una fachada que orquest Taylor el acceso a las dependencias
 * de la aplicación, delegando la instanciación a módulos especializados.
 */

import { RepositoryModule } from './modules/RepositoryModule';
import { UserModule } from './modules/UserModule';
import { OrderModule } from './modules/OrderModule';
import { BillingModule } from './modules/BillingModule';

import { logger } from '../utils/Logger';

// Domain Interfaces
import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { IEmployeeRepository } from '../../domain/repositories/IEmployeeRepository';
import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { IMenuRepository } from '../../domain/repositories/IMenuRepository';
import { IRestaurantConfigRepository } from '../../domain/repositories/IRestaurantConfigRepository';
import { IBillRepository } from '../../domain/repositories/IBillRepository';
import { IRoleRepository } from '../../domain/repositories/IRoleRepository';
import { ICreditNoteRepository } from '../../domain/repositories/ICreditNoteRepository';

// Infrastructure Services
import { SRIService } from '../services/SRIService';
import { PDFService } from '../services/PDFService';
import { IEmailService } from '../../application/interfaces/IEmailService';
import { BillingService } from '../../application/services/BillingService';

// Controllers
import { OrderController } from '../controllers/OrderController';
import { CustomerController } from '../controllers/CustomerController';
import { BillingController } from '../controllers/BillingController';

// Use Cases
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
import { LookupCustomer } from '../../application/use-cases/LookupCustomer';
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
import { RetryInvoices } from '../../application/use-cases/RetryInvoices';
import { CronService } from '../services/CronService';
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
import { ResetFullSystem } from '../../application/use-cases/ResetFullSystem';

export class DIContainer {
    private static instance: DIContainer;

    private repoModule: RepositoryModule;
    private userModule: UserModule;
    private orderModule: OrderModule;
    private billingModule: BillingModule;

    private constructor() {
        this.repoModule = new RepositoryModule();
        this.userModule = new UserModule(this.repoModule);
        this.orderModule = new OrderModule(this.repoModule);
        this.billingModule = new BillingModule(this.repoModule);
        logger.info('DIContainer initialized (Modularized)');
    }

    public static getInstance(): DIContainer {
        if (!DIContainer.instance) {
            DIContainer.instance = new DIContainer();
        }
        return DIContainer.instance;
    }

    // --- Repositories ---
    public getCustomerRepository(): ICustomerRepository { return this.repoModule.getCustomerRepository(); }
    public getEmployeeRepository(): IEmployeeRepository { return this.repoModule.getEmployeeRepository(); }
    public getOrderRepository(): IOrderRepository { return this.repoModule.getOrderRepository(); }
    public getMenuRepository(): IMenuRepository { return this.repoModule.getMenuRepository(); }
    public getRestaurantConfigRepository(): IRestaurantConfigRepository { return this.repoModule.getRestaurantConfigRepository(); }
    public getBillRepository(): IBillRepository { return this.repoModule.getBillRepository(); }
    public getRoleRepository(): IRoleRepository { return this.repoModule.getRoleRepository(); }
    public getCreditNoteRepository(): ICreditNoteRepository { return this.repoModule.getCreditNoteRepository(); }

    // --- Services ---
    public getSRIService(): SRIService { return this.billingModule.getSRIService(); }
    public getPDFService(): PDFService { return this.billingModule.getPDFService(); }
    public getEmailService(): IEmailService { return this.billingModule.getEmailService(); }
    public getBillingService(): BillingService { return this.billingModule.getBillingService(); }

    // --- Use Cases ---
    
    // User / Auth
    public getLoginUseCase(): Login { return this.userModule.getLoginUseCase(); }
    public getValidateSessionUseCase(): ValidateSession { return this.userModule.getValidateSessionUseCase(); }
    public getLogoutUseCase(): Logout { return this.userModule.getLogoutUseCase(); }
    public getGetEmployeesUseCase(): GetEmployees { return this.userModule.getGetEmployeesUseCase(); }
    public getGetEmployeeUseCase(): GetEmployee { return this.userModule.getGetEmployeeUseCase(); }
    public getCreateEmployeeUseCase(): CreateEmployee { return this.userModule.getCreateEmployeeUseCase(); }
    public getUpdateEmployeeUseCase(): UpdateEmployee { return this.userModule.getUpdateEmployeeUseCase(); }
    public getDeleteEmployeeUseCase(): DeleteEmployee { return this.userModule.getDeleteEmployeeUseCase(); }
    public getGetRolesUseCase(): GetRoles { return this.userModule.getGetRolesUseCase(); }
    public getCreateRoleUseCase(): CreateRole { return this.userModule.getCreateRoleUseCase(); }
    public getUpdateRoleUseCase(): UpdateRole { return this.userModule.getUpdateRoleUseCase(); }
    public getDeleteRoleUseCase(): DeleteRole { return this.userModule.getDeleteRoleUseCase(); }

    // Orders / Menu
    public getCreateOrderUseCase(): CreateOrder { return this.orderModule.getCreateOrderUseCase(); }
    public getGetOrdersUseCase(): GetOrders { return this.orderModule.getGetOrdersUseCase(); }
    public getUpdateOrderUseCase(): UpdateOrder { return this.orderModule.getUpdateOrderUseCase(); }
    public getDeleteOrderUseCase(): DeleteOrder { return this.orderModule.getDeleteOrderUseCase(); }
    public getGetMenuUseCase(): GetMenu { return this.orderModule.getGetMenuUseCase(); }
    public getCreateMenuUseCase(): CreateMenu { return this.orderModule.getCreateMenuUseCase(); }
    public getUpdateMenuUseCase(): UpdateMenu { return this.orderModule.getUpdateMenuUseCase(); }
    public getDeleteMenuUseCase(): DeleteMenu { return this.orderModule.getDeleteMenuUseCase(); }
    public getCreateCustomerUseCase(): CreateCustomer { return this.orderModule.getCreateCustomerUseCase(); }
    public getGetCustomersUseCase(): GetCustomers { return this.orderModule.getGetCustomersUseCase(); }
    public getLookupCustomerUseCase(): LookupCustomer { return this.orderModule.getLookupCustomerUseCase(); }
    public getGetRestaurantConfigUseCase(): GetRestaurantConfig { return this.orderModule.getGetRestaurantConfigUseCase(); }
    public getUpdateRestaurantConfigUseCase(): UpdateRestaurantConfig { return this.orderModule.getUpdateRestaurantConfigUseCase(); }

    // Billing / SRI
    public getGenerateInvoiceUseCase(): GenerateInvoice { return this.billingModule.getGenerateInvoiceUseCase(); }
    public getCheckInvoiceStatusUseCase(): CheckInvoiceStatus { return this.billingModule.getCheckInvoiceStatusUseCase(); }
    public getGenerateCreditNoteUseCase(): GenerateCreditNote { return this.billingModule.getGenerateCreditNoteUseCase(); }
    public getCreateBillUseCase(): CreateBill { return this.billingModule.getCreateBillUseCase(); }
    public getGetBillsUseCase(): GetBills { return this.billingModule.getGetBillsUseCase(); }
    public getDeleteBillUseCase(): DeleteBill { return this.billingModule.getDeleteBillUseCase(); }
    public getGetCreditNotesUseCase(): GetCreditNotes { return this.billingModule.getGetCreditNotesUseCase(); }
    public getCheckCreditNoteStatusUseCase(): CheckCreditNoteStatus { return this.billingModule.getCheckCreditNoteStatusUseCase(); }
    public getResetBillingSystemUseCase(): ResetBillingSystem { return this.billingModule.getResetBillingSystemUseCase(); }
    public getResetFullSystemUseCase(): ResetFullSystem { return this.billingModule.getResetFullSystemUseCase(); }
    public getRetryInvoicesUseCase(): RetryInvoices { return this.billingModule.getRetryInvoicesUseCase(); }
    public getCronService(): CronService { return this.billingModule.getCronService(); }


    // --- Controllers ---
    public getOrderController(): OrderController { return this.orderModule.getOrderController(); }
    public getCustomerController(): CustomerController { return this.orderModule.getCustomerController(); }
    public getBillingController(): BillingController { return this.billingModule.getBillingController(); }

    /**
     * Reset all modules
     */
    public reset(): void {
        this.repoModule.reset();
        this.userModule.reset();
        this.orderModule.reset();
        this.billingModule.reset();
        logger.info('DIContainer reset');
    }
}

export const container = DIContainer.getInstance();
