'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Users, Package, Settings, ShoppingCart, TrendingUp, TrendingDown, DollarSign, Box, Activity, Store, Maximize2, X, ArrowUpRight, ArrowDownRight, Clock, Tag, Layers, Ruler, ImageIcon, ExternalLink } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { toast } from 'sonner';

export default function AdminDashboard() {
    const { hasRole } = usePermission();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());
    const [month, setMonth] = useState<string>(''); // '' = All months
    const [expandedChart, setExpandedChart] = useState<string | null>(null);
    const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null);
    const [drillDownStudio, setDrillDownStudio] = useState<string | null>(null);
    const [drillDownSeries, setDrillDownSeries] = useState<string | null>(null);
    const [drillDownPriceBucket, setDrillDownPriceBucket] = useState<string | null>(null);
    const [seriesFilter, setSeriesFilter] = useState<string>('all');
    const [previewImage, setPreviewImage] = useState<{ url: string, nome: string } | null>(null);

    // Fetch Dashboard Data
    useEffect(() => {
        fetchData();
    }, [year, month]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();

            if (year) {
                if (month) {
                    // Specific Month
                    const start = new Date(parseInt(year), parseInt(month), 1);
                    const end = new Date(parseInt(year), parseInt(month) + 1, 0); // Last day of month
                    params.append('startDate', start.toISOString());
                    params.append('endDate', end.toISOString());
                } else {
                    // Whole Year
                    const start = new Date(parseInt(year), 0, 1);
                    const end = new Date(parseInt(year), 11, 31);
                    params.append('startDate', start.toISOString());
                    params.append('endDate', end.toISOString());
                }
            }

            const res = await fetch(`/api/admin/dashboard?${params.toString()}`);
            const json = await res.json();
            if (res.ok) setData(json);
            else {
                console.error('Failed to load dashboard', json);
                toast.error('Erro ao carregar dados do painel');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const months = [
        { value: '0', label: 'Janeiro' },
        { value: '1', label: 'Fevereiro' },
        { value: '2', label: 'Março' },
        { value: '3', label: 'Abril' },
        { value: '4', label: 'Maio' },
        { value: '5', label: 'Junho' },
        { value: '6', label: 'Julho' },
        { value: '7', label: 'Agosto' },
        { value: '8', label: 'Setembro' },
        { value: '9', label: 'Outubro' },
        { value: '10', label: 'Novembro' },
        { value: '11', label: 'Dezembro' },
    ];

    const canViewFinance = hasRole('admin') || hasRole('finance');

    const renderTrend = (value: number | undefined | null, subtext?: string | null, comparisonLabel?: string) => {
        if (subtext) {
            return <span className="text-zinc-500 text-xs font-medium bg-zinc-800 px-1.5 py-0.5 rounded">{subtext}</span>;
        }

        // Special logic for Revenue comparison label
        if (comparisonLabel) {
            const isPositive = (value || 0) > 0;
            return (
                <div className="flex flex-col items-end">
                    {(value !== null && value !== undefined) && (
                        <span className={`text-xs font-bold flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {Math.abs(value).toFixed(1)}%
                        </span>
                    )}
                    <span className="text-[10px] text-zinc-500">{comparisonLabel}</span>
                </div>
            );
        }

        if (value === null || value === undefined) {
            return <span className="text-zinc-600 text-[10px] font-medium uppercase tracking-wider">Sem histórico anterior</span>;
        }
        if (value === 0) return <span className="text-zinc-500 text-xs flex items-center gap-1">Lateral</span>;
        const isPositive = value > 0;
        return (
            <span className={`text-xs font-bold flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(value).toFixed(1)}%
            </span>
        );
    };

    const kpis = [
        // 1. Revenue
        {
            title: `Faturamento ${month ? 'Mensal' : 'Anual'}`,
            value: data ? `R$ ${data.kpis.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
            trend: data?.kpis?.trends?.revenue,
            comparisonLabel: data?.kpis?.comparisonLabel || 'vs. anterior',
            icon: DollarSign,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
            restricted: true
        },
        // 2. Profit
        {
            title: 'Lucro Total',
            value: data ? `R$ ${data.kpis.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
            trend: undefined,
            subtext: data ? `Margem ${(data.kpis.profitMargin || 0).toFixed(1)}%` : null,
            icon: TrendingUp,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            restricted: true
        },
        // 3. Cost
        {
            title: 'Custo De Estúdios',
            value: data ? `R$ ${data.kpis.totalFixedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
            trend: undefined,
            subtext: data ? `Receita é ${(data.kpis.revenueCoverage || 0).toFixed(1)}% do custo` : null,
            icon: DollarSign,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            restricted: true
        },
        // 4. Paid Sales
        {
            title: 'Vendas Confirmadas',
            value: data ? data.kpis.totalPaidSalesCount : '-',
            trend: data?.kpis?.trends?.paidSalesCount,
            subtext: data ? `${data.kpis.totalItemsMade} produzidas` : null,
            icon: ShoppingCart,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            restricted: false
        },
        // 5. Catalog
        {
            title: 'Catálogo de Modelos',
            value: data ? data.kpis.totalInventoryCount : '-',
            trend: undefined,
            icon: Box,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
            restricted: false
        }
    ];

    const menuItems = [
        { label: 'Gerenciar Usuários', href: '/admin/users', roles: ['admin'], icon: Users },
        { label: 'Gerenciar Estúdios', href: '/admin/studios', roles: ['admin'], icon: Activity },
        { label: 'Catálogo & Precificação', href: '/admin/figures', roles: ['admin', 'pricing', 'marketing'], icon: Package },
        { label: 'Histórico de Vendas', href: '/admin/sales', roles: ['admin', 'sales'], icon: ShoppingCart },
        { label: 'Configurações', href: '/admin/settings', roles: ['admin'], icon: Settings },
    ];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-zinc-900 border border-zinc-700 p-3 rounded shadow-xl">
                    <p className="font-bold text-white mb-1">{label}</p>
                    <p className="text-zinc-300">
                        {payload[0].value.toLocaleString('pt-BR')}
                    </p>
                </div>
            );
        }
        return null;
    };

    const CategoryTooltip = ({ active, payload, suffix = "vendas", formatter }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const value = payload[0].value;
            // Handle if value is array (Recharts issue sometimes) or number
            const safeValue = Array.isArray(value) ? value[0] : value;

            return (
                <div className="bg-zinc-900 border border-zinc-700 p-3 rounded shadow-xl">
                    <p className="font-bold text-white mb-1">{data.name}</p>
                    <p className="text-zinc-300">
                        {formatter ? formatter(safeValue) : safeValue} {suffix}
                    </p>
                </div>
            );
        }
        return null;
    }

    if (loading) return <div className="p-12 text-center text-zinc-500">Carregando painel analítico...</div>;

    // Expandable Chart Renderer
    const renderExpandedChart = () => {
        if (!expandedChart || !data) return null;
        if ((expandedChart === 'revenueVsCost' || expandedChart === 'revenueByStudio') && !canViewFinance) return null;

        let chartData: any[] = [];
        let ChartComponent: any = null;
        let title = "";

        switch (expandedChart) {
            case 'revenueVsCost':
                chartData = data.charts.revenueVsCost;
                title = "Rendimento vs Custo (Todos)";
                ChartComponent = (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ left: 0, bottom: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" />
                            <YAxis hide />
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }} formatter={(value: any) => `R$ ${(value || 0).toLocaleString('pt-BR')}`} />
                            <Bar dataKey="revenue" name="Rendimento" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="cost" name="Custo Mensal" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );
                break;
            case 'inventoryByStudio':
                if (drillDownStudio) {
                    title = "Modelos: " + drillDownStudio + " (Séries)";
                    // Filter Series for this studio from the aggregated data
                    const studioData = data.charts.inventoryByStudio.find((s: any) => s.name === drillDownStudio);

                    if (!studioData || !studioData.series) {
                        ChartComponent = (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                                <Box size={48} className="mb-4 opacity-50" />
                                <p>Nenhuma série encontrada para "{drillDownStudio}"</p>
                            </div>
                        );
                    } else {
                        // Transform { SeriesName: Count } to Array
                        chartData = Object.entries(studioData.series)
                            .map(([name, value]: any) => ({ name, value }))
                            .sort((a: any, b: any) => b.value - a.value);

                        ChartComponent = (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} width={120} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {chartData.map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#a855f7" />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        );
                    }
                } else {
                    chartData = data.charts.inventoryByStudio;
                    title = "Modelos por Estúdio (Todos)";
                    ChartComponent = (
                        <div className="w-full h-full flex flex-col">
                            <p className="text-zinc-500 text-sm mb-2 text-center">Clique em uma barra para ver as séries</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ left: 0, bottom: 50 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" />
                                    <YAxis hide />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} onClick={(data) => setDrillDownStudio(data?.name || null)} className="cursor-pointer">
                                        {chartData.map((_e: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill="#a855f7"
                                                className="hover:opacity-80 transition-opacity cursor-pointer"
                                                onClick={() => setDrillDownStudio(_e.name || null)}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    );
                }
                break;
            case 'revenueByStudio':
                if (drillDownStudio) {
                    title = "Vendas: " + drillDownStudio + " (Séries)";
                    // Filter Series that have sales for this studio
                    chartData = (data.charts.salesBySeries || [])
                        .map((s: any) => ({
                            name: s.name,
                            value: s.studios?.[drillDownStudio] || 0
                        }))
                        .filter((s: any) => s.value > 0)
                        .sort((a: any, b: any) => b.value - a.value);

                    if (chartData.length === 0) {
                        ChartComponent = (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                                <Box size={48} className="mb-4 opacity-50" />
                                <p>Nenhuma venda encontrada para "{drillDownStudio}"</p>
                            </div>
                        );
                    } else {
                        ChartComponent = (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} width={120} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {chartData.map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#ec4899" />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        );
                    }
                } else {
                    chartData = data.charts.revenueByStudio;
                    title = "Faturamento Histórico (Todos)";
                    ChartComponent = (
                        <div className="w-full h-full flex flex-col">
                            <p className="text-zinc-500 text-sm mb-2 text-center">Clique em uma barra para ver as séries</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} width={120} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} onClick={(data) => setDrillDownStudio(data?.name || null)} className="cursor-pointer">
                                        {chartData.map((_e: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill="#3b82f6"
                                                className="hover:opacity-80 transition-opacity cursor-pointer"
                                                onClick={() => setDrillDownStudio(_e.name || null)}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    );
                }
                break;
            case 'soldByStudio':
                chartData = data.charts.soldByStudio;
                title = "Unidades Vendidas (Todos)";
                ChartComponent = (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} width={120} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {chartData.map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#f97316" />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                );
                break;
            case 'salesByCategory':
                if (drillDownCategory) {
                    title = "Vendas: " + drillDownCategory;
                    chartData = (data.charts.salesBySeries || [])
                        .filter((s: any) => s.category === drillDownCategory)
                        .slice(0, 15);

                    if (!chartData || chartData.length === 0) {
                        ChartComponent = (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                                <Box size={48} className="mb-4 opacity-50" />
                                <p>Nenhuma venda de série para esta categoria.</p>
                            </div>
                        );
                    } else {
                        ChartComponent = (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} width={120} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {chartData.map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#ec4899" />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        );
                    }
                } else {
                    chartData = data.charts.salesByCategory || [];
                    title = "Vendas por Categoria";
                    ChartComponent = (
                        <div className="w-full h-full flex justify-center flex-col items-center">
                            <p className="text-zinc-500 text-sm mb-2">Clique em uma fatia para ver detalhes</p>
                            <ResponsiveContainer width="100%" height="80%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        outerRadius={150}
                                        fill="#8884d8"
                                        dataKey="value"
                                        onClick={(data: any) => {
                                            const category = data?.name || data?.payload?.name;
                                            if (category) setDrillDownCategory(category);
                                        }}
                                        className="cursor-pointer outline-none"
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {chartData.map((entry: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7'][index % 5]}
                                                className="hover:opacity-80 transition-opacity cursor-pointer"
                                                onClick={() => setDrillDownCategory(entry.name)}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CategoryTooltip />} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    );
                }
                break;
            case 'avgPriceByStudio':
                chartData = data.charts.avgPriceByStudio || [];

                if (!chartData || chartData.length === 0) {
                    ChartComponent = <div className="flex h-full items-center justify-center text-zinc-500">Sem dados para exibir.</div>;
                } else {
                    title = "Ticket Médio por Estúdio (Ranking Completo)";
                    // Calc dynamic height
                    const dynamicHeight = Math.max(600, chartData.length * 40);

                    ChartComponent = (
                        <div className="h-full w-full overflow-hidden flex flex-col">
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                                <div style={{ height: dynamicHeight, width: '100%', minHeight: '100%' }}>
                                    <ResponsiveContainer width="99%" height="100%">
                                        <BarChart
                                            data={chartData}
                                            layout="vertical"
                                            margin={{ left: 20, right: 30, top: 20, bottom: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                            <XAxis type="number" tickFormatter={(v) => `R$ ${v}`} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                            <YAxis dataKey="name" type="category" width={150} tick={{ fill: '#e4e4e7', fontSize: 11, fontWeight: 500 }} />
                                            <Tooltip
                                                cursor={{ fill: '#ffffff10' }}
                                                content={<CategoryTooltip suffix="" formatter={(v: number, name: any, item: any) => `R$ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${item?.payload?.count || 0} modelos)`} />}
                                            />
                                            <Bar dataKey="value" name="Ticket Médio" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={24}>
                                                {chartData.map((e: any, index: number) => <Cell key={index} fill="#a855f7" />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    );
                }
                break;
                chartData = data.charts.costByStudio || [];
                title = "Custo Mensal por Estúdio (Top 20)";
                ChartComponent = (
                    <div className="w-full h-full flex flex-col">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.slice(0, 20)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} interval={0} angle={-45} textAnchor="end" />
                                <YAxis stroke="#ef4444" tickFormatter={(value) => `R$${value}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                                    formatter={(value: any) => [`R$ ${(Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Custo Mensal']}
                                />
                                <Bar dataKey="value" name="Custo Mensal" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                );
                break;
            case 'inventoryBySeries':
                if (drillDownSeries) {
                    title = "Estúdios: " + drillDownSeries;
                    const seriesData = (data.charts.inventoryBySeries || []).find((s: any) => s.name === drillDownSeries);

                    if (!seriesData || !seriesData.studios) {
                        ChartComponent = (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                                <Box size={48} className="mb-4 opacity-50" />
                                <p>Nenhum estúdio encontrado para "{drillDownSeries}"</p>
                            </div>
                        );
                    } else {
                        // Transform studios map to array
                        chartData = Object.entries(seriesData.studios)
                            .map(([name, value]: any) => ({ name, value }))
                            .sort((a: any, b: any) => b.value - a.value);

                        ChartComponent = (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} width={120} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {chartData.map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#f97316" />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        );
                    }
                } else {
                    const allData = data.charts.inventoryBySeries || [];
                    chartData = seriesFilter === 'all'
                        ? allData
                        : allData.filter((s: any) => s.category === seriesFilter);

                    // Removed limit as requested by user
                    // if (chartData.length > 50) chartData = chartData.slice(0, 50);

                    title = "Séries em Estoque";

                    // Filter Categories extraction (Sort by ID)
                    const categoryMap = new Map();
                    // Initialize with 'all'
                    categoryMap.set('all', { name: 'Todas', id: 0 });

                    allData.forEach((d: any) => {
                        if (!categoryMap.has(d.category)) {
                            // Backend sends 'categoryId' now (or default 999 for Outros)
                            categoryMap.set(d.category, { name: d.category, id: d.categoryId || 999 });
                        }
                    });

                    const categories = Array.from(categoryMap.values()).sort((a: any, b: any) => a.id - b.id);

                    ChartComponent = (
                        <div className="w-full h-full flex flex-col">
                            {/* Filter Bar */}
                            <div className="flex flex-wrap gap-2 mb-4 justify-center">
                                {categories.map((cat: any) => (
                                    <button
                                        key={cat.name}
                                        onClick={() => setSeriesFilter(cat.name === 'Todas' ? 'all' : cat.name)}
                                        className={`px-3 py-1 text-xs rounded-full transition-colors border ${(seriesFilter === 'all' && cat.name === 'Todas') || seriesFilter === cat.name
                                            ? 'bg-purple-600 text-white border-purple-500'
                                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                                            }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            <p className="text-zinc-500 text-sm mb-2 text-center">Clique na barra para ver os estúdios</p>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} width={120} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} onClick={(data) => setDrillDownSeries(data?.name || null)} className="cursor-pointer">
                                            {chartData.map((_e: any, index: number) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill="#a855f7"
                                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                                    onClick={() => setDrillDownSeries(_e.name || null)}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    );
                }
                break;
            case 'salesBySeries':
                chartData = data.charts.salesBySeries || [];
                title = "Vendas por Série (Todos)";
                ChartComponent = (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} width={120} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {chartData.map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#ec4899" />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                );
                break;
            case 'priceDistribution':
                if (drillDownPriceBucket) {
                    title = "Modelos na Faixa: " + drillDownPriceBucket;
                    const bucketData = (data.charts.priceDistribution || []).find((b: any) => b.name === drillDownPriceBucket);

                    if (!bucketData || !bucketData.figures || bucketData.figures.length === 0) {
                        ChartComponent = (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                                <Box size={48} className="mb-4 opacity-50" />
                                <p>Nenhum modelo nesta faixa.</p>
                            </div>
                        );
                    } else {
                        // Render a list of figures instead of a chart since we want to see the specific figures
                        ChartComponent = (
                            <div className="w-full h-full overflow-auto pr-2">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-zinc-950/30 text-zinc-500 sticky top-0 backdrop-blur-md">
                                        <tr>
                                            <th className="px-4 py-3">ID</th>
                                            <th className="px-4 py-3">Modelo (Clique p/ ver)</th>
                                            <th className="px-4 py-3 text-right">Preço</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {bucketData.figures.map((f: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-4 py-3 text-zinc-500">#{f.id}</td>
                                                <td className="px-4 py-3 font-medium text-white">
                                                    <button
                                                        onClick={() => {
                                                            if (f.image_url) {
                                                                setPreviewImage({ url: f.image_url, nome: f.name });
                                                            } else {
                                                                toast.info('Sem imagem cadastrada');
                                                            }
                                                        }}
                                                        className={`flex items-center gap-2 hover:text-orange-500 transition-colors text-left ${!f.image_url ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                        title={f.image_url ? "Clique para ver a foto" : "Sem foto cadastrada"}
                                                    >
                                                        {f.name}
                                                        {f.image_url && <ExternalLink size={14} className="text-zinc-500" />}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                                                    R$ {f.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    }
                } else {
                    chartData = data.charts.priceDistribution || [];
                    title = "Distribuição de Preço do Catálogo";
                    ChartComponent = (
                        <div className="w-full h-full flex flex-col">
                            <p className="text-zinc-500 text-sm mb-2 text-center">Clique na barra para ver os modelos que se encaixam nesta faixa de preço</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} interval={0} angle={0} height={40} />
                                    <YAxis hide />
                                    <Tooltip content={<CategoryTooltip suffix="figuras" />} cursor={{ fill: '#ffffff10' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} onClick={(data) => setDrillDownPriceBucket(data?.name || null)} className="cursor-pointer">
                                        {chartData.map((_e: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill="#3b82f6"
                                                className="hover:opacity-80 transition-opacity cursor-pointer"
                                                onClick={() => setDrillDownPriceBucket(_e.name || null)}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    );
                }
                break;
        }

        const itemHeight = 40;
        const itemWidth = 60;
        const isVertical = expandedChart === 'revenueByStudio' || expandedChart === 'soldByStudio' || expandedChart === 'salesBySeries' || (expandedChart === 'salesByCategory' && drillDownCategory) || (expandedChart === 'revenueByStudio' && drillDownStudio) || (expandedChart === 'inventoryByStudio' && drillDownStudio) || (expandedChart === 'inventoryBySeries');
        const dynamicStyle = isVertical
            ? { height: `${Math.max(500, chartData.length * itemHeight)}px`, width: '100%' }
            : { width: `${Math.max(1000, chartData.length * itemWidth)}px`, height: '100%' };

        // Special case for Pie (only when NOT drilling down)
        if (expandedChart === 'salesByCategory' && !drillDownCategory) {
            dynamicStyle.height = '100%';
            dynamicStyle.width = '100%';
        }


        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setExpandedChart(null); setDrillDownCategory(null); setDrillDownStudio(null); setDrillDownSeries(null); setDrillDownPriceBucket(null); }}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-6xl h-[80vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                        <div className="flex items-center gap-4">
                            {(drillDownCategory || drillDownStudio || drillDownSeries || drillDownPriceBucket) && (
                                <button
                                    onClick={() => {
                                        if (drillDownCategory) setDrillDownCategory(null);
                                        if (drillDownStudio) setDrillDownStudio(null);
                                        if (drillDownSeries) setDrillDownSeries(null);
                                        if (drillDownPriceBucket) setDrillDownPriceBucket(null);
                                    }}
                                    className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors border border-zinc-700"
                                >
                                    ← Voltar
                                </button>
                            )}
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <TrendingUp size={24} className="text-orange-500" />
                                {title}
                            </h2>
                        </div>
                        <button onClick={() => { setExpandedChart(null); setDrillDownCategory(null); setDrillDownStudio(null); setDrillDownSeries(null); setDrillDownPriceBucket(null); }} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                        <div style={dynamicStyle} className={isVertical || expandedChart === 'salesByCategory' ? "w-full" : "h-full"}>
                            {ChartComponent}
                        </div>
                    </div>
                </div>

            </div>
        );
    }

    return (
        <div className="text-white min-h-screen pb-12">
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 border-b border-zinc-800 pb-6 gap-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="bg-zinc-900 border border-zinc-700 hover:border-orange-500 hover:text-orange-500 p-2 rounded-lg transition-colors group" title="Ir para Home">
                            <Store size={20} className="text-zinc-400 group-hover:text-orange-500 transition-colors" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold">Painel Administrativo</h1>
                            <p className="text-zinc-400">Visão geral do negócio</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-end md:items-center w-full xl:w-auto">
                    <div className="flex items-center gap-2 bg-zinc-900 p-1.5 rounded-lg border border-zinc-800">
                        <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="bg-zinc-900 text-sm font-medium outline-none text-zinc-300 hover:text-white cursor-pointer px-2 rounded-md"
                        >
                            {Array.from({ length: new Date().getFullYear() - 2024 + 1 }, (_, i) => 2024 + i).map(y => (
                                <option key={y} value={y} className="bg-zinc-900 text-zinc-200">{y}</option>
                            ))}
                        </select>
                        <div className="h-4 w-[1px] bg-zinc-700"></div>
                        <select
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="bg-zinc-900 text-sm font-medium outline-none text-zinc-300 hover:text-white cursor-pointer px-2 rounded-md"
                        >
                            <option value="" className="bg-zinc-900 text-zinc-200">Todo o ano</option>
                            {months.map(m => (
                                <option key={m.value} value={m.value} className="bg-zinc-900 text-zinc-200">{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {menuItems.map(item => {
                            if (!item.roles.some(r => hasRole(r))) return null;
                            return (
                                <Link key={item.href} href={item.href} className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-lg border border-zinc-800 transition-colors text-sm font-medium">
                                    <item.icon size={16} className="text-zinc-500" />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
                {kpis.map((kpi: any, idx) => {
                    if (kpi.restricted && !canViewFinance) return null;
                    return (
                        <div key={idx} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative overflow-hidden group">
                            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 ${kpi.bg.replace('/10', '')} blur-2xl group-hover:opacity-10 transition-opacity`}></div>

                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-2.5 rounded-lg ${kpi.bg}`}>
                                    <kpi.icon className={kpi.color} size={20} />
                                </div>
                                {renderTrend(kpi.trend, kpi.subtext, kpi.comparisonLabel)}
                            </div>

                            <div>
                                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide mb-1">{kpi.title}</p>
                                <p className="text-2xl font-bold text-white">{loading ? '...' : kpi.value}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                        <h3 className="font-bold flex items-center gap-2">
                            <Package size={18} className="text-yellow-500" />
                            Top Modelos (Receita)
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-zinc-950/30 text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Modelo</th>
                                    <th className="px-4 py-3">Estúdio</th>
                                    <th className="px-4 py-3 text-right">Qtd</th>
                                    {canViewFinance && <th className="px-4 py-3 text-right">Receita</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {data?.lists?.topProducts?.length > 0 ? (
                                    data.lists.topProducts.map((p: any, i: number) => (
                                        <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                                            <td className="px-4 py-3 text-zinc-400">{p.studio}</td>
                                            <td className="px-4 py-3 text-right text-zinc-300">{p.qty}</td>
                                            {canViewFinance && (
                                                <td className="px-4 py-3 text-right font-medium text-emerald-400">
                                                    R$ {p.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={canViewFinance ? 4 : 3} className="px-4 py-8 text-center text-zinc-500">
                                            Nenhum dado encontrado no período.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                        <h3 className="font-bold flex items-center gap-2">
                            <Clock size={18} className="text-blue-500" />
                            Vendas Recentes
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-zinc-950/30 text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3">Modelo</th>
                                    {canViewFinance && <th className="px-4 py-3 text-right">Valor</th>}
                                    <th className="px-4 py-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {data?.lists?.recentActivity?.length > 0 ? (
                                    data.lists.recentActivity.map((a: any, i: number) => (
                                        <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                                                {new Date(a.date).toLocaleDateString('pt-BR')} <span className="text-zinc-600 text-xs">{new Date(a.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-white truncate max-w-[200px]">{a.product}</td>
                                            {canViewFinance && (
                                                <td className="px-4 py-3 text-right font-medium text-emerald-400">
                                                    R$ {a.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-right">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.status === 'Concluída' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    a.status === 'Cancelada' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'
                                                    }`}>
                                                    {a.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={canViewFinance ? 4 : 3} className="px-4 py-8 text-center text-zinc-500">
                                            Nenhuma atividade recente.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* ROW 1: FINANCE */}
                {canViewFinance && (
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative group">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Activity size={20} className="text-emerald-500" />
                                Rendimento vs Custo (Top Estúdios)
                            </h2>
                            <button onClick={() => setExpandedChart('revenueVsCost')} className="p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Expandir">
                                <Maximize2 size={16} />
                            </button>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.charts.revenueVsCost.slice(0, 10)} margin={{ left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }} formatter={(value: any) => `R$ ${(value || 0).toLocaleString('pt-BR')}`} />
                                    <Bar dataKey="revenue" name="Rendimento" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="cost" name="Custo Mensal" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {canViewFinance && (
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative group">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Activity size={20} className="text-red-500" />
                                Custo por Estúdio
                            </h2>
                            <button onClick={() => setExpandedChart('costByStudio')} className="p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Expandir">
                                <Maximize2 size={16} />
                            </button>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.charts.costByStudio.slice(0, 10)} margin={{ left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                                    <YAxis hide />
                                    <Tooltip content={<CategoryTooltip suffix="" formatter={(v: number) => `R$ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />} cursor={{ fill: '#ffffff10' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {data?.charts.costByStudio.slice(0, 10).map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#ef4444" />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}


                {/* ROW 2: SALES */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative group">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Tag size={20} className="text-indigo-500" />
                            Vendas por Categoria
                        </h2>
                        <button onClick={() => setExpandedChart('salesByCategory')} className="p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Expandir">
                            <Maximize2 size={16} />
                        </button>
                    </div>
                    <div className="h-[300px] w-full flex justify-center items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data?.charts?.salesByCategory || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {(data?.charts?.salesByCategory || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7'][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CategoryTooltip />} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative group">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Layers size={20} className="text-pink-500" />
                            Vendas por Série
                        </h2>
                        <button onClick={() => setExpandedChart('salesBySeries')} className="p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Expandir">
                            <Maximize2 size={16} />
                        </button>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={(data?.charts?.salesBySeries || []).slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={110} />
                                <Tooltip content={<CategoryTooltip suffix="vendas" />} cursor={{ fill: '#ffffff10' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {(data?.charts?.salesBySeries || []).slice(0, 10).map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#ec4899" />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>


                {/* ROW 3: INVENTORY (PRODUCTION / DETAILS) */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative group">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Box size={20} className="text-purple-500" />
                            Modelos por Estúdio (Automático)
                        </h2>
                        <button onClick={() => setExpandedChart('inventoryByStudio')} className="p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Expandir">
                            <Maximize2 size={16} />
                        </button>
                    </div>
                    <div className="h-[400px] w-full flex justify-center items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="55%" data={data?.charts.inventoryByStudio}>
                                <PolarGrid stroke="#3f3f46" />
                                <PolarAngleAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                                <Radar name="Modelos" dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.5} />
                                <Tooltip content={<CategoryTooltip suffix="modelos" />} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative group">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Layers size={20} className="text-purple-500" />
                            Modelos por Série
                        </h2>
                        <button onClick={() => setExpandedChart('inventoryBySeries')} className="p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Expandir">
                            <Maximize2 size={16} />
                        </button>
                    </div>
                    <div className="h-[400px] w-full flex justify-center text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={(data?.charts.inventoryBySeries || []).slice(0, 5)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {(data?.charts.inventoryBySeries || []).slice(0, 5).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7'][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CategoryTooltip suffix="figuras" />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>


                {/* ROW 4: ANALYTICS (REVENUE + SOLD) */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative group">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <DollarSign size={20} className="text-blue-500" />
                            Faturamento por Estúdio
                        </h2>
                        <button onClick={() => setExpandedChart('revenueByStudio')} className="p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Expandir">
                            <Maximize2 size={16} />
                        </button>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts.revenueByStudio.slice(0, 10)} margin={{ left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                                <YAxis hide />
                                <Tooltip content={<CategoryTooltip suffix="" formatter={(v: number) => `R$ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />} cursor={{ fill: '#ffffff10' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {data?.charts.revenueByStudio.slice(0, 10).map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#3b82f6" />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative group">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <ShoppingCart size={20} className="text-orange-500" />
                            Unidades Vendidas
                        </h2>
                        <button onClick={() => setExpandedChart('soldByStudio')} className="p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Expandir">
                            <Maximize2 size={16} />
                        </button>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts.soldByStudio.slice(0, 10)} margin={{ left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                                <YAxis hide />
                                <Tooltip content={<CategoryTooltip suffix="unid." />} cursor={{ fill: '#ffffff10' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {data?.charts.soldByStudio.slice(0, 10).map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#f97316" />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Price Analytics Section */}
            <h2 className="text-xl font-bold mt-8 mb-4 flex items-center gap-2">
                <DollarSign className="text-green-500" />
                Analytics de Preço <span className="text-sm font-normal text-zinc-500">(Baseado em Orçamento Premium)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

                {/* KPI Column: Potentials */}
                <div className="flex flex-col gap-4">
                    {/* KPI: Premium Potential */}
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col justify-center items-center flex-1">
                        <h3 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-1">Potencial (Premium)</h3>
                        <p className="text-3xl font-bold text-green-400">
                            {data?.charts.totalPortfolioValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                        </p>
                    </div>

                    {/* KPI: Basic Potential */}
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col justify-center items-center flex-1">
                        <h3 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-1">Potencial (Básico)</h3>
                        <p className="text-3xl font-bold text-zinc-300">
                            {data?.charts.totalPortfolioBasic?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                        </p>
                    </div>
                </div>

                {/* Chart: Avg Price by Studio */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative group">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Tag size={20} className="text-purple-500" />
                            Ticket Médio por Estúdio
                        </h2>
                        <button onClick={() => setExpandedChart('avgPriceByStudio')} className="p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Expandir">
                            <Maximize2 size={16} />
                        </button>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts.avgPriceByStudio?.slice(0, 10) || []} margin={{ left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                                <YAxis hide />
                                <Tooltip content={<CategoryTooltip suffix="" formatter={(v: number) => `R$ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />} cursor={{ fill: '#ffffff10' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {(data?.charts.avgPriceByStudio || []).slice(0, 10).map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#a855f7" />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart: Price Distribution */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative group">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Layers size={20} className="text-blue-500" />
                            Distribuição de Preço
                        </h2>
                        <button onClick={() => setExpandedChart('priceDistribution')} className="p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Expandir">
                            <Maximize2 size={16} />
                        </button>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts.priceDistribution || []} margin={{ left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                                <YAxis hide />
                                <Tooltip content={<CategoryTooltip suffix="figuras" />} cursor={{ fill: '#ffffff10' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} onClick={(bdata) => { setExpandedChart('priceDistribution'); setDrillDownPriceBucket(bdata?.name || null); }} className="cursor-pointer">
                                    {(data?.charts.priceDistribution || []).map((_e: any, index: number) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill="#3b82f6"
                                            className="hover:opacity-80 transition-opacity cursor-pointer"
                                            onClick={() => { setExpandedChart('priceDistribution'); setDrillDownPriceBucket(_e.name || null); }}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* MODAL DE IMAGEM */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
                        <button
                            className="absolute -top-10 right-0 text-white hover:text-orange-500 z-50 transition-colors bg-zinc-900 rounded-full p-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(null);
                            }}
                        >
                            <X size={24} />
                        </button>

                        <img
                            src={previewImage.url}
                            alt={previewImage.nome}
                            className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        />
                        <p className="text-white mt-4 font-bold text-center text-lg">{previewImage.nome}</p>
                    </div>
                </div>
            )}

            {renderExpandedChart()}
        </div>
    );
}
