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

export interface IOrderRepository {
    create(order: Order): Promise<Order>;
    findById(id: string): Promise<Order | null>;
    findAll(): Promise<Order[]>;
    update(id: string, order: Partial<Order>): Promise<Order | null>;
    delete(id: string): Promise<boolean>;
    // Add specialized methods if needed, e.g. findByCustomer
}
