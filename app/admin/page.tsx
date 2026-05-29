'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Users, Package, Settings, ShoppingCart, TrendingUp, TrendingDown, DollarSign, Box, Activity, Store, Maximize2, X, ArrowUpRight, ArrowDownRight, Clock, Tag, Layers, Ruler, ImageIcon, ExternalLink, Droplet, Printer, Eye, EyeOff } from 'lucide-react';
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
    const [drillDownSeller, setDrillDownSeller] = useState<string | null>(null);
    const [seriesFilter, setSeriesFilter] = useState<string>('all');
    const [previewImage, setPreviewImage] = useState<{ url: string, nome: string } | null>(null);
    const [hideValues, setHideValues] = useState<boolean>(false);

    const getInitials = (name: string) => {
        const clean = (name || '').trim().replace(/\s+/g, ' ');
        if (!clean) return '';
        const parts = clean.split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

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

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/90 border border-zinc-800 p-4 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5">{label}</p>
                    <p className="text-zinc-100 font-black text-sm tracking-tight">
                        {payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
            );
        }
        return null;
    };

    const CategoryTooltip = ({ active, payload, label, suffix = "vendas", formatter }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const value = payload[0].value;
            const safeValue = Array.isArray(value) ? value[0] : value;

            return (
                <div className="bg-black/90 border border-zinc-800 p-4 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5">{data.name || label}</p>
                    <p className="text-zinc-100 font-black text-sm tracking-tight flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]"></span>
                        {formatter ? formatter(safeValue, data.name || label, payload[0]) : `${safeValue} ${suffix}`}
                    </p>
                </div>
            );
        }
        return null;
    }

    if (loading) return (
        <div className="min-h-screen bg-black text-white pb-12 transition-colors duration-300 px-4 sm:px-8 mt-8 relative overflow-hidden">
            {/* Background Blobs for SciFi loading */}
            <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500 rounded-full blur-[150px] mix-blend-screen" />
                <div className="absolute top-[40%] right-[-10%] w-[30%] h-[30%] bg-orange-500 rounded-full blur-[150px] mix-blend-screen" />
            </div>

            {/* Header Skeleton */}
            <div className="relative z-10 flex justify-between items-center mb-10 border-b border-zinc-800 pb-8">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-zinc-900 rounded-xl animate-pulse"></div>
                    <div>
                        <div className="w-48 h-8 bg-zinc-900 rounded-md animate-pulse mb-2"></div>
                        <div className="w-32 h-4 bg-zinc-900/50 rounded-md animate-pulse"></div>
                    </div>
                </div>
                <div className="w-48 h-10 bg-zinc-900 rounded-full animate-pulse hidden md:block border border-zinc-800"></div>
            </div>

            {/* KPIs Skeleton */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-6 rounded-2xl h-32 animate-pulse flex flex-col justify-between">
                        <div className="flex justify-between">
                            <div className="w-10 h-10 bg-zinc-900 rounded-xl"></div>
                            <div className="w-16 h-5 bg-zinc-900 rounded-md"></div>
                        </div>
                        <div className="w-24 h-8 bg-zinc-900 rounded-md"></div>
                    </div>
                ))}
            </div>

            {/* Charts Skeleton Masonry */}
            <div className="relative z-10 columns-1 xl:columns-2 gap-8">
                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl h-80 animate-pulse mb-8 break-inside-avoid"></div>
                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl h-96 animate-pulse mb-8 break-inside-avoid"></div>
                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl h-[400px] animate-pulse mb-8 break-inside-avoid"></div>
                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl h-72 animate-pulse mb-8 break-inside-avoid"></div>
            </div>
        </div>
    );

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
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }} interval={0} angle={-45} textAnchor="end" axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--input-bg)' }} />
                            <Bar dataKey="revenue" name="Rendimento" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="cost" name="Custo Mensal" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );
                break;
            case 'inventoryByStudio':
                if (drillDownStudio) {
                    title = "Modelos: " + drillDownStudio + " (Séries)";
                    const studioData = data.charts.inventoryByStudio.find((s: any) => s.name === drillDownStudio);

                    if (!studioData || !studioData.series) {
                        ChartComponent = (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] animate-in fade-in duration-500">
                                <Box size={64} className="mb-6 opacity-20" />
                                <p className="font-black uppercase tracking-widest text-xs">Nenhuma série encontrada para "{drillDownStudio}"</p>
                            </div>
                        );
                    } else {
                        chartData = Object.entries(studioData.series)
                            .map(([name, value]: any) => ({ name, value }))
                            .sort((a: any, b: any) => b.value - a.value);

                        ChartComponent = (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--input-bg)' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
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
                        <div className="w-full h-full flex flex-col pt-4">
                            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-6 text-center bg-[var(--input-bg)] py-2 rounded-full w-fit mx-auto px-6 border border-[var(--card-border)]">Clique em uma barra para ver as séries</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ left: 0, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }} interval={0} angle={-45} textAnchor="end" axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--input-bg)' }} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} onClick={(data) => setDrillDownStudio(data?.name || null)} className="cursor-pointer">
                                        {chartData.map((_e: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill="#a855f7"
                                                className="hover:opacity-80 transition-all cursor-pointer"
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
                    chartData = (data.charts.salesBySeries || [])
                        .map((s: any) => ({
                            name: s.name,
                            value: s.studios?.[drillDownStudio] || 0
                        }))
                        .filter((s: any) => s.value > 0)
                        .sort((a: any, b: any) => b.value - a.value);

                    if (chartData.length === 0) {
                        ChartComponent = (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] animate-in fade-in duration-500">
                                <Box size={64} className="mb-6 opacity-20" />
                                <p className="font-black uppercase tracking-widest text-xs">Nenhuma venda encontrada para "{drillDownStudio}"</p>
                            </div>
                        );
                    } else {
                        ChartComponent = (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--input-bg)' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
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
                        <div className="w-full h-full flex flex-col pt-4">
                            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-6 text-center bg-[var(--input-bg)] py-2 rounded-full w-fit mx-auto px-6 border border-[var(--card-border)]">Clique em uma barra para ver as séries</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--input-bg)' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} onClick={(data) => setDrillDownStudio(data?.name || null)} className="cursor-pointer">
                                        {chartData.map((_e: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill="#3b82f6"
                                                className="hover:opacity-80 transition-all cursor-pointer"
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

            case 'salesByCategory':
                if (drillDownCategory) {
                    title = "Vendas: " + drillDownCategory;
                    chartData = (data.charts.salesBySeries || [])
                        .filter((s: any) => s.category === drillDownCategory)
                        .slice(0, 15);

                    if (!chartData || chartData.length === 0) {
                        ChartComponent = (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] animate-in fade-in duration-500">
                                <Box size={64} className="mb-6 opacity-20" />
                                <p className="font-black uppercase tracking-widest text-xs">Nenhuma venda de série para esta categoria.</p>
                            </div>
                        );
                    } else {
                        ChartComponent = (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--input-bg)' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
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
                        <div className="w-full h-full flex justify-center flex-col items-center pt-4">
                            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-6 text-center bg-[var(--input-bg)] py-2 rounded-full w-fit mx-auto px-6 border border-[var(--card-border)]">Clique em uma fatia para ver detalhes</p>
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
                                    >
                                        {chartData.map((entry: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#6366f1'][index % 6]}
                                                className="hover:opacity-80 transition-all cursor-pointer outline-none"
                                                onClick={() => setDrillDownCategory(entry.name)}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CategoryTooltip suffix="vendas" />} />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    );
                }
                break;
            case 'avgPriceByStudio':
                chartData = data.charts.avgPriceByStudio || [];

                if (!chartData || chartData.length === 0) {
                    ChartComponent = (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] animate-in fade-in duration-500">
                            <Box size={64} className="mb-6 opacity-20" />
                            <p className="font-black uppercase tracking-widest text-xs">Sem dados para exibir.</p>
                        </div>
                    );
                } else {
                    title = "Ticket Médio por Estúdio (Ranking Completo)";
                    const dynamicHeight = Math.max(600, chartData.length * 40);
                    ChartComponent = (
                        <div className="h-full w-full overflow-hidden flex flex-col pt-4">
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                                <div style={{ height: dynamicHeight, width: '100%', minHeight: '100%' }}>
                                    <ResponsiveContainer width="99%" height="100%">
                                        <BarChart
                                            data={chartData}
                                            layout="vertical"
                                            margin={{ left: 20, right: 30, top: 20, bottom: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                                            <XAxis type="number" tickFormatter={(v) => `R$ ${v}`} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                            <YAxis dataKey="name" type="category" width={160} tick={{ fill: 'var(--foreground)', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ fill: 'var(--input-bg)' }}
                                                content={<CategoryTooltip suffix="" formatter={(v: number, _name: any, item: any) => `R$ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${item?.payload?.count || 0} modelos)`} />}
                                            />
                                            <Bar dataKey="value" name="Ticket Médio" fill="#a855f7" radius={[0, 6, 6, 0]} barSize={24}>
                                                {chartData.map((_e: any, index: number) => <Cell key={index} fill="#a855f7" />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    );
                }
                break;
            case 'revenueVsCost': // Fallback or duplicate case? renamed to costByStudio based on usage
                chartData = data.charts.costByStudio || [];
                title = "Custo Mensal por Estúdio (Top 20)";
                ChartComponent = (
                    <div className="w-full h-full flex flex-col">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.slice(0, 20)} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }} interval={0} angle={-45} textAnchor="end" axisLine={false} tickLine={false} />
                                <YAxis stroke="#ef4444" tickFormatter={(value) => `R$${value}`} tick={{ fill: '#ef4444', fontWeight: 700 }} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--input-bg)' }} />
                                <Bar dataKey="value" name="Custo Mensal" fill="#ef4444" radius={[6, 6, 0, 0]} />
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
                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] animate-in fade-in duration-500">
                                <Box size={64} className="mb-6 opacity-20" />
                                <p className="font-black uppercase tracking-widest text-xs">Nenhum estúdio encontrado para "{drillDownSeries}"</p>
                            </div>
                        );
                    } else {
                        chartData = Object.entries(seriesData.studios)
                            .map(([name, value]: any) => ({ name, value }))
                            .sort((a: any, b: any) => b.value - a.value);

                        ChartComponent = (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--input-bg)' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
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

                    title = "Séries em Estoque";

                    const categoryMap = new Map();
                    categoryMap.set('all', { name: 'Todas', id: 0 });

                    allData.forEach((d: any) => {
                        if (!categoryMap.has(d.category)) {
                            categoryMap.set(d.category, { name: d.category, id: d.categoryId || 999 });
                        }
                    });

                    const categories = Array.from(categoryMap.values()).sort((a: any, b: any) => a.id - b.id);

                    ChartComponent = (
                        <div className="w-full h-full flex flex-col">
                            <div className="flex flex-wrap gap-2 mb-8 justify-center">
                                {categories.map((cat: any) => (
                                    <button
                                        key={cat.name}
                                        onClick={() => setSeriesFilter(cat.name === 'Todas' ? 'all' : cat.name)}
                                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all border shadow-sm active:scale-95 ${(seriesFilter === 'all' && cat.name === 'Todas') || seriesFilter === cat.name
                                            ? 'bg-orange-600 text-white border-orange-500 shadow-orange-500/20'
                                            : 'bg-[var(--input-bg)] text-[var(--text-muted)] border-[var(--card-border)] hover:border-orange-500'
                                            }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-6 text-center bg-[var(--input-bg)] py-2 rounded-full w-fit mx-auto px-6 border border-[var(--card-border)]">Clique na barra para ver os estúdios</p>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--input-bg)' }} />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]} onClick={(data) => setDrillDownSeries(data?.name || null)} className="cursor-pointer">
                                            {chartData.map((_e: any, index: number) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill="#a855f7"
                                                    className="hover:opacity-80 transition-all cursor-pointer"
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
                        <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--input-bg)' }} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
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
                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] animate-in fade-in duration-500">
                                <Box size={64} className="mb-6 opacity-20" />
                                <p className="font-black uppercase tracking-widest text-xs">Nenhum modelo nesta faixa.</p>
                            </div>
                        );
                    } else {
                        ChartComponent = (
                            <div className="w-full h-full overflow-auto pr-2 custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[10px] font-black uppercase tracking-widest bg-[var(--input-bg)] text-[var(--text-muted)] sticky top-0 backdrop-blur-md border-b border-[var(--card-border)]">
                                        <tr>
                                            <th className="px-6 py-4">ID</th>
                                            <th className="px-6 py-4">Modelo (Clique p/ ver)</th>
                                            <th className="px-6 py-4 text-right">Preço</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--card-border)]">
                                        {bucketData.figures.map((f: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-[var(--input-bg)] transition-colors group">
                                                <td className="px-6 py-4 text-[var(--text-muted)] font-black text-xs">#{f.id}</td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => {
                                                            if (f.image_url) {
                                                                setPreviewImage({ url: f.image_url, nome: f.name });
                                                            } else {
                                                                toast.info('Sem imagem cadastrada');
                                                            }
                                                        }}
                                                        className={`flex items-center gap-3 font-black text-[var(--foreground)] tracking-tight hover:text-orange-500 transition-colors text-left ${!f.image_url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {f.name}
                                                        {f.image_url && <ExternalLink size={14} className="text-[var(--text-muted)] group-hover:text-orange-500 transition-colors" />}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right text-emerald-500 font-black text-base tracking-tighter">
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
                    title = "Distribuição de Preço";
                    ChartComponent = (
                        <div className="w-full h-full flex flex-col pt-4">
                            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-6 text-center bg-[var(--input-bg)] py-2 rounded-full w-fit mx-auto px-6 border border-[var(--card-border)]">Clique na barra para ver os modelos que se encaixam nesta faixa</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ left: 0, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }} interval={0} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip content={<CategoryTooltip suffix="figuras" />} cursor={{ fill: 'var(--input-bg)' }} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} onClick={(data) => setDrillDownPriceBucket(data?.name || null)} className="cursor-pointer">
                                        {chartData.map((_e: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill="#3b82f6"
                                                className="hover:opacity-80 transition-all cursor-pointer"
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
            case 'salesBySeller':
                if (drillDownSeller) {
                    title = "Vendas de: " + drillDownSeller;
                    const sellerData = (data.charts.salesBySeller || []).find((s: any) => s.name === drillDownSeller);

                    if (!sellerData || !sellerData.figures || sellerData.figures.length === 0) {
                        ChartComponent = (
                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] animate-in fade-in duration-500">
                                <Box size={64} className="mb-6 opacity-20" />
                                <p className="font-black uppercase tracking-widest text-xs">Nenhum modelo vendido por este vendedor.</p>
                            </div>
                        );
                    } else {
                        ChartComponent = (
                            <div className="w-full h-full overflow-auto pr-2 custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[10px] font-black uppercase tracking-widest bg-[var(--input-bg)] text-[var(--text-muted)] sticky top-0 backdrop-blur-md border-b border-[var(--card-border)]">
                                        <tr>
                                            <th className="px-6 py-4">ID</th>
                                            <th className="px-6 py-4">Modelo (Clique p/ ver)</th>
                                            <th className="px-6 py-4">Data Venda</th>
                                            <th className="px-6 py-4 text-right">Preço</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--card-border)]">
                                        {sellerData.figures.map((f: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-[var(--input-bg)] transition-colors group">
                                                <td className="px-6 py-4 text-[var(--text-muted)] font-black text-xs">#{f.id}</td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => {
                                                            if (f.image_url) {
                                                                setPreviewImage({ url: f.image_url, nome: f.name });
                                                            } else {
                                                                toast.info('Sem imagem cadastrada');
                                                            }
                                                        }}
                                                        className={`flex items-center gap-3 font-black text-[var(--foreground)] tracking-tight hover:text-orange-500 transition-colors text-left ${!f.image_url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {f.name}
                                                        {f.image_url && <ExternalLink size={14} className="text-[var(--text-muted)] group-hover:text-orange-500 transition-colors" />}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-[var(--text-muted)] font-medium">
                                                    {new Date(f.date).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-6 py-4 text-right text-emerald-500 font-black text-base tracking-tighter">
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
                    chartData = data.charts.salesBySeller || [];
                    title = "Vendas por Vendedor";
                    ChartComponent = (
                        <div className="w-full h-full flex flex-col pt-4">
                            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-6 text-center bg-[var(--input-bg)] py-2 rounded-full w-fit mx-auto px-6 border border-[var(--card-border)]">Clique na barra para ver os detalhes da venda</p>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ left: 0, bottom: 40 }} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CategoryTooltip suffix="" formatter={(v: number, name: string, payload: any) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | ${(payload?.payload?.qty || 0)} unid.`} />} cursor={{ fill: 'var(--input-bg)' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} onClick={(data) => setDrillDownSeller(data?.name || null)} className="cursor-pointer">
                                        {chartData.map((_e: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill="#10b981"
                                                className="hover:opacity-80 transition-all cursor-pointer"
                                                onClick={() => setDrillDownSeller(_e.name || null)}
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
        const isVertical = expandedChart === 'revenueByStudio' || expandedChart === 'soldByStudio' || expandedChart === 'salesBySeries' || (expandedChart === 'salesByCategory' && drillDownCategory) || (expandedChart === 'revenueByStudio' && drillDownStudio) || (expandedChart === 'inventoryByStudio' && drillDownStudio) || (expandedChart === 'inventoryBySeries') || expandedChart === 'salesBySeller';
        const dynamicStyle = isVertical
            ? { height: `${Math.max(500, chartData.length * itemHeight)}px`, width: '100%' }
            : { width: `${Math.max(1000, chartData.length * itemWidth)}px`, height: '100%' };

        // Special case for Pie (only when NOT drilling down)
        if (expandedChart === 'salesByCategory' && !drillDownCategory) {
            dynamicStyle.height = '100%';
            dynamicStyle.width = '100%';
        }

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-500" onClick={() => { setExpandedChart(null); setDrillDownCategory(null); setDrillDownStudio(null); setDrillDownSeries(null); setDrillDownPriceBucket(null); setDrillDownSeller(null); }}>
                <div className="bg-zinc-950/90 border border-zinc-800 rounded-3xl w-full max-w-6xl h-[85vh] flex flex-col shadow-[0_0_80px_-15px_rgba(16,185,129,0.15)] overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="px-8 py-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-950">
                        <div className="flex items-center gap-6">
                            {(drillDownCategory || drillDownStudio || drillDownSeries || drillDownPriceBucket) && (
                                <button
                                    onClick={() => {
                                        if (drillDownCategory) setDrillDownCategory(null);
                                        if (drillDownStudio) setDrillDownStudio(null);
                                        if (drillDownSeries) setDrillDownSeries(null);
                                        if (drillDownPriceBucket) setDrillDownPriceBucket(null);
                                        if (drillDownSeller) setDrillDownSeller(null);
                                    }}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-400 bg-zinc-900 hover:border-emerald-500 px-4 py-2 rounded-xl transition-all border border-zinc-800 shadow-xl active:scale-95"
                                >
                                    ← Voltar
                                </button>
                            )}
                            <h2 className="text-2xl font-black flex items-center gap-4 text-zinc-100 tracking-tight">
                                <TrendingUp size={28} className="text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                {title}
                            </h2>
                        </div>
                        <button onClick={() => { setExpandedChart(null); setDrillDownCategory(null); setDrillDownStudio(null); setDrillDownSeries(null); setDrillDownPriceBucket(null); setDrillDownSeller(null); }} className="p-3 bg-zinc-900 border border-zinc-800 hover:border-emerald-500 rounded-full transition-all text-zinc-500 hover:text-emerald-400 shadow-xl active:scale-90 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto p-8 custom-scrollbar">
                        <div style={dynamicStyle} className={isVertical || expandedChart === 'salesByCategory' ? "w-full" : "h-full"}>
                            {ChartComponent}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-black text-white pb-12 transition-colors duration-300 relative overflow-hidden">
            {/* Background SciFi Blobs */}
            <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500 rounded-full blur-[150px] mix-blend-screen" />
                <div className="absolute top-[40%] right-[-10%] w-[30%] h-[30%] bg-orange-500 rounded-full blur-[150px] mix-blend-screen" />
            </div>

            <div className="relative z-10 px-4 sm:px-8 mt-8 max-w-[1920px] mx-auto">
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 border-b border-zinc-900 pb-8 gap-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-5">
                            <Link href="/" className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 hover:border-emerald-500 hover:text-emerald-400 p-3 rounded-xl transition-all shadow-lg group" title="Ir para Home">
                                <Store size={22} className="text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                            </Link>
                            <div>
                                <h1 className="text-4xl font-black tracking-tighter text-zinc-100 flex items-center gap-3">
                                    Sala de Comando <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse"></span>
                                </h1>
                                <p className="text-zinc-500 font-medium font-mono text-xs uppercase tracking-widest mt-1">Visão estratégica e operacional</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-end md:items-center w-full xl:w-auto">
                        <button
                            onClick={() => setHideValues(prev => !prev)}
                            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-zinc-400 hover:text-emerald-400 px-5 py-2.5 rounded-2xl transition-all shadow-xl active:scale-95"
                            title={hideValues ? "Mostrar valores" : "Modo Print (Ocultar valores)"}
                        >
                            {hideValues ? <Eye size={18} className="text-emerald-400" /> : <EyeOff size={18} />}
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {hideValues ? "Mostrar Valores" : "Modo Print"}
                            </span>
                        </button>

                        <Link 
                            href="/api/admin/reports/executive" 
                            target="_blank"
                            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-zinc-400 hover:text-emerald-400 px-5 py-2.5 rounded-2xl transition-all shadow-xl active:scale-95 group group"
                            title="Gerar Ficha Executiva A4"
                        >
                            <Printer size={18} className="group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Relatório Executivo</span>
                        </Link>

                        <div className="flex items-center gap-2 bg-zinc-900/60 backdrop-blur-xl p-2 rounded-full border border-zinc-800 shadow-xl">
                            <select
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="bg-transparent text-sm font-bold outline-none text-zinc-300 hover:text-emerald-400 cursor-pointer px-4 appearance-none rounded-full transition-colors"
                            >
                                {Array.from({ length: new Date().getFullYear() - 2024 + 1 }, (_, i) => 2024 + i).map(y => (
                                    <option key={y} value={y} className="bg-zinc-900 text-zinc-100 font-bold">{y}</option>
                                ))}
                            </select>
                            <div className="h-4 w-[1px] bg-zinc-700"></div>
                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="bg-transparent text-sm font-bold outline-none text-zinc-300 hover:text-emerald-400 cursor-pointer px-4 appearance-none rounded-full transition-colors"
                            >
                                <option value="" className="bg-zinc-900 text-zinc-100 font-bold">Ano Completo</option>
                                {months.map(m => (
                                    <option key={m.value} value={m.value} className="bg-zinc-900 text-zinc-100 font-bold">{m.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
                    {kpis.map((kpi: any, idx) => {
                        if (kpi.restricted && !canViewFinance) return null;
                        return (
                            <div key={idx} className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-6 rounded-2xl relative overflow-hidden group shadow-2xl hover:border-zinc-700 transition-all duration-500 hover:-translate-y-1">
                                <div className={`absolute -right-4 -top-4 w-28 h-28 rounded-full opacity-10 ${kpi.bg.replace('/10', '')} blur-3xl group-hover:opacity-30 group-hover:scale-150 transition-all duration-700`}></div>

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className={`p-3 rounded-xl shadow-lg border border-white/5 ${kpi.bg}`}>
                                        <kpi.icon className={kpi.color} size={22} />
                                    </div>
                                    {renderTrend(kpi.trend, kpi.subtext, kpi.comparisonLabel)}
                                </div>

                                <div className="relative z-10">
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5">{kpi.title}</p>
                                    <p className="text-3xl font-black text-zinc-100 tracking-tighter">
                                        {loading ? (
                                            <span className="w-16 h-8 bg-zinc-800 animate-pulse rounded block"></span>
                                        ) : (kpi.restricted && hideValues ? "R$ ••••" : kpi.value)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ROW 1: PRODUCTION MONITOR (RESIN) - PRIORITIZED AT TOP */}
                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl relative group shadow-xl hover:border-zinc-700 transition-all mb-8">
                    <div className="flex justify-between items-start mb-8">
                        <h2 className="text-xl font-black flex items-center gap-3 text-zinc-100 tracking-tight">
                            <Droplet size={22} className="text-cyan-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                            Monitor de Produção (Saldo de Insumos)
                        </h2>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-800">
                            Status Operacional
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Estoque de Resina</p>
                            <p className="text-4xl font-black text-zinc-100 tracking-tighter">
                                {loading ? '...' : (Number(data?.kpis?.resinStock) || 0).toFixed(2)} <span className="text-lg text-zinc-500 font-mono">kg</span>
                            </p>
                        </div>
                        
                        <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Demanda Pendente</p>
                            <p className="text-4xl font-black text-white/40 tracking-tighter">
                                {loading ? '...' : (Number(data?.kpis?.resinRequired) || 0).toFixed(2)} <span className="text-lg text-zinc-600 font-mono">kg</span>
                            </p>
                        </div>

                        <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                            ((Number(data?.kpis?.resinStock) || 0) - (Number(data?.kpis?.resinRequired) || 0)) > 2 
                            ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)]' 
                            : ((Number(data?.kpis?.resinStock) || 0) - (Number(data?.kpis?.resinRequired) || 0)) > 0 
                            ? 'bg-orange-500/5 border-orange-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]' 
                            : 'bg-red-500/5 border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)] animate-pulse'
                        }`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Saldo Projetado</p>
                            <p className={`text-4xl font-black tracking-tighter ${
                                ((Number(data?.kpis?.resinStock) || 0) - (Number(data?.kpis?.resinRequired) || 0)) > 2 
                                ? 'text-emerald-500' 
                                : ((Number(data?.kpis?.resinStock) || 0) - (Number(data?.kpis?.resinRequired) || 0)) > 0 
                                ? 'text-orange-500' 
                                : 'text-red-500'
                            }`}>
                                {loading ? '...' : ((Number(data?.kpis?.resinStock) || 0) - (Number(data?.kpis?.resinRequired) || 0)).toFixed(2)} <span className="text-lg opacity-50 font-mono">kg</span>
                            </p>
                            <p className={`text-[9px] font-black mt-3 px-3 py-1 rounded-full uppercase border ${
                                ((Number(data?.kpis?.resinStock) || 0) - (Number(data?.kpis?.resinRequired) || 0)) > 2 
                                ? 'text-emerald-500 border-emerald-500/30' 
                                : ((Number(data?.kpis?.resinStock) || 0) - (Number(data?.kpis?.resinRequired) || 0)) > 0 
                                ? 'text-orange-500 border-orange-500/30' 
                                : 'text-red-500 border-red-500/30'
                            }`}>
                                {((Number(data?.kpis?.resinStock) || 0) - (Number(data?.kpis?.resinRequired) || 0)) <= 0 ? '⚠️ Comprar Agora' : 'Em Dia'}
                            </p>
                        </div>
                    </div>
                </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                {/* Left Column: Lists */}
                <div className="flex flex-col gap-8">
                    <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden shadow-xl hover:border-zinc-700 transition-all">
                        <div className="p-5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/30">
                            <h3 className="font-black flex items-center gap-2 text-zinc-100 uppercase tracking-widest text-sm">
                                <Package size={18} className="text-yellow-500" />
                                Top Modelos (Receita)
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase bg-zinc-900/50 text-zinc-500 font-black tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Modelo</th>
                                        <th className="px-6 py-4">Estúdio</th>
                                        <th className="px-6 py-4 text-right">Qtd</th>
                                        {canViewFinance && <th className="px-6 py-4 text-right">Receita</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {data?.lists?.topProducts?.length > 0 ? (
                                        data.lists.topProducts.map((p: any, i: number) => (
                                            <tr key={i} className="hover:bg-zinc-800/40 transition-colors group">
                                                <td className="px-6 py-4 font-bold text-zinc-300 group-hover:text-emerald-400 transition-colors">{p.name}</td>
                                                <td className="px-6 py-4 text-zinc-500 font-bold">{p.studio}</td>
                                                <td className="px-6 py-4 text-right text-zinc-100 font-black">{p.qty}</td>
                                                {canViewFinance && (
                                                    <td className="px-6 py-4 text-right font-black text-emerald-500 font-mono tracking-tighter">
                                                        {hideValues ? "R$ ••••" : `R$ ${p.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                                    </td>
                                                 )}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={canViewFinance ? 4 : 3} className="px-6 py-10 text-center text-zinc-600 font-bold">
                                                Nenhum dado encontrado no período.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden shadow-xl hover:border-zinc-700 transition-all">
                        <div className="p-5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/30">
                            <h3 className="font-black flex items-center gap-2 text-zinc-100 uppercase tracking-widest text-sm">
                                <Users size={18} className="text-emerald-500" />
                                Clientes VIP (Ranking)
                            </h3>
                            <button
                                onClick={() => setHideValues(prev => !prev)}
                                className="flex items-center gap-1.5 px-3.5 py-2 text-[9px] font-black uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all text-zinc-400 hover:text-white active:scale-95 shadow-sm"
                                title={hideValues ? "Mostrar valores" : "Modo Print (Ocultar valores)"}
                            >
                                {hideValues ? <Eye size={12} className="text-emerald-400" /> : <EyeOff size={12} />}
                                <span>{hideValues ? "Mostrar Valores" : "Modo Print"}</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase bg-zinc-900/50 text-zinc-500 font-black tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4 w-16 text-center">Pos</th>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4 text-right">Pedidos</th>
                                        <th className="px-6 py-4 text-right">Total Investido</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {data?.lists?.topCustomers?.length > 0 ? (
                                        data.lists.topCustomers.map((c: any, i: number) => (
                                            <tr key={i} className="hover:bg-zinc-800/40 transition-colors group">
                                                <td className="px-6 py-4 text-center font-black">
                                                     {i === 0 ? <span className="text-lg">🥇</span> :
                                                      i === 1 ? <span className="text-lg">🥈</span> :
                                                      i === 2 ? <span className="text-lg">🥉</span> :
                                                      <span className="text-xs text-zinc-500 font-mono">#{i + 1}</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 flex items-center justify-center font-black uppercase tracking-wider shrink-0 shadow-inner group-hover:border-emerald-500/30 group-hover:text-emerald-400 transition-all duration-300">
                                                            {getInitials(c.name)}
                                                        </div>
                                                        <span className="font-bold text-zinc-300 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{c.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right text-zinc-500 font-bold">{c.count}</td>
                                                <td className="px-6 py-4 text-right font-black text-emerald-500 font-mono tracking-tighter">
                                                    {hideValues ? "R$ ••••" : `R$ ${c.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                                </td>
                                            </tr>
                                         ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-zinc-600 font-bold">
                                                Dados insuficientes.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 rounded-2xl overflow-hidden shadow-xl hover:border-zinc-700 transition-all">
                        <div className="p-5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/30">
                            <h3 className="font-black flex items-center gap-2 text-zinc-100 uppercase tracking-widest text-sm">
                                <Clock size={18} className="text-blue-500" />
                                Vendas Recentes
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase bg-zinc-900/50 text-zinc-500 font-black tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Modelo</th>
                                        {canViewFinance && <th className="px-6 py-4 text-right">Valor</th>}
                                        <th className="px-6 py-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {data?.lists?.recentActivity?.length > 0 ? (
                                        data.lists.recentActivity.map((a: any, i: number) => (
                                            <tr key={i} className="hover:bg-zinc-800/40 transition-colors group">
                                                <td className="px-6 py-4 text-zinc-400 whitespace-nowrap font-mono text-xs">
                                                    {new Date(a.date).toLocaleDateString('pt-BR')} <span className="opacity-50 ml-1">{new Date(a.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-zinc-200 truncate max-w-[200px] group-hover:text-blue-400 transition-colors tracking-tight">{a.product}</td>
                                                {canViewFinance && (
                                                    <td className="px-6 py-4 text-right font-black text-emerald-500 font-mono tracking-tighter">
                                                        {hideValues ? "R$ ••••" : `R$ ${a.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${a.status === 'Concluída' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' :
                                                        a.status === 'Cancelada' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]'
                                                        }`}>
                                                        {a.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={canViewFinance ? 4 : 3} className="px-6 py-10 text-center text-zinc-600 font-bold">
                                                Nenhuma atividade recente.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div> {/* End Left Column */}

                {/* --- Vendas por Vendedor (Right Column) --- */}
                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl relative group shadow-xl hover:border-zinc-700 transition-all h-full flex flex-col">
                    <div className="flex justify-between items-start mb-8">
                        <h2 className="text-xl font-black flex items-center gap-3 text-zinc-100 tracking-tight">
                            <Users size={22} className="text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            Vendas por Vendedor
                        </h2>
                        <button onClick={() => setExpandedChart('salesBySeller')} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] text-zinc-500 hover:text-emerald-400" title="Expandir">
                            <Maximize2 size={18} />
                        </button>
                    </div>
                    <div className="flex-1 w-full min-h-[600px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts?.salesBySeller?.slice(0, 10) || []} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="1 10" stroke="var(--card-border)" strokeOpacity={0.15} horizontal={false} vertical={true} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{ fill: '#71717a', fontSize: 11, fontWeight: 700 }} width={120} axisLine={false} tickLine={false} />
                                <Tooltip content={<CategoryTooltip suffix="" formatter={(v: number, name: string, payload: any) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | ${(payload?.payload?.qty || 0)} unid.`} />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {(data?.charts?.salesBySeller?.slice(0, 10) || []).map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#10b981" />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* ROW 3: FINANCIAL ANALYTICS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl relative group shadow-xl hover:border-zinc-700 transition-all">
                    <div className="flex justify-between items-start mb-8">
                        <h2 className="text-xl font-black flex items-center gap-3 text-zinc-100 tracking-tight">
                            <Activity size={22} className="text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            Rendimento vs Custo
                        </h2>
                        <button onClick={() => setExpandedChart('revenueVsCost')} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] text-zinc-500 hover:text-emerald-400 shadow-sm" title="Expandir">
                            <Maximize2 size={18} />
                        </button>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts.revenueVsCost.slice(0, 10)} margin={{ left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="1 10" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 800 }} interval={0} angle={-45} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', borderColor: '#27272a', borderRadius: '12px', color: '#f4f4f5', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(12px)' }}
                                    itemStyle={{ fontWeight: 800 }}
                                    formatter={(value: any) => `R$ ${(value || 0).toLocaleString('pt-BR')}`}
                                />
                                <Bar dataKey="revenue" name="Rendimento" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="cost" name="Custo Mensal" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl relative group shadow-xl hover:border-zinc-700 transition-all">
                    <div className="flex justify-between items-start mb-8">
                        <h2 className="text-xl font-black flex items-center gap-3 text-zinc-100 tracking-tight">
                            <DollarSign size={22} className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            Faturamento / Estúdio
                        </h2>
                        <button onClick={() => setExpandedChart('revenueByStudio')} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] text-zinc-500 hover:text-blue-400 shadow-sm" title="Expandir">
                            <Maximize2 size={18} />
                        </button>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts.revenueByStudio.slice(0, 8)} margin={{ left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="1 10" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 800 }} interval={0} angle={-45} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip content={<CategoryTooltip suffix="" formatter={(v: number) => `R$ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {data?.charts.revenueByStudio.slice(0, 8).map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#3b82f6" />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ROW 4: CATALOG ANALYTICS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl relative group shadow-xl hover:border-zinc-700 transition-all">
                    <div className="flex justify-between items-start mb-8">
                        <h2 className="text-xl font-black flex items-center gap-3 text-zinc-100 tracking-tight">
                            <Layers size={22} className="text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]" />
                            Modelos por Série
                        </h2>
                        <button onClick={() => setExpandedChart('inventoryBySeries')} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:border-purple-400 hover:shadow-[0_0_15px_rgba(192,132,252,0.2)] text-zinc-500 hover:text-purple-300 shadow-sm" title="Expandir">
                            <Maximize2 size={18} />
                        </button>
                    </div>
                    <div className="h-[320px] w-full flex justify-center text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={(data?.charts.inventoryBySeries || []).slice(0, 5)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={10}
                                    dataKey="value"
                                    stroke="rgba(0,0,0,0.5)"
                                    strokeWidth={6}
                                >
                                    {(data?.charts.inventoryBySeries || []).slice(0, 5).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#a855f7'][index % 5]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CategoryTooltip suffix="figuras" />} />
                                <Legend iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl relative group shadow-xl hover:border-zinc-700 transition-all">
                    <div className="flex justify-between items-start mb-8">
                        <h2 className="text-xl font-black flex items-center gap-3 text-zinc-100 tracking-tight">
                            <Layers size={22} className="text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
                            Vendas por Série
                        </h2>
                        <button onClick={() => setExpandedChart('salesBySeries')} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:border-pink-500 hover:shadow-[0_0_15px_rgba(236,72,153,0.2)] text-zinc-500 hover:text-pink-400 shadow-sm" title="Expandir">
                            <Maximize2 size={18} />
                        </button>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={(data?.charts?.salesBySeries || []).slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="1 10" stroke="rgba(255,255,255,0.05)" horizontal={false} vertical={true} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{ fill: '#71717a', fontSize: 11, fontWeight: 800 }} width={110} axisLine={false} tickLine={false} />
                                <Tooltip content={<CategoryTooltip suffix="vendas" />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {(data?.charts?.salesBySeries || []).slice(0, 10).map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#ec4899" />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>



            <div className="flex items-center justify-between mt-12 mb-6 border-t border-zinc-900 pt-16">
                <h2 className="text-2xl font-black flex items-center gap-3 text-zinc-100 tracking-tight">
                    <DollarSign className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" size={24} />
                    Analytics de Preço
                    <span className="text-xs font-bold text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full uppercase tracking-widest ml-2 border border-zinc-800">Laboratório</span>
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="flex flex-col gap-4">
                    <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl flex flex-col justify-center items-center flex-1 shadow-2xl hover:border-zinc-700 transition-all group overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.8)]"></div>
                        <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">Potencial (Premium)</h3>
                        <p className="text-4xl font-black text-zinc-100 tracking-tighter">
                            {data?.charts.totalPortfolioValue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                        </p>
                    </div>

                    <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl flex flex-col justify-center items-center flex-1 shadow-2xl hover:border-zinc-700 transition-all group overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-zinc-700 opacity-20"></div>
                        <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">Potencial (Básico)</h3>
                        <p className="text-3xl font-black text-zinc-400 tracking-tighter mix-blend-plus-lighter">
                            {data?.charts.totalPortfolioBasic?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                        </p>
                    </div>
                </div>

                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl relative group shadow-xl hover:border-zinc-700 transition-all">
                    <div className="flex justify-between items-start mb-8">
                        <h2 className="text-xl font-black flex items-center gap-3 text-zinc-100 tracking-tight">
                            <Tag size={22} className="text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                            Ticket Médio por Estúdio
                        </h2>
                        <button onClick={() => setExpandedChart('avgPriceByStudio')} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:border-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] text-zinc-500 hover:text-purple-400 shadow-sm" title="Expandir">
                            <Maximize2 size={18} />
                        </button>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts.avgPriceByStudio?.slice(0, 10) || []} margin={{ left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="1 10" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 800 }} interval={0} angle={-45} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip content={<CategoryTooltip suffix="" formatter={(v: number) => `R$ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {(data?.charts.avgPriceByStudio || []).slice(0, 10).map((_e: any, index: number) => <Cell key={`cell-${index}`} fill="#a855f7" />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-2xl relative group shadow-xl hover:border-zinc-700 transition-all">
                    <div className="flex justify-between items-start mb-8">
                        <h2 className="text-xl font-black flex items-center gap-3 text-zinc-100 tracking-tight">
                            <Layers size={22} className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            Distribuição de Preço
                        </h2>
                        <button onClick={() => setExpandedChart('priceDistribution')} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] text-zinc-500 hover:text-blue-400 shadow-sm" title="Expandir">
                            <Maximize2 size={18} />
                        </button>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts.priceDistribution || []} margin={{ left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="1 10" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 800 }} interval={0} angle={-45} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip content={<CategoryTooltip suffix="figuras" />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} onClick={(bdata) => { setExpandedChart('priceDistribution'); setDrillDownPriceBucket(bdata?.name || null); }} className="cursor-pointer">
                                    {(data?.charts.priceDistribution || []).map((_e: any, index: number) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill="#3b82f6"
                                            className="hover:opacity-80 transition-opacity cursor-pointer shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                            onClick={() => { setExpandedChart('priceDistribution'); setDrillDownPriceBucket(_e.name || null); }}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            </div> {/* FECHAMENTO DO WRAPPER DE CONTEÚDO (.max-w-[1920px]) */}

            {/* MODAL DE IMAGEM (VIEWER) */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-6 transition-all duration-300"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center animate-in zoom-in-95 duration-500">
                        <button
                            className="absolute -top-12 right-0 text-zinc-500 hover:text-orange-500 z-50 transition-all bg-zinc-900 border border-zinc-800 rounded-full p-3 shadow-2xl active:scale-90"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(null);
                            }}
                        >
                            <X size={28} />
                        </button>

                        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-3 shadow-[0_0_80px_-15px_rgba(16,185,129,0.15)] overflow-hidden">
                            <img
                                src={previewImage.url}
                                alt={previewImage.nome}
                                className="w-auto h-auto max-w-full max-h-[75vh] object-contain rounded-2xl"
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                        <div className="mt-8 bg-zinc-900/50 backdrop-blur-md border border-zinc-800/50 px-8 py-3 rounded-full shadow-2xl">
                            <p className="text-zinc-100 font-black text-xs tracking-widest uppercase">{previewImage.nome}</p>
                        </div>
                    </div>
                </div>
            )}

            {renderExpandedChart()}
        </div>
    );
}
