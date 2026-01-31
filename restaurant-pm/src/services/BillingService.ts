
import { apiService } from '../api';
import { API_ENDPOINTS } from '../config/api.config';
import { Bill } from '../types';

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
        return apiService.post('/billing/generate-xml', data);
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
        return apiService.post('/credit-notes', data);
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
}

export const billingService = BillingService.getInstance();
