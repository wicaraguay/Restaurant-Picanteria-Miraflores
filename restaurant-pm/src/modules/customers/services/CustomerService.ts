/**
 * @file CustomerService.ts
 * @description Servicio para gestión de clientes.
 */

import { apiService } from '../../../api';
import { API_ENDPOINTS } from '../../../config/api.config';
import { Customer } from '../types/customer.types';

export class CustomerService {
    private static instance: CustomerService;

    private constructor() { }

    public static getInstance(): CustomerService {
        if (!CustomerService.instance) {
            CustomerService.instance = new CustomerService();
        }
        return CustomerService.instance;
    }

    /**
     * Obtiene todos los clientes
     */
    public async getAll(params?: {
        page?: number;
        limit?: number;
        name?: string;
        email?: string;
        phone?: string;
        sort?: any;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.name) queryParams.append('name', params.name);
        if (params?.email) queryParams.append('email', params.email);
        if (params?.phone) queryParams.append('phone', params.phone);
        if (params?.sort) queryParams.append('sort', JSON.stringify(params.sort));

        const url = queryParams.toString()
            ? `${API_ENDPOINTS.CUSTOMERS.BASE}?${queryParams}`
            : API_ENDPOINTS.CUSTOMERS.BASE;
        return apiService.get<any>(url);
    }

    /**
     * Obtiene un cliente por ID
     */
    public async getById(id: string): Promise<Customer> {
        return apiService.get<Customer>(API_ENDPOINTS.CUSTOMERS.BY_ID(id));
    }

    /**
     * Crea un nuevo cliente
     */
    public async create(data: Partial<Customer>): Promise<Customer> {
        return apiService.post<Customer>(API_ENDPOINTS.CUSTOMERS.BASE, data);
    }

    /**
     * Actualiza un cliente
     */
    public async update(id: string, data: Partial<Customer>): Promise<Customer> {
        return apiService.put<Customer>(API_ENDPOINTS.CUSTOMERS.BY_ID(id), data);
    }

    /**
     * Elimina un cliente
     */
    public async delete(id: string): Promise<void> {
        return apiService.delete<void>(API_ENDPOINTS.CUSTOMERS.BY_ID(id));
    }
}

export const customerService = CustomerService.getInstance();
