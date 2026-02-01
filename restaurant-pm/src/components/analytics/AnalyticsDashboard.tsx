import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { analyticsService, DashboardStats } from '../../services/AnalyticsService';
import { RefreshCcwIcon as RefreshIcon } from '../Icons';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const AnalyticsDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [range, setRange] = useState<'today' | 'week' | 'month'>('today');
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

    if (loading && !stats) return <div className="p-8 text-center text-gray-500">Cargando análisis...</div>;
    if (!stats) return <div className="p-8 text-center text-gray-500">No hay datos disponibles</div>;

    const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-end items-center bg-white dark:bg-dark-800 p-4 rounded-xl shadow-sm">
                <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Rango de datos:</span>
                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value as any)}
                        className="bg-gray-50 dark:bg-dark-700 border-none rounded-lg text-sm p-2 focus:ring-2 focus:ring-primary-500 dark:text-white"
                    >
                        <option value="today">Hoy</option>
                        <option value="week">Esta Semana</option>
                        <option value="month">Este Mes</option>
                    </select>
                    <button onClick={fetchStats} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors" title="Actualizar datos">
                        <RefreshIcon />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ventas Totales</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pedidos Totales</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{stats.totalOrders}</p>
                </div>
                <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ticket Promedio</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{formatCurrency(stats.averageTicket)}</p>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend */}
                <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white">Tendencia de Ventas</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.revenueByDay}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickFormatter={(str) => str.slice(5)} />
                                <YAxis stroke="#9CA3AF" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                    itemStyle={{ color: '#F3F4F6' }}
                                />
                                <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Items */}
                <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white">Top 10 Platos Más Vendidos</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.topSellingItems} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" opacity={0.1} />
                                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                                <YAxis dataKey="name" type="category" width={100} stroke="#9CA3AF" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                />
                                <Bar dataKey="quantity" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales by Category/Channel */}
                <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white">Ventas por Tipo de Pedido</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.salesByCategory}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="total"
                                    nameKey="category"
                                >
                                    {stats.salesByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Hourly Activity */}
                <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white">Actividad por Hora (Horas Pico)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.activityByHour}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                                <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={12} tickFormatter={(h) => `${h}:00`} />
                                <YAxis stroke="#9CA3AF" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                />
                                <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
