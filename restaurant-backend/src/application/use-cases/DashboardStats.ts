/**
 * Use Case: Get Dashboard Stats
 */
import { IOrderRepository, DashboardStatsDTO } from '../../domain/repositories/IOrderRepository';

export class DashboardStats {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(range: 'today' | 'week' | 'month' = 'today'): Promise<DashboardStatsDTO> {
        const endDate = new Date();
        let startDate = new Date();

        // Set hours to end of day for endDate
        endDate.setHours(23, 59, 59, 999);

        switch (range) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                // Last 7 days
                startDate.setDate(endDate.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                // Start of current month
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                break;
        }

        return this.orderRepository.getDashboardStats(startDate, endDate);
    }
}
