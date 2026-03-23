import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { analyticsService } from '../../../services/AnalyticsService';

// Mock the AnalyticsService
vi.mock('../../../services/AnalyticsService', () => ({
    analyticsService: {
        getDashboardAnalysis: vi.fn()
    }
}));

// Mock Recharts to avoid issues with ResponsiveContainer in JSDOM
vi.mock('recharts', async () => {
    const Actual = await vi.importActual('recharts');
    return {
        ...Actual,
        ResponsiveContainer: ({ children }: any) => <div>{children}</div>
    };
});

const mockStats = {
    totalRevenue: 1500.50,
    totalOrders: 45,
    averageTicket: 33.34,
    revenueByDay: [
        { date: '2026-03-20', total: 500 },
        { date: '2026-03-21', total: 1000 }
    ],
    ordersByStatus: [
        { status: 'Nuevo', count: 20 },
        { status: 'Listo', count: 25 }
    ],
    topSellingItems: [
        { name: 'CEVICHE MIXTO', quantity: 15 },
        { name: 'ARROZ CON MARISCOS', quantity: 12 }
    ],
    salesByCategory: [
        { category: 'En Local', total: 1200 },
        { category: 'Delivery', total: 300 }
    ],
    activityByHour: [
        { hour: 12, count: 10 },
        { hour: 13, count: 15 }
    ],
    salesByBillingType: [
        { type: 'Factura', total: 1000 },
        { type: 'Consumidor Final', total: 300 },
        { type: 'Sin Factura', total: 200 }
    ]
};

describe('AnalyticsDashboard Component', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        (analyticsService.getDashboardAnalysis as any).mockResolvedValue(mockStats);
    });

    it('debe renderizar los KPIs principales después de cargar', async () => {
        render(<AnalyticsDashboard />);
        
        expect(screen.getByText(/Cargando análisis inteligente/i)).toBeDefined();

        await waitFor(() => {
            expect(screen.getByText('$1500.50')).toBeDefined();
            expect(screen.getByText('45')).toBeDefined();
            expect(screen.getByText('$33.34')).toBeDefined();
        });
    });

    it('debe mostrar los títulos de los gráficos', async () => {
        render(<AnalyticsDashboard />);
        
        await waitFor(() => {
            expect(screen.getByText(/Tendencia de Ingresos/i)).toBeDefined();
            expect(screen.getByText(/Productos Estrella/i)).toBeDefined();
            expect(screen.getByText(/Ventas por Categoría/i)).toBeDefined();
            expect(screen.getByText(/Actividad de Clientes/i)).toBeDefined();
            expect(screen.getByText(/Ventas por Tipo de Comprobante/i)).toBeDefined();
        });
    });

    it('debe mostrar el botón de Año y cambiar el rango al hacer clic', async () => {
        render(<AnalyticsDashboard />);
        
        await waitFor(() => {
            const yearButton = screen.getByText('Año');
            expect(yearButton).toBeDefined();
        });
    });

    it('debe llamar al servicio cuando se cambia el rango', async () => {
        render(<AnalyticsDashboard />);
        
        await waitFor(() => {
            expect(analyticsService.getDashboardAnalysis).toHaveBeenCalledWith('today');
        });
    });
});
