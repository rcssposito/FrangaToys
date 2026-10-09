'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
    TrendingUp, 
    DollarSign, 
    Box, 
    Award, 
    Loader2, 
    Calendar, 
    Search,
    ChevronDown,
    Activity,
    Target,
    Star,
    Zap,
    Scale,
    AlertTriangle,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import { 
    ResponsiveContainer, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Cell,
    ScatterChart,
    Scatter,
    ZAxis,
    ReferenceLine
} from 'recharts';

interface Studio {
    id: number;
    nome: string;
    custo_mensal: number | '';
    qtd_display: number;
    qualidade: number;
    observacao: string;
    logo_url?: string;
    instagram_handle?: string;
    social_url?: string;
    ativo?: boolean;
    merchant?: boolean;
    total_figuras?: number;
    total_vendas?: number;
    total_itens?: number;
    receita_bruta?: number;
    lucro_liquido?: number;
    figuras_vendidas?: number;
    conversao_acervo?: number;
    margem_lucro?: number;
    ticket_medio?: number;
    total_cliques?: number;
    created_at?: string;
}

type DateRangeType = 'all' | 'year' | 'last12m' | '90days' | '30days' | 'month' | 'custom';

export default function StudiosBI() {
    const [studios, setStudios] = useState<Studio[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRangeType>('year');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDateLimit, setStartDateLimit] = useState<string | null>(null);
    const [endDateLimit, setEndDateLimit] = useState<string | null>(null);
    const [activeStudioName, setActiveStudioName] = useState<string | null>(null);

    const { hasRole } = usePermission();
    const canEdit = hasRole('admin') || hasRole('pricing');

    useEffect(() => {
        if (canEdit) {
            fetchAnalytics();
        }
    }, [canEdit, dateRange, customStartDate, customEndDate]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            let url = '/api/admin/studios?';
            const params = new URLSearchParams();

            const now = new Date();
            let start: Date | null = null;
            let end: Date | null = null;

            if (dateRange === 'year') {
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            } else if (dateRange === 'last12m') {
                start = new Date();
                start.setFullYear(start.getFullYear() - 1);
            } else if (dateRange === '90days') {
                start = new Date();
                start.setDate(start.getDate() - 90);
            } else if (dateRange === '30days') {
                start = new Date();
                start.setDate(start.getDate() - 30);
            } else if (dateRange === 'month') {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
            } else if (dateRange === 'all') {
                // All time
            } else if (dateRange === 'custom') {
                if (customStartDate) start = new Date(customStartDate);
                if (customEndDate) {
                    end = new Date(customEndDate);
                    end.setHours(23, 59, 59, 999);
                }
            }

            if (start) {
                params.set('startDate', start.toISOString());
                setStartDateLimit(start.toISOString());
            } else {
                setStartDateLimit(null);
            }

            if (end) {
                params.set('endDate', end.toISOString());
                setEndDateLimit(end.toISOString());
            } else {
                setEndDateLimit(null);
            }

            url += params.toString();

            const res = await fetch(url);
            if (!res.ok) throw new Error('Falha ao carregar análise de estúdios');
            const data = await res.json();
            setStudios(data);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Erro ao carregar dados do BI');
        } finally {
            setLoading(false);
        }
    };

    // Totais Consolidados
    const totalRevenue = studios.reduce((acc, s) => acc + (s.receita_bruta || 0), 0);
    const totalProfit = studios.reduce((acc, s) => acc + (s.lucro_liquido || 0), 0);
    const totalUnits = studios.reduce((acc, s) => acc + (s.total_itens || 0), 0);
    const totalClicks = studios.reduce((acc, s) => acc + (s.total_cliques || 0), 0);

    // Filtrar e Calcular Bolinhas de Distribuição (Scatter / Matriz BCG)
    const filteredStudios = studios
        .filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    const validStudios = filteredStudios.filter(s => (s.receita_bruta || 0) > 0);
    
    const avgStudioMargin = validStudios.length > 0 
        ? validStudios.reduce((acc, s) => {
            const rev = s.receita_bruta || 0;
            const prof = s.lucro_liquido || 0;
            return acc + (rev > 0 ? (prof / rev) * 100 : 0);
        }, 0) / validStudios.length 
        : 35;
    
    const revenues = validStudios.map(s => s.receita_bruta || 0).sort((a, b) => a - b);
    const medianStudioRevenue = revenues.length > 0
        ? revenues[Math.floor(revenues.length / 2)]
        : 200;

    const categorizedStudios = validStudios.map(s => {
        const revenue = s.receita_bruta || 0;
        const profit = s.lucro_liquido || 0;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        const isHighRevenue = revenue >= medianStudioRevenue;
        const isHighMargin = margin >= Math.max(0, avgStudioMargin);

        let quadrant: 'star' | 'opportunity' | 'cash_cow' | 'review';
        let quadrantLabel: string;
        let badgeColor: string;
        let recommendation: string;
        let icon: any;

        if (isHighRevenue && isHighMargin) {
            quadrant = 'star';
            quadrantLabel = 'Estrela (Alto Volume + Alta Margem)';
            badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
            recommendation = 'Motor de lucro. Priorizar novos lançamentos e manter estoque de resina pronto.';
            icon = Star;
        } else if (!isHighRevenue && isHighMargin) {
            quadrant = 'opportunity';
            quadrantLabel = 'Oportunidade (Alta Margem)';
            badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
            recommendation = 'Altamente rentável. Vale impulsionar marketing e fotos pintadas nas redes sociais.';
            icon = Zap;
        } else if (isHighRevenue && !isHighMargin) {
            quadrant = 'cash_cow';
            quadrantLabel = 'Volume (Margem Apertada)';
            badgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
            recommendation = 'Gera caixa rápido, mas consome muita resina. Otimizar suportes ou reajustar preço base.';
            icon = Scale;
        } else {
            quadrant = 'review';
            quadrantLabel = 'Revisar Precificação & Consumo';
            badgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
            recommendation = 'Baixo retorno ou margem negativa. O peso de resina está superando o preço cobrado.';
            icon = AlertTriangle;
        }

        return {
            ...s,
            name: s.nome,
            revenue,
            profit,
            margin,
            quadrant,
            quadrantLabel,
            badgeColor,
            recommendation,
            icon,
            x: revenue,
            y: Math.max(-100, Math.min(100, margin)),
            actualMargin: margin,
            z: Math.max(1, s.total_itens || 1)
        };
    }).sort((a, b) => b.revenue - a.revenue);

    const focusedStudio = categorizedStudios.find(s => s.name === activeStudioName) || categorizedStudios[0] || null;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Control Bar: Filters & Search */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center justify-between bg-zinc-950/40 border border-zinc-900 p-4 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                        <Target size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                            Distribuição dos Estúdios
                        </h3>
                        <p className="text-[10px] text-zinc-500">
                            Faturamento vs Margem Líquida no período selecionado.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Period Selector */}
                    <div className="relative group min-w-[160px]">
                        <select
                            value={dateRange}
                            onChange={e => setDateRange(e.target.value as DateRangeType)}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500/50 p-2.5 pr-8 rounded-xl outline-none text-xs font-bold text-zinc-300 appearance-none cursor-pointer"
                        >
                            <option value="all">Tudo (Desde Início)</option>
                            <option value="year">Este Ano</option>
                            <option value="last12m">Últimos 12 Meses</option>
                            <option value="90days">Últimos 90 Dias</option>
                            <option value="30days">Últimos 30 Dias</option>
                            <option value="month">Este Mês</option>
                            <option value="custom">Personalizado</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[180px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Buscar parceiro..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500/50 p-2.5 pl-8 rounded-xl outline-none text-xs text-zinc-300 placeholder:text-zinc-600"
                        />
                    </div>
                </div>
            </div>

            {/* Custom Date Picker Inputs */}
            {dateRange === 'custom' && (
                <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 flex flex-wrap gap-3 items-center">
                    <Calendar size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Intervalo:</span>
                    <input
                        type="date"
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-xs font-bold text-zinc-300 outline-none"
                    />
                    <span className="text-zinc-600 text-xs">até</span>
                    <input
                        type="date"
                        value={customEndDate}
                        onChange={e => setCustomEndDate(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-xs font-bold text-zinc-300 outline-none"
                    />
                </div>
            )}

            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 animate-pulse">
                        Carregando indicadores dos estúdios...
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Faturamento Bruto</span>
                            <span className="text-xl font-black text-white mt-1 block">
                                R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[8px] text-zinc-500 font-bold uppercase mt-0.5 block">Vendas no período</span>
                        </div>

                        <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Lucro Líquido Real</span>
                            <span className="text-xl font-black text-emerald-400 mt-1 block">
                                R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[8px] text-zinc-500 font-bold uppercase mt-0.5 block">
                                Margem: {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
                            </span>
                        </div>

                        <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Peças Vendidas</span>
                            <span className="text-xl font-black text-purple-400 mt-1 block">
                                {totalUnits} <span className="text-xs text-zinc-500 font-bold">itens</span>
                            </span>
                            <span className="text-[8px] text-zinc-500 font-bold uppercase mt-0.5 block">Volume entregue</span>
                        </div>

                        <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Cliques no Catálogo</span>
                            <span className="text-xl font-black text-amber-400 mt-1 block">
                                {totalClicks.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[8px] text-zinc-500 font-bold uppercase mt-0.5 block">
                                Conversão: {totalClicks > 0 ? ((totalUnits / totalClicks) * 100).toFixed(2) : 0}%
                            </span>
                        </div>
                    </div>

                    {/* Banner de Direcionamento para KPIs em Vendas */}
                    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-2.5">
                            <Activity size={16} className="text-blue-400 shrink-0" />
                            <span className="text-xs text-zinc-300">
                                Visão tabular de desempenho por série, estúdio e categoria:
                            </span>
                        </div>

                        <Link
                            href="/admin/sales?tab=kpis"
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all shadow-sm group shrink-0"
                        >
                            <span>Ver KPIs em Vendas</span>
                            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    {/* Matriz de Dispersão das Bolinhas (Scatter BCG) */}
                    <div className="space-y-6">
                        {categorizedStudios.length === 0 ? (
                            <div className="text-center py-16 bg-zinc-950/40 border border-zinc-900 rounded-3xl text-zinc-500 text-sm font-bold">
                                Nenhum estúdio com faturamento registrado no período selecionado.
                            </div>
                        ) : (
                            <>
                                {/* Painel Inspetor do Estúdio Focado */}
                                {focusedStudio && (
                                    <div className="bg-zinc-950/60 border border-zinc-800 p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0">
                                                {(() => {
                                                    const Icon = focusedStudio.icon;
                                                    return <Icon size={24} className={focusedStudio.badgeColor.split(' ')[0]} />;
                                                })()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <h3 className="text-base font-black text-white tracking-tight">{focusedStudio.nome}</h3>
                                                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${focusedStudio.badgeColor}`}>
                                                        {focusedStudio.quadrantLabel}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-zinc-400 mt-1 font-medium">{focusedStudio.recommendation}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-5 self-start lg:self-center bg-zinc-900/90 px-5 py-2.5 rounded-xl border border-zinc-800 shrink-0">
                                            <div>
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Faturamento</span>
                                                <span className="text-sm font-mono font-black text-white">
                                                    R$ {focusedStudio.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="h-6 w-px bg-zinc-800" />
                                            <div>
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Lucro Real</span>
                                                <span className={`text-sm font-mono font-black ${focusedStudio.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    R$ {focusedStudio.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="h-6 w-px bg-zinc-800" />
                                            <div>
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Margem Líquida</span>
                                                <span className={`text-sm font-black ${focusedStudio.actualMargin >= 30 ? 'text-emerald-400' : focusedStudio.actualMargin >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                    {focusedStudio.actualMargin.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="h-6 w-px bg-zinc-800" />
                                            <div>
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase block">Volume</span>
                                                <span className="text-sm font-bold text-zinc-200">{focusedStudio.total_itens || 0} un</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    {/* Gráfico Scatter 2D (8 Colunas) */}
                                    <div className="lg:col-span-8 bg-zinc-950/40 border border-zinc-900 p-6 rounded-3xl relative">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                                                Distribuição de Faturamento e Margem
                                            </h3>
                                            <span className="text-[10px] font-mono text-zinc-400">
                                                Margem Média: <strong className="text-zinc-200">{avgStudioMargin.toFixed(1)}%</strong>
                                            </span>
                                        </div>

                                        <div className="h-[360px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                                                    <CartesianGrid strokeDasharray="2 4" stroke="#27272a" />
                                                    <XAxis 
                                                        type="number" 
                                                        dataKey="x" 
                                                        name="Faturamento" 
                                                        tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }}
                                                        tickFormatter={(v) => `R$ ${v}`}
                                                        axisLine={{ stroke: '#27272a' }}
                                                    />
                                                    <YAxis 
                                                        type="number" 
                                                        dataKey="y" 
                                                        name="Margem de Lucro" 
                                                        tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }}
                                                        tickFormatter={(v) => `${v}%`}
                                                        axisLine={{ stroke: '#27272a' }}
                                                        domain={[-100, 100]}
                                                    />
                                                    <ZAxis type="number" dataKey="z" range={[120, 500]} name="Peças Vendidas" />
                                                    
                                                    {/* Linha da Margem Média */}
                                                    <ReferenceLine 
                                                        y={Math.max(-100, Math.min(100, avgStudioMargin))} 
                                                        stroke="#3b82f6" 
                                                        strokeDasharray="3 3" 
                                                        label={{ value: 'Margem Média', fill: '#60a5fa', fontSize: 10, position: 'right' }} 
                                                    />
                                                    {/* Linha do Faturamento Mediano */}
                                                    <ReferenceLine 
                                                        x={medianStudioRevenue} 
                                                        stroke="#71717a" 
                                                        strokeDasharray="3 3" 
                                                        label={{ value: 'Faturamento Mediano', fill: '#9ca3af', fontSize: 10, position: 'top' }} 
                                                    />
                                                    <Tooltip
                                                        cursor={false}
                                                        wrapperStyle={{ zIndex: 99999, pointerEvents: 'none' }}
                                                        content={({ active, payload }) => {
                                                            if (!active || !payload || !payload.length) return null;
                                                            const s = payload[0].payload;
                                                            return (
                                                                <div className="bg-zinc-950 border-2 border-zinc-700 p-3.5 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.95)] min-w-[220px]">
                                                                    <div className="flex items-center justify-between gap-3 mb-2">
                                                                        <h4 className="text-sm font-black text-white">{s.nome}</h4>
                                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${s.badgeColor}`}>
                                                                            {s.actualMargin.toFixed(1)}%
                                                                        </span>
                                                                    </div>
                                                                    <div className="space-y-1 text-xs pt-2 border-t border-zinc-800">
                                                                        <div className="flex justify-between gap-4">
                                                                            <span className="text-zinc-400 font-medium">Faturamento:</span>
                                                                            <span className="font-mono font-bold text-white">
                                                                                R$ {s.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between gap-4">
                                                                            <span className="text-zinc-400 font-medium">Lucro Líquido:</span>
                                                                            <span className={`font-mono font-bold ${s.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                                R$ {s.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between gap-4">
                                                                            <span className="text-zinc-400 font-medium">Peças Vendidas:</span>
                                                                            <span className="font-bold text-zinc-200">{s.total_itens || 0} un</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }}
                                                    />

                                                    <Scatter 
                                                        data={categorizedStudios} 
                                                        fill="#3b82f6" 
                                                        onClick={(e) => setActiveStudioName(e.nome)}
                                                        onMouseEnter={(e) => setActiveStudioName(e.nome)}
                                                        className="cursor-pointer"
                                                    >
                                                        {categorizedStudios.map((entry, index) => {
                                                            const colors = {
                                                                star: '#f59e0b',       // Amber
                                                                opportunity: '#10b981', // Emerald
                                                                cash_cow: '#3b82f6',   // Blue
                                                                review: '#f43f5e'       // Rose
                                                            };
                                                            const isSelected = focusedStudio?.nome === entry.nome;
                                                            return (
                                                                <Cell 
                                                                    key={`cell-${index}`} 
                                                                    fill={colors[entry.quadrant]}
                                                                    stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                                                                    strokeWidth={isSelected ? 3 : 1}
                                                                />
                                                            );
                                                        })}
                                                    </Scatter>
                                                </ScatterChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Ranking Estratégico por Quadrante (4 Colunas) */}
                                    <div className="lg:col-span-4 space-y-3">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 mb-3 flex items-center justify-between">
                                            <span>Classificação do Portfólio</span>
                                            <span className="text-[10px] text-zinc-400 font-bold">{categorizedStudios.length} estúdios</span>
                                        </h3>

                                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                                            {categorizedStudios.map((st) => {
                                                const Icon = st.icon;
                                                const isSelected = focusedStudio?.nome === st.nome;
                                                return (
                                                    <div 
                                                        key={st.id}
                                                        onClick={() => setActiveStudioName(st.nome)}
                                                        onMouseEnter={() => setActiveStudioName(st.nome)}
                                                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                                                            isSelected 
                                                                ? 'bg-zinc-900 border-zinc-400 shadow-md ring-1 ring-zinc-400' 
                                                                : 'bg-zinc-950/60 border-zinc-900 hover:border-zinc-800'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                            <span className="text-xs font-bold text-white truncate">{st.nome}</span>
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${st.badgeColor}`}>
                                                                <Icon size={10} />
                                                                {st.actualMargin.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[11px] text-zinc-400">
                                                            <span>R$ {st.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            <span className={`font-mono font-bold ${st.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                R$ {st.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} limpo
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
