import { apiService } from '../api';

export interface DashboardStats {
    totalRevenue: number;
    totalOrders: number;
    averageTicket: number;
    revenueByDay: { date: string; total: number }[];
    ordersByStatus: { status: string; count: number }[];
    topSellingItems: { name: string; quantity: number }[];
    salesByCategory: { category: string; total: number }[];
    activityByHour: { hour: number; count: number }[];
}

export const analyticsService = {
    getDashboardAnalysis: async (range: 'today' | 'week' | 'month' = 'today'): Promise<DashboardStats> => {
        console.log(`[AnalyticsService] Fetching stats for range: ${range}`);
        const result = await apiService.get<DashboardStats>(`/dashboard/stats?range=${range}`);
        console.log(`[AnalyticsService] Result:`, result);
        return result;
    }
};
