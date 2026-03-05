
import { apiService } from '../../../api';
import { API_ENDPOINTS } from '../../../config/api.config';
import { MenuItem } from '../types/menu.types';

export class MenuService {
    private static instance: MenuService;

    private constructor() { }

    public static getInstance(): MenuService {
        if (!MenuService.instance) {
            MenuService.instance = new MenuService();
        }
        return MenuService.instance;
    }

    public async getAll(): Promise<MenuItem[]> {
        return apiService.get(API_ENDPOINTS.MENU.BASE);
    }

    public async getById(id: string): Promise<MenuItem> {
        return apiService.get(API_ENDPOINTS.MENU.BY_ID(id));
    }

    public async create(data: Partial<MenuItem>): Promise<MenuItem> {
        return apiService.post(API_ENDPOINTS.MENU.BASE, data);
    }

    public async update(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
        return apiService.put(API_ENDPOINTS.MENU.BY_ID(id), data);
    }

    public async delete(id: string): Promise<any> {
        return apiService.delete(API_ENDPOINTS.MENU.BY_ID(id));
    }
}

export const menuService = MenuService.getInstance();
