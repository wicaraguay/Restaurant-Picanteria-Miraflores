import { Request, Response } from 'express';
import { DashboardStats } from '../../../application/use-cases/DashboardStats';
import { MongoOrderRepository } from '../../../infrastructure/repositories/MongoOrderRepository';
import { logger } from '../../utils/Logger';

export class DashboardController {

    // Dependency Injection could be improved here, but instantiating directly for now as per project pattern
    private dashboardStatsUseCase: DashboardStats;

    constructor() {
        const orderRepository = new MongoOrderRepository();
        this.dashboardStatsUseCase = new DashboardStats(orderRepository);
    }

    getStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const range = req.query.range as 'today' | 'week' | 'month' | 'year' || 'today';
            logger.debug(`[DashboardController] Getting stats for range: ${range}`);
            const stats = await this.dashboardStatsUseCase.execute(range);
            logger.debug(`[DashboardController] Stats result:`, JSON.stringify(stats, null, 2));
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Error getting dashboard stats:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
