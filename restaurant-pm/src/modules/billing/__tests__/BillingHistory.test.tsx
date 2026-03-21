/**
 * @file BillingHistory.test.tsx
 * @description Pruebas unitarias para el componente de Historial de Facturación.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BillingHistory from '../components/BillingHistory';
import { billingService } from '../services/BillingService';
import { useRestaurantConfig } from '../../../contexts/RestaurantConfigContext';

// Mock de Dependencias
vi.mock('../services/BillingService', () => ({
    billingService: {
        getAll: vi.fn(),
        checkStatus: vi.fn(),
        generateCreditNote: vi.fn()
    }
}));

vi.mock('../../../contexts/RestaurantConfigContext', () => ({
    useRestaurantConfig: vi.fn()
}));

vi.mock('../../../config/api.config', () => ({
    API_BASE_URL: 'http://localhost:3000/api'
}));

const mockBills = [
    {
        id: '1',
        documentNumber: '001-001-000000001',
        date: '2026-03-21',
        customerName: 'CONSUMIDOR FINAL',
        customerIdentification: '9999999999999',
        total: 10.50,
        subtotal: 9.38,
        sriStatus: 'AUTORIZADO',
        environment: '1',
        accessKey: '1234567890123456789012345678901234567890123456789'
    }
];

describe('BillingHistory Redesign', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useRestaurantConfig as any).mockReturnValue({
            config: {
                billing: { environment: '1' }
            }
        });
        (billingService.getAll as any).mockResolvedValue({
            // Generamos IDs únicos para evitar problemas de keys en React
            data: Array.from({ length: 15 }, (_, i) => ({ ...mockBills[0], id: `${i + 1}` })),
            pagination: { total: 30, page: 1, limit: 15 }
        });
    });

    it('debe renderizar la cabecera con el nuevo estilo premium', async () => {
        render(<BillingHistory />);
        
        expect(screen.getByText('Historial')).toBeDefined();
        // El nuevo subtitulo
        expect(screen.getByText(/CONTROL DE DOCUMENTOS ELECTRÓNICOS/i)).toBeDefined();
    });

    it('debe mostrar los campos de búsqueda rediseñados', async () => {
        render(<BillingHistory />);
        
        expect(screen.getByPlaceholderText(/Buscar RUC \/ Cédula\.\.\./i)).toBeDefined();
        expect(screen.getByPlaceholderText(/Número de Factura\.\.\./i)).toBeDefined();
        expect(screen.getByText(/Filtrar Reporte/i)).toBeDefined();
    });

    it('debe listar las facturas en la tabla con los nuevos estilos', async () => {
        render(<BillingHistory />);
        
        await waitFor(() => {
            expect(screen.getByText('001-001-000000001')).toBeDefined();
            expect(screen.getByText('CONSUMIDOR FINAL')).toBeDefined();
            // El badge de estado
            expect(screen.getByText(/AUTORIZADO/i)).toBeDefined();
        });
    });

    it('debe permitir cambiar de página (paginación premium)', async () => {
        render(<BillingHistory />);
        
        // Esperamos a la primera carga
        await waitFor(() => {
            expect(billingService.getAll).toHaveBeenCalledTimes(1);
        });

        const nextBtn = screen.getByLabelText('Siguiente');
        fireEvent.click(nextBtn);
        
        // Esperamos a la segunda carga con la página 2
        await waitFor(() => {
            expect(billingService.getAll).toHaveBeenCalledTimes(2);
            expect(billingService.getAll).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
        });
    });

    it('debe mostrar el botón de descarga XML para facturas autorizadas', async () => {
        render(<BillingHistory />);
        
        await waitFor(() => {
            // Buscamos el botón por su título (tooltip)
            const xmlBtn = screen.getByTitle(/Descargar XML Firmado/i);
            expect(xmlBtn).toBeDefined();
            expect(screen.getByText('XML')).toBeDefined();
            
            // Verificamos que no esté deshabilitado para facturas autorizadas
            expect(xmlBtn).not.toBeDisabled();
        });
    });

    it('debe filtrar por año cuando se cambia el selector', async () => {
        render(<BillingHistory />);
        
        // Esperamos a la carga inicial (año actual 2026 en el test)
        await waitFor(() => {
            expect(billingService.getAll).toHaveBeenCalledWith(expect.objectContaining({
                startDate: '2026-01-01',
                endDate: '2026-12-31'
            }));
        });

        const yearSelect = screen.getByRole('combobox');
        fireEvent.change(yearSelect, { target: { value: '2025' } });

        await waitFor(() => {
            expect(billingService.getAll).toHaveBeenLastCalledWith(expect.objectContaining({
                startDate: '2025-01-01',
                endDate: '2025-12-31'
            }));
        });
    });

    it('debe llamar a getAll con límite 5000 al exportar CSV', async () => {
        render(<BillingHistory />);
        
        await waitFor(() => {
            expect(billingService.getAll).toHaveBeenCalled();
        });

        const exportBtn = screen.getByText(/Exportar CSV/i);
        fireEvent.click(exportBtn);

        await waitFor(() => {
            expect(billingService.getAll).toHaveBeenCalledWith(expect.objectContaining({
                limit: 5000
            }));
        });
    });
});
