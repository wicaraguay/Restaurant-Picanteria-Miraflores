/**
 * Repositorio de Órdenes - Implementación MongoDB
 * 
 * Extiende BaseRepository para heredar operaciones CRUD comunes.
 * Solo implementa la lógica específica de mapeo de Order.
 */

import { IOrderRepository, DashboardStatsDTO } from '../../domain/repositories/IOrderRepository';
import { Order } from '../../domain/entities/Order';
import { OrderModel } from '../database/schemas/OrderSchema';
import { BaseRepository } from './BaseRepository';

export class MongoOrderRepository extends BaseRepository<Order> implements IOrderRepository {
    constructor() {
        super(OrderModel, 'Order');
    }

    protected mapToEntity(doc: any): Order {
        return {
            id: doc.id || doc._id.toString(),
            customerName: doc.customerName,
            items: doc.items,
            type: doc.type,
            status: doc.status,
            createdAt: doc.createdAt,
            billed: doc.billed,
            orderNumber: doc.orderNumber
        };
    }

    async getDashboardStats(startDate: Date, endDate: Date): Promise<DashboardStatsDTO> {
        // 1. Basic stats (Total Revenue, Total Orders, Average Ticket)
        // We calculate revenue summing prices of items in orders
        const revenueAggregation = await this.model.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $multiply: ["$items.quantity", { $ifNull: ["$items.price", 0] }] } }, // Ensure price exists
                    uniqueOrders: { $addToSet: "$_id" } // Count unique orders
                }
            },
            {
                $project: {
                    totalRevenue: 1,
                    totalOrders: { $size: "$uniqueOrders" },
                    averageTicket: { $cond: [{ $eq: [{ $size: "$uniqueOrders" }, 0] }, 0, { $divide: ["$totalRevenue", { $size: "$uniqueOrders" }] }] }
                }
            }
        ]);

        const stats = revenueAggregation[0] || { totalRevenue: 0, totalOrders: 0, averageTicket: 0 };

        // 2. Revenue by Day
        const revenueByDay = await this.model.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    total: { $sum: { $multiply: ["$items.quantity", { $ifNull: ["$items.price", 0] }] } }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { date: "$_id", total: 1, _id: 0 } }
        ]);

        // 3. Orders by Status
        const ordersByStatus = await this.model.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $project: { status: "$_id", count: 1, _id: 0 } }
        ]);

        // 4. Top Selling Items
        const topSellingItems = await this.model.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $unwind: "$items" },
            { $group: { _id: "$items.name", quantity: { $sum: "$items.quantity" } } },
            { $sort: { quantity: -1 } },
            { $limit: 10 },
            { $project: { name: "$_id", quantity: 1, _id: 0 } }
        ]);

        // 5. Activity by Hour
        const activityByHour = await this.model.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $project: {
                    hour: { $hour: { date: "$createdAt", timezone: "America/Guayaquil" } } // Adjust timezone if needed
                }
            },
            { $group: { _id: "$hour", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
            { $project: { hour: "$_id", count: 1, _id: 0 } }
        ]);

        // 6. Sales by Category (Join with MenuItems would be ideal here, but kept simple for now based on item names or if category was denormalized)
        // For now, let's categorize by 'type' of order as a proxy for sales channel analysis requested
        const salesByCategory = await this.model.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$type", // Using Order Type as category for this iteration
                    total: { $sum: { $multiply: ["$items.quantity", { $ifNull: ["$items.price", 0] }] } }
                }
            },
            { $project: { category: "$_id", total: 1, _id: 0 } }
        ]);


        return {
            totalRevenue: stats.totalRevenue,
            totalOrders: stats.totalOrders,
            averageTicket: stats.averageTicket,
            revenueByDay,
            ordersByStatus,
            topSellingItems,
            activityByHour,
            salesByCategory
        };
    }
}
