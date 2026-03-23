import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, TooltipProps
} from 'recharts';
import { analyticsService, DashboardStats } from '../../services/AnalyticsService';
import { RefreshCcwIcon as RefreshIcon } from '../ui/Icons';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-panel p-4 border border-white/20 shadow-2xl backdrop-blur-md">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">
                            {entry.name}: <span className="text-primary-500">{formatter ? formatter(entry.value) : entry.value}</span>
                        </p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

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

    const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header / Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-center glass-panel p-6 shadow-lg">
                <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight mb-4 sm:mb-0">
                    Análisis de Datos <span className="text-primary-500">Inteligente</span>
                </h2>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-dark-700/50 p-1 rounded-xl">
                        {(['today', 'week', 'month', 'year'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    range === r 
                                    ? 'bg-white dark:bg-dark-600 shadow-md text-primary-600 dark:text-primary-400 scale-105' 
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                {r === 'today' ? 'Hoy' : r === 'week' ? 'Semana' : r === 'month' ? 'Mes' : 'Año'}
                            </button>
                        ))}
                    </div>
                    <button onClick={fetchStats} className="p-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/30 active:scale-95" title="Actualizar datos">
                        <RefreshIcon className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Ventas Totales', value: formatCurrency(stats.totalRevenue), color: 'blue', icon: '💰' },
                    { label: 'Pedidos Totales', value: stats.totalOrders.toString(), color: 'green', icon: '📦' },
                    { label: 'Ticket Promedio', value: formatCurrency(stats.averageTicket), color: 'purple', icon: '📊' }
                ].map((kpi, idx) => (
                    <div key={idx} className="glass-panel p-8 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                        <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${kpi.color}-500/10 rounded-full blur-2xl group-hover:bg-${kpi.color}-500/20 transition-all`}></div>
                        <div className="relative z-10">
                            <div className="flex items-center space-x-2 mb-4">
                                <span className="text-2xl">{kpi.icon}</span>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{kpi.label}</p>
                            </div>
                            <p className="text-4xl font-black text-gray-800 dark:text-white tracking-tighter">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Trend - Area Chart with Gradients */}
                <div className="glass-panel p-8 shadow-xl">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight">Tendencia de Ingresos</h3>
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase rounded-full">Real-time</span>
                    </div>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.revenueByDay}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.05} />
                                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} tickFormatter={(str) => {
                                    // Handle both YYYY-MM-DD and YYYY-MM
                                    const parts = str.split('-');
                                    const d = parts.length === 2 
                                        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1)
                                        : new Date(str);
                                    
                                    return range === 'year' 
                                        ? d.toLocaleDateString(undefined, { month: 'short' })
                                        : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                                }} />
                                <YAxis stroke="#9CA3AF" fontSize={10} tickFormatter={(val) => `$${val}`} />
                                <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="total" 
                                    name="Ingresos"
                                    stroke="#3B82F6" 
                                    strokeWidth={4} 
                                    fillOpacity={1} 
                                    fill="url(#colorRevenue)" 
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Items - Horizontal Bar Chart */}
                <div className="glass-panel p-8 shadow-xl">
                    <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight mb-8">Productos Estrella</h3>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.topSellingItems} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" opacity={0.05} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={11} width={120} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                                <Bar 
                                    dataKey="quantity" 
                                    name="Cantidad"
                                    fill="#10B981" 
                                    radius={[0, 10, 10, 0]} 
                                    barSize={24}
                                    animationDuration={1500}
                                    className="filter drop-shadow-lg"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Secondary Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales by Category - Donut Chart */}
                <div className="glass-panel p-8 shadow-xl">
                    <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight mb-8">Ventas por Categoría</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.salesByCategory}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="total"
                                    nameKey="category"
                                    animationDuration={2000}
                                >
                                    {stats.salesByCategory.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none hover:opacity-80 transition-opacity" />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Hourly Activity - Bar Chart with Peak Indicator */}
                <div className="glass-panel p-8 shadow-xl">
                    <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight mb-8">Actividad de Clientes</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.activityByHour}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.05} />
                                <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={10} tickFormatter={(h) => `${h}h`} />
                                <YAxis stroke="#9CA3AF" fontSize={10} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                                <Bar 
                                    dataKey="count" 
                                    name="Pedidos"
                                    fill="#F59E0B" 
                                    radius={[6, 6, 0, 0]}
                                    animationDuration={1500}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales by Billing Type - Donut Chart */}
                <div className="glass-panel p-8 shadow-xl">
                    <h3 className="text-xl font-black text-gray-800 dark:text-white tracking-tight mb-8">Ventas por Tipo de Comprobante</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.salesByBillingType}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="total"
                                    nameKey="type"
                                    animationDuration={2000}
                                >
                                    {stats.salesByBillingType.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} className="outline-none hover:opacity-80 transition-opacity" />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
