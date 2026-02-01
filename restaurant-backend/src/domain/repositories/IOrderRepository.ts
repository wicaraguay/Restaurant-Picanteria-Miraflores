/**
 * @file IOrderRepository.ts
 * @description Interfaz del repositorio de órdenes (Domain Layer)
 * 
 * @purpose
 * Define el contrato para operaciones CRUD de órdenes/pedidos.
 * 
 * @connections
 * - Implementado por: MongoOrderRepository (infrastructure/repositories)
 * - Usa: Order entity (domain/entities)
 * - Usado por: CreateOrder, GetOrders, UpdateOrder, DeleteOrder (application/use-cases)
 * - Inyectado por: DIContainer (infrastructure/di)
 * 
 * @layer Domain - Define contratos sin implementación
 */

import { Order } from '../entities/Order';
import { PaginatedResult } from '../../infrastructure/repositories/BaseRepository';

export interface DashboardStatsDTO {
    totalRevenue: number;
    totalOrders: number;
    averageTicket: number;
    revenueByDay: { date: string; total: number }[];
    ordersByStatus: { status: string; count: number }[];
    topSellingItems: { name: string; quantity: number }[];
    salesByCategory: { category: string; total: number }[];
    activityByHour: { hour: number; count: number }[];
}

export interface IOrderRepository {
    create(order: Order): Promise<Order>;
    findById(id: string): Promise<Order | null>;
    findAll(): Promise<Order[]>;
    findPaginated(page: number, limit: number, filter?: any, sort?: any): Promise<PaginatedResult<Order>>;
    update(id: string, order: Partial<Order>): Promise<Order | null>;
    delete(id: string): Promise<boolean>;
    getDashboardStats(startDate: Date, endDate: Date): Promise<DashboardStatsDTO>;
}
