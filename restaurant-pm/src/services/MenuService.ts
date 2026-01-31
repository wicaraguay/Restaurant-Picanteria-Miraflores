
import { apiService } from '../api';
import { API_ENDPOINTS } from '../config/api.config';

export class MenuService {
    private static instance: MenuService;

    private constructor() { }

    public static getInstance(): MenuService {
        if (!MenuService.instance) {
            MenuService.instance = new MenuService();
        }
        return MenuService.instance;
    }

    public async getAll(): Promise<any[]> {
        return apiService.get(API_ENDPOINTS.MENU.BASE);
    }

    public async getById(id: string): Promise<any> {
        return apiService.get(API_ENDPOINTS.MENU.BY_ID(id));
    }

    public async create(data: any): Promise<any> {
        return apiService.post(API_ENDPOINTS.MENU.BASE, data);
    }

    public async update(id: string, data: any): Promise<any> {
        return apiService.put(API_ENDPOINTS.MENU.BY_ID(id), data);
    }

    public async delete(id: string): Promise<any> {
        return apiService.delete(API_ENDPOINTS.MENU.BY_ID(id));
    }
}

export const menuService = MenuService.getInstance();
