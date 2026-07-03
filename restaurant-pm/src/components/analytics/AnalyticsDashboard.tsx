/**
 * AnalyticsDashboard — versión simple y legible.
 * Sin librerías de gráficas: números primero, barras CSS ligeras como apoyo visual.
 */
import React, { useEffect, useState } from 'react';
import { analyticsService, DashboardStats } from '../../services/AnalyticsService';
import { RefreshCcwIcon as RefreshIcon } from '../ui/Icons';

const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

/** Fila con etiqueta, barra de progreso y valor — la base de todas las secciones */
const StatRow: React.FC<{
    label: string;
    value: string;
    pct: number; // 0-100
    color: string; // tailwind bg class
    rank?: number;
}> = ({ label, value, pct, color, rank }) => (
    <div className="py-2">
        <div className="flex justify-between items-center gap-3 mb-1.5">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">
                {rank !== undefined && (
                    <span className="inline-flex w-5 h-5 mr-2 rounded-md bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400 text-[10px] font-black items-center justify-center align-middle">
                        {rank}
                    </span>
                )}
                {label}
            </span>
            <span className="text-sm font-black text-gray-900 dark:text-white flex-shrink-0">{value}</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-dark-700 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
            />
        </div>
    </div>
);

/** Tarjeta de sección con título uniforme */
const Section: React.FC<{ title: string; children: React.ReactNode; empty?: boolean }> = ({ title, children, empty }) => (
    <div className="glass-panel p-6">
        <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">{title}</h3>
        {empty ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin datos en este período.</p>
        ) : children}
    </div>
);

export const AnalyticsDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [range, setRange] = useState<'today' | 'week' | 'month' | 'year'>('today');
    const [loading, setLoading] = useState(false);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await analyticsService.getDashboardAnalysis(range);
            setStats(data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [range]);

    if (loading && !stats) return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando análisis inteligente...</div>;
    if (!stats) return <div className="p-8 text-center text-gray-500">No hay datos de análisis disponibles</div>;

    // ── Datos derivados (cálculo simple, sin gráficas) ──────────────────────
    const peakHour = (stats.activityByHour || []).reduce(
        (best, h) => (h.count > best.count ? h : best),
        { hour: -1, count: 0 }
    );

    const topItems = (stats.topSellingItems || []).slice(0, 6);
    const maxItemQty = Math.max(1, ...topItems.map(i => i.quantity));

    const categories = stats.salesByCategory || [];
    const categoryTotal = Math.max(0.01, categories.reduce((s, c) => s + c.total, 0));

    const billingTypes = stats.salesByBillingType || [];
    const billingTotal = Math.max(0.01, billingTypes.reduce((s, b) => s + b.total, 0));

    const revenueDays = stats.revenueByDay || [];
    const maxDayRevenue = Math.max(1, ...revenueDays.map(d => d.total));
    // Mostrar como máximo ~10 etiquetas bajo las barras para que respire
    const labelEvery = Math.max(1, Math.ceil(revenueDays.length / 10));
    const formatDayLabel = (str: string) => {
        const parts = str.split('-');
        const d = parts.length === 2
            ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1)
            : new Date(str);
        return range === 'year'
            ? d.toLocaleDateString(undefined, { month: 'short' })
            : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    };

    const kpis = [
        { label: 'Ventas Totales', value: formatCurrency(stats.totalRevenue), accent: 'text-blue-600 dark:text-blue-400' },
        { label: 'Pedidos', value: stats.totalOrders.toString(), accent: 'text-green-600 dark:text-green-400' },
        { label: 'Ticket Promedio', value: formatCurrency(stats.averageTicket), accent: 'text-purple-600 dark:text-purple-400' },
        {
            label: 'Hora Pico',
            value: peakHour.hour >= 0 ? `${peakHour.hour}:00` : '—',
            sub: peakHour.hour >= 0 ? `${peakHour.count} pedidos` : undefined,
            accent: 'text-orange-600 dark:text-orange-400'
        },
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header / Filtro de rango */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 glass-panel p-4 sm:p-5">
                <h2 className="text-lg sm:text-xl font-black text-gray-800 dark:text-white tracking-tight">
                    Resumen del Negocio
                </h2>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-700/50 p-1 rounded-xl">
                        {(['today', 'week', 'month', 'year'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    range === r
                                        ? 'bg-white dark:bg-dark-600 shadow-md text-primary-600 dark:text-primary-400'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                {r === 'today' ? 'Hoy' : r === 'week' ? 'Semana' : r === 'month' ? 'Mes' : 'Año'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchStats}
                        className="p-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20 active:scale-95"
                        title="Actualizar datos"
                    >
                        <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPIs — los números que importan, sin adornos */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className="glass-panel p-4 sm:p-6">
                        <p className="text-[10px] sm:text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                            {kpi.label}
                        </p>
                        <p className={`text-2xl sm:text-3xl font-black tracking-tighter ${kpi.accent}`}>{kpi.value}</p>
                        {kpi.sub && (
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{kpi.sub}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Ingresos del período — barras CSS simples */}
            <Section title="Ingresos del Período" empty={revenueDays.length === 0}>
                <div className="flex items-end gap-1 h-36">
                    {revenueDays.map((day, idx) => (
                        <div
                            key={day.date}
                            className="flex-1 flex flex-col items-center justify-end h-full group"
                            title={`${formatDayLabel(day.date)}: ${formatCurrency(day.total)}`}
                        >
                            {revenueDays.length <= 8 && (
                                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 mb-1">
                                    {formatCurrency(day.total)}
                                </span>
                            )}
                            <div
                                className="w-full max-w-[48px] bg-blue-500 dark:bg-blue-500/80 rounded-t-lg transition-all duration-700 group-hover:bg-blue-600 min-h-[3px]"
                                style={{ height: `${Math.max(3, (day.total / maxDayRevenue) * 100)}%` }}
                            />
                            <span className={`text-[9px] font-bold text-gray-400 mt-1.5 whitespace-nowrap ${idx % labelEvery === 0 ? '' : 'invisible'}`}>
                                {formatDayLabel(day.date)}
                            </span>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Productos + desgloses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Section title="Productos Más Vendidos" empty={topItems.length === 0}>
                    <div className="divide-y divide-gray-50 dark:divide-dark-700/50">
                        {topItems.map((item, idx) => (
                            <StatRow
                                key={item.name}
                                rank={idx + 1}
                                label={item.name}
                                value={`${item.quantity} uds`}
                                pct={(item.quantity / maxItemQty) * 100}
                                color="bg-green-500"
                            />
                        ))}
                    </div>
                </Section>

                <div className="space-y-4 sm:space-y-6">
                    <Section title="Ventas por Categoría" empty={categories.length === 0}>
                        <div className="divide-y divide-gray-50 dark:divide-dark-700/50">
                            {categories.map((cat) => (
                                <StatRow
                                    key={cat.category}
                                    label={cat.category}
                                    value={`${formatCurrency(cat.total)} · ${Math.round((cat.total / categoryTotal) * 100)}%`}
                                    pct={(cat.total / categoryTotal) * 100}
                                    color="bg-purple-500"
                                />
                            ))}
                        </div>
                    </Section>

                    <Section title="Ventas por Tipo de Comprobante" empty={billingTypes.length === 0}>
                        <div className="divide-y divide-gray-50 dark:divide-dark-700/50">
                            {billingTypes.map((bt) => (
                                <StatRow
                                    key={bt.type}
                                    label={bt.type}
                                    value={`${formatCurrency(bt.total)} · ${Math.round((bt.total / billingTotal) * 100)}%`}
                                    pct={(bt.total / billingTotal) * 100}
                                    color="bg-orange-500"
                                />
                            ))}
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
};
