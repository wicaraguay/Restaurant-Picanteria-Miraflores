/**
 * @file maintenanceRoutes.ts
 * @description Rutas para operaciones de mantenimiento y limpieza
 *
 * @endpoints
 * POST /api/maintenance/delete-old-orders - Eliminar órdenes antiguas
 * POST /api/maintenance/delete-inactive-clients - Eliminar clientes inactivos
 * POST /api/maintenance/delete-disabled-products - Eliminar productos deshabilitados
 * POST /api/maintenance/fiscal-year-close - Cierre de año fiscal
 */

import { Router, Request, Response } from 'express';
import { DeleteOldOrders } from '../../../application/use-cases/DeleteOldOrders';
import { DeleteInactiveClients } from '../../../application/use-cases/DeleteInactiveClients';
import { DeleteDisabledProducts } from '../../../application/use-cases/DeleteDisabledProducts';
import { FiscalYearClose } from '../../../application/use-cases/FiscalYearClose';
import { MongoOrderRepository } from '../../../infrastructure/repositories/MongoOrderRepository';
import { MongoCustomerRepository } from '../../../infrastructure/repositories/MongoCustomerRepository';
import { MongoBillRepository } from '../../../infrastructure/repositories/MongoBillRepository';
import { MongoMenuRepository } from '../../../infrastructure/repositories/MongoMenuRepository';
import { MongoRestaurantConfigRepository } from '../../../infrastructure/repositories/MongoRestaurantConfigRepository';

const router = Router();

// Inicializar repositorios
const orderRepository = new MongoOrderRepository();
const customerRepository = new MongoCustomerRepository();
const billRepository = new MongoBillRepository();
const menuRepository = new MongoMenuRepository();
const configRepository = new MongoRestaurantConfigRepository();

// Inicializar use cases
const deleteOldOrders = new DeleteOldOrders(orderRepository);
const deleteInactiveClients = new DeleteInactiveClients(customerRepository, billRepository);
const deleteDisabledProducts = new DeleteDisabledProducts(menuRepository);
const fiscalYearClose = new FiscalYearClose(billRepository, configRepository);

// Rutas protegidas
router.post('/delete-old-orders', async (req: Request, res: Response) => {
    try {
        const { monthsOld } = req.body;

        if (!monthsOld) {
            return res.status(400).json({ error: 'monthsOld is required' });
        }

        const result = await deleteOldOrders.execute({ monthsOld });
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Error deleting old orders' });
    }
});

router.post('/delete-inactive-clients', async (req: Request, res: Response) => {
    try {
        const { monthsInactive } = req.body;

        if (!monthsInactive) {
            return res.status(400).json({ error: 'monthsInactive is required' });
        }

        const result = await deleteInactiveClients.execute({ monthsInactive });
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Error deleting inactive clients' });
    }
});

router.post('/delete-disabled-products', async (req: Request, res: Response) => {
    try {
        const result = await deleteDisabledProducts.execute();
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Error deleting disabled products' });
    }
});

router.post('/fiscal-year-close', async (req: Request, res: Response) => {
    try {
        const { year } = req.body;

        if (!year) {
            return res.status(400).json({ error: 'year is required' });
        }

        const result = await fiscalYearClose.execute({ year });
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Error in fiscal year close' });
    }
});

export default router;
