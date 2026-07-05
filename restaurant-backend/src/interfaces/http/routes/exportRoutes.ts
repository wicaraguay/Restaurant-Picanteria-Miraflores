/**
 * @file exportRoutes.ts
 * @description Rutas para exportación de datos
 *
 * @endpoints
 * GET /api/export/menu - Exportar menú completo (Excel)
 * GET /api/export/clients - Exportar clientes (CSV)
 * GET /api/export/bills - Exportar facturas (Excel)
 * GET /api/export/orders - Exportar órdenes (CSV)
 * GET /api/export/tax-report?month=MM&year=YYYY - Reporte mensual para declaración 104 (Excel)
 */

import { Router } from 'express';
import { ExportController } from '../controllers/ExportController';
import { MongoMenuRepository } from '../../../infrastructure/repositories/MongoMenuRepository';
import { MongoCustomerRepository } from '../../../infrastructure/repositories/MongoCustomerRepository';
import { MongoBillRepository } from '../../../infrastructure/repositories/MongoBillRepository';
import { MongoOrderRepository } from '../../../infrastructure/repositories/MongoOrderRepository';
import { MongoCreditNoteRepository } from '../../../infrastructure/repositories/MongoCreditNoteRepository';
import { MongoRestaurantConfigRepository } from '../../../infrastructure/repositories/MongoRestaurantConfigRepository';
import { jwtAuthMiddleware } from '../../../infrastructure/web/middleware/JWTAuthMiddleware';

const router = Router();

// Inicializar repositorios
const menuRepository = new MongoMenuRepository();
const customerRepository = new MongoCustomerRepository();
const billRepository = new MongoBillRepository();
const orderRepository = new MongoOrderRepository();
const creditNoteRepository = new MongoCreditNoteRepository();
const configRepository = new MongoRestaurantConfigRepository();

// Inicializar controlador
const exportController = new ExportController(
    menuRepository,
    customerRepository,
    billRepository,
    orderRepository,
    creditNoteRepository,
    configRepository
);

// Rutas de exportación
router.get('/menu', (req, res) => exportController.exportMenu(req, res));
router.get('/clients', (req, res) => exportController.exportClients(req, res));
router.get('/bills', (req, res) => exportController.exportBills(req, res));
router.get('/orders', (req, res) => exportController.exportOrders(req, res));
// Reporte mensual para declaración (Formulario 104) — datos fiscales, requiere sesión
router.get('/tax-report', jwtAuthMiddleware, (req, res) => exportController.exportTaxReport(req, res));

export default router;
