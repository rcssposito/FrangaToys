'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
    TrendingUp, 
    DollarSign, 
    Box, 
    Award, 
    Loader2, 
    Calendar, 
    Search,
    ShoppingBag,
    Percent,
    PieChart as PieIcon,
    BarChart2 as BarIcon,
    Layers,
    ChevronDown,
    Activity,
    HelpCircle,
    X,
    Target
} from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { clsx } from 'clsx';

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
    custo_anual?: number;
    lucro_medio_unitario?: number;
    break_even_pecas_ano?: number;
    break_even_pecas_restantes?: number;
    break_even_progresso_pct?: number;
    break_even_faturamento_anual?: number;
    break_even_status?: 'isento' | 'pago' | 'proximo' | 'em_progresso' | 'sem_vendas';
}

type DateRangeType = 'all' | 'year' | 'last12m' | '90days' | '30days' | 'month' | 'custom';

const CHART_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1', '#a855f7', '#06b6d4', '#f43f5e'];

export default function StudiosBI() {
    const [studios, setStudios] = useState<Studio[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRangeType>('year');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [startDateLimit, setStartDateLimit] = useState<string | null>(null);
    const [endDateLimit, setEndDateLimit] = useState<string | null>(null);

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

    // Calculate elapsed months for proportional costs
    const getMonthsInInterval = (createdAt?: string) => {
        const now = new Date();
        let start: Date;

        if (dateRange === 'year') {
            start = new Date(now.getFullYear(), 0, 1);
        } else if (dateRange === 'last12m') {
            start = new Date();
            start.setFullYear(start.getFullYear() - 1);
        } else if (dateRange === '90days') {
            start = new Date();
            start.setDate(start.getDate() - 90);
        } else if (dateRange === '30days') {
            return 1;
        } else if (dateRange === 'month') {
            return 1;
        } else if (dateRange === 'custom') {
            start = customStartDate ? new Date(customStartDate) : new Date(createdAt || '2024-01-01');
            const end = customEndDate ? new Date(customEndDate) : now;
            const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
            return Math.max(1, diffMonths);
        } else {
            start = new Date(createdAt || '2024-01-01');
        }

        const effectiveStart = createdAt && new Date(createdAt) > start ? new Date(createdAt) : start;
        const diffMonths = (now.getFullYear() - effectiveStart.getFullYear()) * 12 + (now.getMonth() - effectiveStart.getMonth()) + 1;
        return Math.max(1, diffMonths);
    };

    // Summary Totals
    const totalRevenue = studios.reduce((acc, s) => acc + (s.receita_bruta || 0), 0);
    const totalProfit = studios.reduce((acc, s) => acc + (s.lucro_liquido || 0), 0);
    const totalUnits = studios.reduce((acc, s) => acc + (s.total_itens || 0), 0);
    const totalClicks = studios.reduce((acc, s) => acc + (s.total_cliques || 0), 0);
    const totalFiguresCount = studios.reduce((acc, s) => acc + (s.total_figuras || 0), 0);

    const getStudioVerdict = (studio: Studio, clicks: number, sales: number, profit: number, cost: number) => {
        const netBalance = profit - cost;
        
        if (studio.nome.toLowerCase() === 'custom' || !studio.custo_mensal) {
            return {
                label: 'Manter (Custo Zero)',
                badge: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
                desc: 'Catálogo próprio ou sem custo mensal de licença.'
            };
        }
        
        if (sales === 0 && clicks === 0) {
            return {
                label: 'Reavaliar (Sem uso)',
                badge: 'border-zinc-850 text-zinc-500 bg-zinc-950/40',
                desc: 'Sem cliques e sem vendas no período selecionado.'
            };
        }
        
        if (netBalance >= 0) {
            return {
                label: 'Manter (Lucrativo)',
                badge: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
                desc: 'O lucro das peças supera o custo de licenciamento.'
            };
        }

        if (clicks >= 50 && sales > 0) {
            return {
                label: 'Manter (Atrai Público)',
                badge: 'border-blue-500/30 text-blue-400 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
                desc: 'Gera alto tráfego e interesse na loja.'
            };
        }

        if (sales === 0 && cost > 0) {
            return {
                label: 'Cortar (Custo puro)',
                badge: 'border-rose-500/30 text-rose-400 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.15)]',
                desc: 'Gera custo sem retorno ou conversões.'
            };
        }

        return {
            label: 'Manter (Em Maturação)',
            badge: 'border-amber-500/30 text-amber-400 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
            desc: 'Vendas iniciais em crescimento.'
        };
    };

    // Filter and sort studios
    const filteredStudios = studios
        .filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase()))
        .map(s => {
            const revenue = s.receita_bruta || 0;
            const profit = s.lucro_liquido || 0;
            const ticket = s.ticket_medio || 0;
            const clicks = s.total_cliques || 0;
            const sales = s.total_vendas || 0;
            const commConversion = clicks > 0 ? (sales / clicks) * 100 : 0;
            const monthsCount = getMonthsInInterval(s.created_at);
            const costInPeriod = (Number(s.custo_mensal) || 0) * monthsCount;
            const netBalance = profit - costInPeriod;
            const verdict = getStudioVerdict(s, clicks, sales, profit, costInPeriod);

            return {
                ...s,
                revenue,
                profit,
                ticket,
                clicks,
                sales,
                commConversion,
                costInPeriod,
                netBalance,
                verdict
            };
        })
        .sort((a, b) => {
            if (b.revenue !== a.revenue) {
                return b.revenue - a.revenue;
            }
            if (b.sales !== a.sales) {
                return b.sales - a.sales;
            }
            return b.clicks - a.clicks;
        });

    const revenueShareData = filteredStudios
        .filter(s => (s.receita_bruta || 0) > 0)
        .map(s => ({
            name: s.nome,
            value: Number(s.receita_bruta?.toFixed(2)) || 0
        }))
        .sort((a, b) => b.value - a.value);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Control Bar: Filters & Search */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center justify-between bg-zinc-950/40 border border-zinc-900 p-4 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                        <TrendingUp size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                            Análise Operacional & Viabilidade
                        </h3>
                        <p className="text-[10px] text-zinc-500">
                            Classificação de parceiros por retorno real sobre o investimento.
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
                            placeholder="Filtrar parceiro..."
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
                        Calculando métricas operacionais e break-even...
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

                    {/* Studios Operational Table */}
                    <div className="bg-zinc-950/40 border border-zinc-900 rounded-3xl overflow-hidden">
                        <div className="p-5 border-b border-zinc-900 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers size={16} className="text-blue-500" />
                                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                                    Classificação dos Parceiros & Break-Even
                                </h3>
                            </div>
                            <span className="text-[10px] font-black uppercase text-zinc-500 bg-zinc-900 px-3 py-1 rounded-xl">
                                {filteredStudios.length} Estúdios
                            </span>
                        </div>

                        <div className="overflow-x-auto w-full">
                            <table className="min-w-[1100px] w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-900 text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-950/30">
                                        <th className="py-3 px-4">Parceiro</th>
                                        <th className="py-3 px-4">
                                            <div className="flex items-center gap-1">
                                                <span>Decisão</span>
                                                <button 
                                                    onClick={() => setShowHelpModal(true)} 
                                                    className="p-0.5 hover:text-blue-400 transition-colors"
                                                    title="Ver critérios"
                                                >
                                                    <HelpCircle size={10} />
                                                </button>
                                            </div>
                                        </th>
                                        <th className="py-3 px-4 text-center">Cliques</th>
                                        <th className="py-3 px-4 text-center">Conversão</th>
                                        <th className="py-3 px-4 text-center">Unidades</th>
                                        <th className="py-3 px-4 text-right">Faturamento</th>
                                        <th className="py-3 px-4 text-right">Lucro Peças</th>
                                        <th className="py-3 px-4 text-right">Custo Período</th>
                                        <th className="py-3 px-4 text-right">Líquido</th>
                                        <th className="py-3 px-4 text-center min-w-[140px]">Break-Even Anual</th>
                                        <th className="py-3 px-4 text-right">Ticket Médio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900/60 text-xs font-bold text-zinc-300">
                                    {filteredStudios.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="py-12 text-center text-zinc-600 uppercase font-black tracking-widest">
                                                Nenhum estúdio encontrado
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStudios.map((studio) => {
                                            const { revenue, profit, ticket, clicks, sales, commConversion, costInPeriod, netBalance, verdict } = studio as any;
                                            const custoAnual = studio.custo_anual ?? ((Number(studio.custo_mensal) || 0) * 12);
                                            const pct = studio.break_even_progresso_pct ?? (custoAnual > 0 ? Math.round((profit / custoAnual) * 100) : 100);
                                            const targetPieces = studio.break_even_pecas_ano ?? 0;
                                            const remainingPieces = studio.break_even_pecas_restantes ?? Math.max(0, targetPieces - (studio.total_itens || 0));
                                            const isPaid = custoAnual > 0 && profit >= custoAnual;

                                            return (
                                                <tr key={studio.id} className="hover:bg-zinc-900/20 transition-colors">
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                                                                {studio.logo_url ? (
                                                                    <img src={studio.logo_url} alt={studio.nome} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-[9px] font-black text-zinc-600">
                                                                        {studio.nome.slice(0, 2).toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-zinc-200 text-xs font-black tracking-tight">{studio.nome}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md border text-[8px] font-black uppercase tracking-wider ${verdict.badge}`}>
                                                            {verdict.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-zinc-300 font-bold whitespace-nowrap">
                                                        {clicks.toLocaleString('pt-BR')}
                                                    </td>
                                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                                        {clicks > 0 ? (
                                                            <span className={`text-[10px] font-black ${
                                                                commConversion >= 10 ? 'text-emerald-400' :
                                                                commConversion >= 3 ? 'text-blue-400' : 'text-zinc-500'
                                                            }`}>
                                                                {commConversion.toFixed(1)}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-zinc-600">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-zinc-200 font-black whitespace-nowrap">
                                                        {studio.total_itens || 0}
                                                        <span className="block text-[8px] text-zinc-500 font-bold uppercase mt-0.5">{sales} vend.</span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-zinc-300 font-bold whitespace-nowrap">
                                                        R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-emerald-400 font-black whitespace-nowrap">
                                                        R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-zinc-400 font-medium whitespace-nowrap">
                                                        {costInPeriod > 0 ? `R$ ${costInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : <span className="text-zinc-600">Isento</span>}
                                                    </td>
                                                    <td className={`py-3 px-4 text-right font-black text-xs whitespace-nowrap ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap text-center">
                                                        {custoAnual === 0 ? (
                                                            <span className="text-[8px] font-black uppercase text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                                                                Isento
                                                            </span>
                                                        ) : (
                                                            <div className="flex flex-col gap-1 w-28 mx-auto">
                                                                <div className="flex items-center justify-between text-[9px] font-black">
                                                                    <span className={isPaid ? "text-emerald-400" : remainingPieces <= 2 ? "text-amber-400" : "text-blue-400"}>
                                                                        {pct}%
                                                                    </span>
                                                                    <span className="text-[8px] text-zinc-500 font-bold">
                                                                        {isPaid ? "Pago!" : `Falta ${remainingPieces} pç${remainingPieces > 1 ? 's' : ''}`}
                                                                    </span>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/80">
                                                                    <div 
                                                                        className={clsx(
                                                                            "h-full rounded-full transition-all duration-500",
                                                                            isPaid ? "bg-emerald-400" : remainingPieces <= 2 ? "bg-amber-400" : "bg-blue-500"
                                                                        )}
                                                                        style={{ width: `${Math.min(100, Math.max((studio.total_itens || 0) > 0 ? 8 : 0, pct))}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[7px] text-zinc-500 font-bold text-center">
                                                                    {studio.total_itens || 0} de {targetPieces} pçs/ano
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right text-zinc-200 font-bold whitespace-nowrap">
                                                        R$ {ticket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Help Modal */}
            {showHelpModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowHelpModal(false)}
                >
                    <div 
                        className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">Critérios de Viabilidade</h4>
                            <button onClick={() => setShowHelpModal(false)} className="text-zinc-500 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-3 text-xs text-zinc-300">
                            <div>
                                <strong className="text-emerald-400">Manter (Lucrativo):</strong> O lucro gerado pelas vendas supera o custo da licença no período.
                            </div>
                            <div>
                                <strong className="text-blue-400">Manter (Atrai Público):</strong> Teve mais de 50 cliques e ao menos 1 venda, trazendo audiência para a loja.
                            </div>
                            <div>
                                <strong className="text-rose-400">Cortar (Custo puro):</strong> Gera custo mensal constante de licença sem vendas no período.
                            </div>
                            <div>
                                <strong className="text-zinc-400">Break-Even Anual:</strong> Mede o progresso do lucro obtido em relação ao custo anual do Patreon/licença e estima quantas peças faltam para pagar o ano.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
