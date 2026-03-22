/**
 * @file BillingService.ts
 * @description Servicio para gestión de facturación.
 */

import { apiService } from '../../../api';
import { API_ENDPOINTS } from '../../../config/api.config';
import { dataService } from '../../../services/DataService'; 
import { Bill } from '../types/billing.types';

export class BillingService {
    private static instance: BillingService;

    private constructor() { }

    public static getInstance(): BillingService {
        if (!BillingService.instance) {
            BillingService.instance = new BillingService();
        }
        return BillingService.instance;
    }

    /**
     * Obtener historial de facturas
     */
    public async getAll(params?: {
        page?: number;
        limit?: number;
        documentNumber?: string;
        customerIdentification?: string;
        documentType?: string;
        sort?: any;
    }): Promise<{ data: Bill[], pagination: any }> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.documentNumber) queryParams.append('documentNumber', params.documentNumber);
        if (params?.customerIdentification) queryParams.append('customerIdentification', params.customerIdentification);
        if (params?.documentType) queryParams.append('documentType', params.documentType);
        if (params?.sort) queryParams.append('sort', JSON.stringify(params.sort));

        const url = queryParams.toString()
            ? `${API_ENDPOINTS.BILLS.BASE}?${queryParams}`
            : API_ENDPOINTS.BILLS.BASE;
        return apiService.get(url);
    }

    /**
     * Crear una nueva factura manualmente
     */
    public async create(data: any): Promise<Bill> {
        return apiService.post(API_ENDPOINTS.BILLS.BASE, data);
    }

    /**
     * Eliminar una factura
     */
    public async delete(id: string): Promise<boolean> {
        return apiService.delete(`${API_ENDPOINTS.BILLS.BASE}/${id}`);
    }

    /**
     * Generar XML y enviar al SRI (Facturación Electrónica)
     */
    public async generateXML(data: { order: any, client: any, taxRate?: number, logoUrl?: string }): Promise<any> {
        const result = await apiService.post('/billing/generate-xml', data);
        dataService.clearCache(); // Invalida el caché para que el nuevo cliente aparezca en la lista
        return result;
    }

    /**
     * Verificar estado de autorización en SRI
     */
    public async checkStatus(accessKey: string): Promise<any> {
        return apiService.post(`/billing/check-status/${accessKey}`, {});
    }

    /**
     * Generar Nota de Crédito
     */
    public async generateCreditNote(data: {
        billId: string;
        reason: string;
        customDescription?: string;
        taxRate?: number;
    }): Promise<any> {
        const result = await apiService.post('/credit-notes', data);
        dataService.clearCache(); // Invalida el caché de clientes
        return result;
    }

    /**
     * Obtener historial de notas de crédito
     */
    public async getCreditNotes(params?: {
        page?: number;
        limit?: number;
        billId?: string;
        reason?: string;
        customerIdentification?: string;
        sort?: any;
    }): Promise<{ data: any[], pagination: any }> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.billId) queryParams.append('billId', params.billId);
        if (params?.reason) queryParams.append('reason', params.reason);
        if (params?.customerIdentification) queryParams.append('customerIdentification', params.customerIdentification);
        if (params?.sort) queryParams.append('sort', JSON.stringify(params.sort));

        const url = queryParams.toString()
            ? `/credit-notes?${queryParams}`
            : '/credit-notes';
        return apiService.get(url);
    }

    /**
     * Verificar estado de autorización de NC en SRI
     */
    public async checkCreditNoteStatus(accessKey: string): Promise<any> {
        return apiService.post('/credit-notes/check-status', { accessKey });
    }

    /**
     * Actualiza los datos y detalles de una factura
     */
    public async updateBill(id: string, data: any): Promise<any> {
        const result = await apiService.put(`/billing/update-bill/${id}`, data);
        dataService.clearCache(); // Sincroniza cambios de cliente
        return result;
    }

    /**
     * Re-enviar factura al SRI
     */
    public async reSubmit(id: string): Promise<any> {
        return apiService.post(`/billing/re-submit/${id}`, {});
    }
}

export const billingService = BillingService.getInstance();
