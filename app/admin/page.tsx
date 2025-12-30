'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Users, Package, Settings, ShoppingCart, TrendingUp, DollarSign, Box, Activity, Store, Maximize2, X } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

export default function AdminDashboard() {
    const { hasRole } = usePermission();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());
    const [month, setMonth] = useState<string>(''); // '' = All months
    const [expandedChart, setExpandedChart] = useState<string | null>(null);

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

    const kpis = [
        {
            title: `Faturamento ${month ? 'Mensal' : 'Anual'}`,
            value: data ? `R$ ${data.kpis.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
            icon: DollarSign,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
            restricted: true
        },
        {
            title: 'Lucro Total',
            value: data ? `R$ ${data.kpis.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
            icon: TrendingUp,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            restricted: true
        },
        {
            title: 'Custo De Estúdios',
            value: data ? `R$ ${data.kpis.totalFixedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
            icon: DollarSign,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            restricted: true
        },
        {
            title: 'Vendas Realizadas',
            value: data ? data.kpis.totalSalesCount : '-',
            icon: ShoppingCart,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            restricted: false
        },
        {
            title: 'Modelos no Catálogo',
            value: data ? data.charts.inventoryByStudio.reduce((acc: number, item: any) => acc + item.value, 0) : '-',
            icon: Box,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
            restricted: false
        }
    ];

    const menuItems = [
        { label: 'Gerenciar Usuários', href: '/admin/users', roles: ['admin'], icon: Users },
        { label: 'Gerenciar Estúdios', href: '/admin/studios', roles: ['admin'], icon: Activity },
        { label: 'Catálogo & Preços', href: '/admin/figures', roles: ['admin', 'pricing'], icon: Package },
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

    if (loading) return <div className="p-12 text-center text-zinc-500">Carregando painel...</div>;

    // Expandable Chart Renderer
    const renderExpandedChart = () => {
        if (!expandedChart || !data) return null;

        // Security check for expanded charts
        if ((expandedChart === 'revenueVsCost' || expandedChart === 'revenueByStudio') && !canViewFinance) {
            return null;
        }

        let chartData: any[] = [];
        let ChartComponent: any = null;
        let title = "";

        switch (expandedChart) {
            case 'revenueVsCost':
                chartData = data.charts.revenueVsCost; // No slice
                title = "Rendimento vs Custo (Todos)";
                ChartComponent = (
                    <BarChart data={chartData} margin={{ left: 0, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: '#9ca3af', fontSize: 10 }}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                        />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                            formatter={(value: number | undefined) => `R$ ${(value || 0).toLocaleString('pt-BR')}`}
                        />
                        <Bar dataKey="revenue" name="Rendimento" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cost" name="Custo Mensal" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                );
                break;
            case 'inventoryByStudio':
                chartData = data.charts.inventoryByStudio; // No slice
                title = "Modelos por Estúdio (Todos)";
                ChartComponent = (
                    <BarChart data={chartData} margin={{ left: 0, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: '#9ca3af', fontSize: 10 }}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                        />
                        <YAxis hide />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill="#a855f7" />
                            ))}
                        </Bar>
                    </BarChart>
                );
                break;
            case 'revenueByStudio':
                chartData = data.charts.revenueByStudio;
                title = "Faturamento Histórico (Todos)";
                ChartComponent = (
                    <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            width={120}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill="#3b82f6" />
                            ))}
                        </Bar>
                    </BarChart>
                );
                break;
            case 'soldByStudio':
                chartData = data.charts.soldByStudio;
                title = "Unidades Vendidas (Todos)";
                ChartComponent = (
                    <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            width={120}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill="#f97316" />
                            ))}
                        </Bar>
                    </BarChart>
                );
                break;
        }

        // Calculate dynamic width based on item count to enable scrolling
        const itemHeight = 40;
        const itemWidth = 60;

        const isVertical = expandedChart === 'revenueByStudio' || expandedChart === 'soldByStudio';
        const dynamicStyle = isVertical
            ? { height: `${Math.max(500, chartData.length * itemHeight)}px`, width: '100%' }
            : { width: `${Math.max(1000, chartData.length * itemWidth)}px`, height: '100%' };


        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setExpandedChart(null)}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-6xl h-[80vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <TrendingUp size={24} className="text-orange-500" />
                            {title}
                        </h2>
                        <button onClick={() => setExpandedChart(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                        <div style={dynamicStyle} className={isVertical ? "w-full" : "h-full"}>
                            <ResponsiveContainer width="100%" height="100%">
                                {ChartComponent}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="text-white min-h-screen pb-12">

            {/* Header com Menu Rápido */}
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

                    {/* Filters */}
                    <div className="flex items-center gap-2 bg-zinc-900 p-1.5 rounded-lg border border-zinc-800">
                        <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="bg-zinc-900 text-sm font-medium outline-none text-zinc-300 hover:text-white cursor-pointer px-2 rounded-md"
                        >
                            <option value="2024" className="bg-zinc-900 text-zinc-200">2024</option>
                            <option value="2025" className="bg-zinc-900 text-zinc-200">2025</option>
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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
                {kpis.map((kpi, idx) => {
                    if (kpi.restricted && !canViewFinance) return null;
                    return (
                        <div key={idx} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
                            <div>
                                <p className="text-zinc-500 text-sm font-medium uppercase tracking-wide">{kpi.title}</p>
                                <p className="text-2xl font-bold mt-1">{loading ? '...' : kpi.value}</p>
                            </div>
                            <div className={`p-3 rounded-full ${kpi.bg}`}>
                                <kpi.icon className={kpi.color} size={24} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* 1. Revenue Vs Cost (ROI) */}
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
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                                        interval={0}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                                        formatter={(value: number | undefined) => `R$ ${(value || 0).toLocaleString('pt-BR')}`}
                                    />
                                    <Bar dataKey="revenue" name="Rendimento" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="cost" name="Custo Mensal" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* 2. Inventário por Estúdio */}
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
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts.inventoryByStudio.slice(0, 15)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                                    interval={0}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {data?.charts.inventoryByStudio.slice(0, 15).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill="#a855f7" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Faturamento por Estúdio */}
                {canViewFinance && (
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl relative group">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <DollarSign size={20} className="text-blue-500" />
                                Faturamento Histórico
                            </h2>
                            <button onClick={() => setExpandedChart('revenueByStudio')} className="p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400 hover:text-white" title="Expandir">
                                <Maximize2 size={16} />
                            </button>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.charts.revenueByStudio.slice(0, 10)} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                                        width={100}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {data?.charts.revenueByStudio.slice(0, 10).map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill="#3b82f6" />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* 4. Vendas (Qtd) por Estúdio */}
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
                            <BarChart data={data?.charts.soldByStudio.slice(0, 10)} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                                    width={100}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {data?.charts.soldByStudio.slice(0, 10).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill="#f97316" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Expanded Chart Modal */}
            {renderExpandedChart()}
        </div>
    );
}
