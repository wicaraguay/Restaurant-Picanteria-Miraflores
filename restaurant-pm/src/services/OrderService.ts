
import { apiService } from '../api';
import { API_ENDPOINTS } from '../config/api.config';

export class OrderService {
    private static instance: OrderService;

    private constructor() { }

    public static getInstance(): OrderService {
        if (!OrderService.instance) {
            OrderService.instance = new OrderService();
        }
        return OrderService.instance;
    }

    public async getAll(params?: {
        page?: number;
        limit?: number;
        status?: string;
        billed?: boolean;
        customerName?: string;
        sort?: any;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.status) queryParams.append('status', params.status);
        if (params?.billed !== undefined) queryParams.append('billed', params.billed.toString());
        if (params?.customerName) queryParams.append('customerName', params.customerName);
        if (params?.sort) queryParams.append('sort', JSON.stringify(params.sort));

        const url = queryParams.toString()
            ? `${API_ENDPOINTS.ORDERS.BASE}?${queryParams}`
            : API_ENDPOINTS.ORDERS.BASE;
        return apiService.get(url);
    }

    public async getById(id: string): Promise<any> {
        return apiService.get(API_ENDPOINTS.ORDERS.BY_ID(id));
    }

    public async create(data: any): Promise<any> {
        return apiService.post(API_ENDPOINTS.ORDERS.BASE, data);
    }

    public async update(id: string, data: any): Promise<any> {
        return apiService.put(API_ENDPOINTS.ORDERS.BY_ID(id), data);
    }

    public async delete(id: string): Promise<any> {
        return apiService.delete(API_ENDPOINTS.ORDERS.BY_ID(id));
    }
}

export const orderService = OrderService.getInstance();
