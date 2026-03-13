
import { RepositoryModule } from './RepositoryModule';
import { CreateOrder } from '../../../application/use-cases/CreateOrder';
import { GetOrders } from '../../../application/use-cases/GetOrders';
import { UpdateOrder } from '../../../application/use-cases/UpdateOrder';
import { DeleteOrder } from '../../../application/use-cases/DeleteOrder';
import { GetMenu } from '../../../application/use-cases/GetMenu';
import { CreateMenu } from '../../../application/use-cases/CreateMenu';
import { UpdateMenu } from '../../../application/use-cases/UpdateMenu';
import { DeleteMenu } from '../../../application/use-cases/DeleteMenu';
import { CreateCustomer } from '../../../application/use-cases/CreateCustomer';
import { GetCustomers } from '../../../application/use-cases/GetCustomers';
import { GetRestaurantConfig } from '../../../application/use-cases/GetRestaurantConfig';
import { UpdateRestaurantConfig } from '../../../application/use-cases/UpdateRestaurantConfig';
import { OrderController } from '../../controllers/OrderController';
import { CustomerController } from '../../controllers/CustomerController';
import { logger } from '../../utils/Logger';

export class OrderModule {
    private createOrderUseCase?: CreateOrder;
    private getOrdersUseCase?: GetOrders;
    private updateOrderUseCase?: UpdateOrder;
    private deleteOrderUseCase?: DeleteOrder;
    private getMenuUseCase?: GetMenu;
    private createMenuUseCase?: CreateMenu;
    private updateMenuUseCase?: UpdateMenu;
    private deleteMenuUseCase?: DeleteMenu;
    private createCustomerUseCase?: CreateCustomer;
    private getCustomersUseCase?: GetCustomers;
    private getRestaurantConfigUseCase?: GetRestaurantConfig;
    private updateRestaurantConfigUseCase?: UpdateRestaurantConfig;
    private orderController?: OrderController;
    private customerController?: CustomerController;

    constructor(private repoModule: RepositoryModule) {}

    public getCreateOrderUseCase(): CreateOrder {
        if (!this.createOrderUseCase) {
            this.createOrderUseCase = new CreateOrder(this.repoModule.getOrderRepository());
            logger.debug('CreateOrder use case instantiated');
        }
        return this.createOrderUseCase;
    }

    public getGetOrdersUseCase(): GetOrders {
        if (!this.getOrdersUseCase) {
            this.getOrdersUseCase = new GetOrders(this.repoModule.getOrderRepository());
            logger.debug('GetOrders use case instantiated');
        }
        return this.getOrdersUseCase;
    }

    public getUpdateOrderUseCase(): UpdateOrder {
        if (!this.updateOrderUseCase) {
            this.updateOrderUseCase = new UpdateOrder(this.repoModule.getOrderRepository());
            logger.debug('UpdateOrder use case instantiated');
        }
        return this.updateOrderUseCase;
    }

    public getDeleteOrderUseCase(): DeleteOrder {
        if (!this.deleteOrderUseCase) {
            this.deleteOrderUseCase = new DeleteOrder(this.repoModule.getOrderRepository());
            logger.debug('DeleteOrder use case instantiated');
        }
        return this.deleteOrderUseCase;
    }

    public getGetMenuUseCase(): GetMenu {
        if (!this.getMenuUseCase) {
            this.getMenuUseCase = new GetMenu(this.repoModule.getMenuRepository());
            logger.debug('GetMenu use case instantiated');
        }
        return this.getMenuUseCase;
    }

    public getCreateMenuUseCase(): CreateMenu {
        if (!this.createMenuUseCase) {
            this.createMenuUseCase = new CreateMenu(this.repoModule.getMenuRepository());
            logger.debug('CreateMenu use case instantiated');
        }
        return this.createMenuUseCase;
    }

    public getUpdateMenuUseCase(): UpdateMenu {
        if (!this.updateMenuUseCase) {
            this.updateMenuUseCase = new UpdateMenu(this.repoModule.getMenuRepository());
            logger.debug('UpdateMenu use case instantiated');
        }
        return this.updateMenuUseCase;
    }

    public getDeleteMenuUseCase(): DeleteMenu {
        if (!this.deleteMenuUseCase) {
            this.deleteMenuUseCase = new DeleteMenu(this.repoModule.getMenuRepository());
            logger.debug('DeleteMenu use case instantiated');
        }
        return this.deleteMenuUseCase;
    }

    public getCreateCustomerUseCase(): CreateCustomer {
        if (!this.createCustomerUseCase) {
            this.createCustomerUseCase = new CreateCustomer(this.repoModule.getCustomerRepository());
            logger.debug('CreateCustomer use case instantiated');
        }
        return this.createCustomerUseCase;
    }

    public getGetCustomersUseCase(): GetCustomers {
        if (!this.getCustomersUseCase) {
            this.getCustomersUseCase = new GetCustomers(this.repoModule.getCustomerRepository());
            logger.debug('GetCustomers use case instantiated');
        }
        return this.getCustomersUseCase;
    }

    public getGetRestaurantConfigUseCase(): GetRestaurantConfig {
        if (!this.getRestaurantConfigUseCase) {
            this.getRestaurantConfigUseCase = new GetRestaurantConfig(this.repoModule.getRestaurantConfigRepository());
            logger.debug('GetRestaurantConfig use case instantiated');
        }
        return this.getRestaurantConfigUseCase;
    }

    public getUpdateRestaurantConfigUseCase(): UpdateRestaurantConfig {
        if (!this.updateRestaurantConfigUseCase) {
            this.updateRestaurantConfigUseCase = new UpdateRestaurantConfig(this.repoModule.getRestaurantConfigRepository());
            logger.debug('UpdateRestaurantConfig use case instantiated');
        }
        return this.updateRestaurantConfigUseCase;
    }

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

    public reset(): void {
        this.createOrderUseCase = undefined;
        this.getOrdersUseCase = undefined;
        this.updateOrderUseCase = undefined;
        this.deleteOrderUseCase = undefined;
        this.getMenuUseCase = undefined;
        this.createMenuUseCase = undefined;
        this.updateMenuUseCase = undefined;
        this.deleteMenuUseCase = undefined;
        this.createCustomerUseCase = undefined;
        this.getCustomersUseCase = undefined;
        this.getRestaurantConfigUseCase = undefined;
        this.updateRestaurantConfigUseCase = undefined;
        this.orderController = undefined;
        this.customerController = undefined;
    }
}
