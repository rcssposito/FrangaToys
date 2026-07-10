'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
    ArrowLeft, 
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
    X
} from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';
import { useRouter } from 'next/navigation';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

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

const CHART_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1', '#a855f7', '#06b6d4', '#f43f5e'];

export default function StudiosAnalyticsPage() {
    const [studios, setStudios] = useState<Studio[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRangeType>('year');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [startDateLimit, setStartDateLimit] = useState<string | null>(null);
    const [endDateLimit, setEndDateLimit] = useState<string | null>(null);

    const { hasRole, user } = usePermission();
    const canEdit = hasRole('admin') || hasRole('pricing');
    const router = useRouter();

    useEffect(() => {
        if (!loading && user && !canEdit) {
            toast.error('Acesso negado');
            router.push('/admin');
        }
    }, [user, loading, canEdit, router]);

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
                // All time: beginning in 1970
                start = new Date(1970, 0, 1);
            } else if (dateRange === 'custom') {
                if (customStartDate) start = new Date(customStartDate + 'T00:00:00');
                if (customEndDate) end = new Date(customEndDate + 'T23:59:59');
            }

            if (start) {
                params.append('startDate', start.toISOString());
                setStartDateLimit(start.toISOString());
            } else {
                setStartDateLimit(null);
            }

            if (end) {
                params.append('endDate', end.toISOString());
                setEndDateLimit(end.toISOString());
            } else {
                setEndDateLimit(null);
            }

            const res = await fetch(url + params.toString(), { cache: 'no-store' });
            const data = await res.json();
            if (res.ok) {
                setStudios(data);
            } else {
                throw new Error(data.error || 'Erro ao carregar dados');
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Erro ao carregar painel de BI');
        } finally {
            setLoading(false);
        }
    };

    const getMonthsInInterval = (studioCreatedAt?: string) => {
        const now = new Date();
        let start = startDateLimit ? new Date(startDateLimit) : new Date(now.getFullYear(), 0, 1);
        const end = endDateLimit ? new Date(endDateLimit) : new Date();

        if (studioCreatedAt) {
            const createdAt = new Date(studioCreatedAt);
            if (createdAt > start) {
                start = createdAt;
            }
        }

        const yearsDiff = end.getFullYear() - start.getFullYear();
        const monthsDiff = end.getMonth() - start.getMonth();
        const totalMonths = (yearsDiff * 12) + monthsDiff + 1; // inclusive of start month
        return Math.max(1, totalMonths);
    };

    const getStudioProfile = (studio: Studio) => {
        const revenue = studio.receita_bruta || 0;
        const profit = studio.lucro_liquido || 0;
        const salesCount = studio.total_vendas || 0;
        const itemsCount = studio.total_itens || 0;
        const conversion = studio.conversao_acervo || 0;
        const ticket = studio.ticket_medio || 0;
        const margin = studio.margem_lucro || 0;
        const clicks = studio.total_cliques || 0;

        if (salesCount === 0 && clicks === 0) {
            return {
                label: 'Inativo / Sem Engajamento',
                badge: 'border-zinc-850 text-zinc-500 bg-zinc-950/40',
                desc: 'Nenhuma venda ou clique registrado no período filtrado.',
                icon: '⚙️'
            };
        }

        // 1. "Vende Bem" (Alta Margem): high ticket, high margin
        if (ticket >= 200 && margin >= 40) {
            return {
                label: 'Vende Bem (Alta Margem)',
                badge: 'border-purple-500/30 text-purple-400 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.15)]',
                desc: 'Gera excelente rentabilidade e valor por transação por meio de peças premium.',
                icon: '💎'
            };
        }

        // 2. "Fecha Vendas" (Alta Conversão): high conversion rate or high sales count
        if (conversion >= 30 || itemsCount >= 15 || salesCount >= 10) {
            return {
                label: 'Fecha Vendas (Conversão)',
                badge: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
                desc: 'Apresenta alta taxa de conversão comercial ou volume expressivo de vendas.',
                icon: '🤝'
            };
        }

        // 3. "Traz Público" (Tráfego/Cliques): high clicks but lower conversion
        if (clicks >= 50) {
            return {
                label: 'Traz Público (Tráfego)',
                badge: 'border-blue-500/30 text-blue-400 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
                desc: 'Atrai interesse massivo de visitantes e cliques para o catálogo, independente de vendas.',
                icon: '📢'
            };
        }

        return {
            label: 'Operacional / Em Desenvolvimento',
            badge: 'border-orange-500/30 text-orange-400 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]',
            desc: 'Parceiro com engajamento inicial ou início de catálogo ativo.',
            icon: '⚙️'
        };
    };

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
        
        if (clicks >= 40) {
            return {
                label: 'Manter (Atrai Público)',
                badge: 'border-blue-500/30 text-blue-400 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
                desc: 'Apesar do saldo negativo, atrai muitas visualizações/cliques para o site.'
            };
        }
        
        if (clicks >= 15 && sales > 0) {
            return {
                label: 'Manter (Diluído/Interesse)',
                badge: 'border-orange-500/30 text-orange-400 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]',
                desc: 'Mantém engajamento mínimo e vendas ocasionais diluídas.'
            };
        }

        return {
            label: 'Reavaliar',
            badge: 'border-rose-500/30 text-rose-455 bg-rose-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]',
            desc: 'Gera prejuízo líquido e tem baixo interesse do público.'
        };
    };

    // Calculate aggregated metrics
    const totalRevenue = studios.reduce((acc, s) => acc + (s.receita_bruta || 0), 0);
    const totalProfit = studios.reduce((acc, s) => acc + (s.lucro_liquido || 0), 0);
    const totalItems = studios.reduce((acc, s) => acc + (s.total_itens || 0), 0);
    const totalClicks = studios.reduce((acc, s) => acc + (s.total_cliques || 0), 0);

    const activeStudiosCount = studios.filter(s => (s.total_vendas || 0) > 0).length;
    const bestStudio = [...studios].sort((a, b) => (b.receita_bruta || 0) - (a.receita_bruta || 0))[0];

    const filteredStudios = studios
        .filter(s => s.ativo !== false)
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

    // Prepare chart data
    const barChartData = filteredStudios
        .filter(s => (s.receita_bruta || 0) > 0 || (s.lucro_liquido || 0) > 0)
        .map(s => ({
            name: s.nome.length > 15 ? s.nome.slice(0, 15) + '...' : s.nome,
            Faturamento: Number(s.receita_bruta?.toFixed(2)) || 0,
            Lucro: Number(s.lucro_liquido?.toFixed(2)) || 0
        }));

    const unitShareData = filteredStudios
        .filter(s => (s.total_itens || 0) > 0)
        .map(s => ({
            name: s.nome,
            value: s.total_itens || 0
        }))
        .sort((a, b) => b.value - a.value);

    const revenueShareData = filteredStudios
        .filter(s => (s.receita_bruta || 0) > 0)
        .map(s => ({
            name: s.nome,
            value: Number(s.receita_bruta?.toFixed(2)) || 0
        }))
        .sort((a, b) => b.value - a.value);

    return (
        <div className="min-h-screen bg-black text-zinc-100 p-4 md:p-8 relative overflow-x-hidden">
            {/* Background blobs */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[150px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 transition-all duration-500">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-5">
                        <Link href="/admin/studios" className="p-3 bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400 rounded-2xl transition-all shadow-lg text-zinc-500 group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white flex items-center gap-3">
                                BI de <span className="text-blue-500">Estúdios</span>
                                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full">Dashboard</span>
                            </h1>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">Análise de Performance Comercial, Margem e Classificação Operacional.</p>
                        </div>
                    </div>

                    {/* Date Filters & Search */}
                    <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch md:items-center max-w-2xl w-full justify-end">
                        {/* Period Selector */}
                        <div className="relative group min-w-[170px]">
                            <select
                                value={dateRange}
                                onChange={e => setDateRange(e.target.value as DateRangeType)}
                                className="w-full bg-zinc-950/60 border border-zinc-900 focus:border-blue-500/50 p-3 pr-10 rounded-2xl outline-none text-xs font-black uppercase tracking-widest text-zinc-300 appearance-none cursor-pointer"
                            >
                                <option value="all" className="bg-zinc-950">Tudo (Desde Início)</option>
                                <option value="year" className="bg-zinc-950">Este Ano</option>
                                <option value="last12m" className="bg-zinc-950">Últimos 12 Meses</option>
                                <option value="90days" className="bg-zinc-950">Últimos 90 Dias</option>
                                <option value="30days" className="bg-zinc-950">Últimos 30 Dias</option>
                                <option value="month" className="bg-zinc-950">Este Mês</option>
                                <option value="custom" className="bg-zinc-950">Período Personalizado</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        </div>

                        {/* Search Input */}
                        <div className="relative group min-w-[200px]">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-650 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Filtrar parceiro..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-950/60 border border-zinc-900 focus:border-blue-500/50 p-3 pl-10 rounded-2xl outline-none text-xs font-bold transition-all text-zinc-300 placeholder:text-zinc-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Custom Date Picker Inputs */}
                {dateRange === 'custom' && (
                    <div className="bg-zinc-950/40 border border-zinc-900 rounded-3xl p-5 mb-8 flex flex-wrap gap-4 items-center animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-3">
                            <Calendar size={16} className="text-blue-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Filtrar Intervalo:</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={e => setCustomStartDate(e.target.value)}
                                className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl text-xs font-bold text-zinc-300 outline-none focus:border-blue-500/50"
                            />
                            <span className="text-zinc-600 text-xs">até</span>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={e => setCustomEndDate(e.target.value)}
                                className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl text-xs font-bold text-zinc-300 outline-none focus:border-blue-500/50"
                            />
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="py-36 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-blue-500 w-12 h-12 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 animate-pulse">Processando métricas operacionais...</p>
                    </div>
                ) : (
                    <div className="space-y-8 pb-24">
                        
                        {/* Key Metrics Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                            <div className="bg-zinc-950/45 border border-zinc-900/80 rounded-3xl p-5 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Faturamento Bruto</span>
                                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                                        <DollarSign size={14} />
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tighter">
                                    R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                                <p className="text-[8px] text-zinc-500 font-bold mt-1 uppercase tracking-wider">Faturado no período</p>
                            </div>

                            <div className="bg-zinc-950/45 border border-zinc-900/80 rounded-3xl p-5 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Lucro Líquido Real</span>
                                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                                        <TrendingUp size={14} />
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-emerald-400 tracking-tighter">
                                    R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </h3>
                                <p className="text-[8px] text-zinc-500 font-bold mt-1 uppercase tracking-wider">
                                    Margem: {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
                                </p>
                            </div>

                            <div className="bg-zinc-950/45 border border-zinc-900/80 rounded-3xl p-5 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Unidades Vendidas</span>
                                    <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                                        <Box size={14} />
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tighter">
                                    {totalItems} <span className="text-xs text-zinc-550">peças</span>
                                </h3>
                                <p className="text-[8px] text-zinc-500 font-bold mt-1 uppercase tracking-wider">Volume de saída</p>
                            </div>

                            <div className="bg-zinc-950/45 border border-zinc-900/80 rounded-3xl p-5 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Visualizações (Cliques)</span>
                                    <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                                        <Activity size={14} />
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tighter">
                                    {totalClicks.toLocaleString('pt-BR')} <span className="text-xs text-zinc-550">cliques</span>
                                </h3>
                                <p className="text-[8px] text-zinc-500 font-bold mt-1 uppercase tracking-wider">Engajamento do catálogo</p>
                            </div>

                            <div className="bg-zinc-950/45 border border-zinc-900/80 rounded-3xl p-5 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-550">Melhor Desempenho</span>
                                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400">
                                        <Award size={14} />
                                    </div>
                                </div>
                                <h3 className="text-md font-black text-white tracking-tight truncate max-w-[170px]" title={bestStudio?.nome || 'Nenhum'}>
                                    {bestStudio ? bestStudio.nome : 'Sem dados'}
                                </h3>
                                <p className="text-[8px] text-zinc-500 font-bold mt-1.5 uppercase tracking-wider">
                                    {bestStudio && bestStudio.receita_bruta ? `R$ ${bestStudio.receita_bruta.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : 'Sem vendas'}
                                </p>
                            </div>
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* Revenue vs Profit Bar Chart */}
                            <div className="lg:col-span-2 bg-zinc-950/35 border border-zinc-900 rounded-[2.5rem] p-6 md:p-8 flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/15 border border-blue-500/25 rounded-xl text-blue-400">
                                        <BarIcon size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-md font-black tracking-tight text-white">Desempenho Financeiro por Parceiro</h3>
                                        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-650">Faturamento vs Lucro Líquido Real (R$)</p>
                                    </div>
                                </div>
                                <div className="h-80 w-full text-xs font-semibold">
                                    {barChartData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-zinc-600 font-black uppercase tracking-wider">Sem vendas registradas no período</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
                                                <XAxis dataKey="name" stroke="#52525b" tickLine={false} />
                                                <YAxis stroke="#52525b" tickLine={false} />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#090b0e', borderColor: '#27272a', borderRadius: '1rem' }}
                                                    itemStyle={{ color: '#f4f4f5', fontWeight: 'bold' }}
                                                    labelStyle={{ color: '#71717a', fontWeight: 'bold' }}
                                                    formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`]}
                                                />
                                                <Legend wrapperStyle={{ paddingTop: 10 }} />
                                                <Bar dataKey="Faturamento" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Market Share Pie Chart (Units) */}
                            <div className="bg-zinc-950/35 border border-zinc-900 rounded-[2.5rem] p-5 flex flex-col justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/15 border border-purple-500/25 rounded-xl text-purple-400">
                                        <PieIcon size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black tracking-tight text-white">Share de Vendas</h3>
                                        <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-650">Peças Vendidas (Qtd)</p>
                                    </div>
                                </div>
                                
                                <div className="h-44 w-full relative flex items-center justify-center">
                                    {unitShareData.length === 0 ? (
                                        <div className="text-zinc-655 font-black text-xs uppercase tracking-wider">Sem dados</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={unitShareData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={65}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {unitShareData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#090b0e', borderColor: '#27272a', borderRadius: '1rem' }}
                                                    itemStyle={{ color: '#f4f4f5', fontWeight: 'bold' }}
                                                    labelStyle={{ color: '#71717a', fontWeight: 'bold' }}
                                                    formatter={(value) => [`${value} un`]}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>

                                {/* Custom Legend */}
                                <div className="space-y-1.5 pr-1 text-[11px]">
                                    {unitShareData.slice(0, 4).map((entry, index) => {
                                        const percentage = totalItems > 0 ? (entry.value / totalItems) * 100 : 0;
                                        return (
                                            <div key={entry.name} className="flex items-center justify-between font-bold text-zinc-400">
                                                <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                                                    <span className="truncate">{entry.name}</span>
                                                </div>
                                                <span className="text-zinc-200">{percentage.toFixed(1)}%</span>
                                            </div>
                                        );
                                    })}
                                    {unitShareData.length > 4 && (
                                        <div className="text-[8px] text-zinc-550 text-center font-black uppercase tracking-wider pt-0.5">
                                            + {unitShareData.length - 4} parceiros
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Market Share Pie Chart (Revenue) */}
                            <div className="bg-zinc-950/35 border border-zinc-900 rounded-[2.5rem] p-5 flex flex-col justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/15 border border-emerald-500/25 rounded-xl text-emerald-400">
                                        <PieIcon size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black tracking-tight text-white">Share de Receita</h3>
                                        <p className="text-[9px] uppercase tracking-widest font-bold text-zinc-650">Faturamento Bruto (R$)</p>
                                    </div>
                                </div>
                                
                                <div className="h-44 w-full relative flex items-center justify-center">
                                    {revenueShareData.length === 0 ? (
                                        <div className="text-zinc-655 font-black text-xs uppercase tracking-wider">Sem dados</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={revenueShareData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={65}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {revenueShareData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#090b0e', borderColor: '#27272a', borderRadius: '1rem' }}
                                                    itemStyle={{ color: '#f4f4f5', fontWeight: 'bold' }}
                                                    labelStyle={{ color: '#71717a', fontWeight: 'bold' }}
                                                    formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`]}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>

                                {/* Custom Legend */}
                                <div className="space-y-1.5 pr-1 text-[11px]">
                                    {revenueShareData.slice(0, 4).map((entry, index) => {
                                        const percentage = totalRevenue > 0 ? (entry.value / totalRevenue) * 100 : 0;
                                        return (
                                            <div key={entry.name} className="flex items-center justify-between font-bold text-zinc-400">
                                                <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                                                    <span className="truncate">{entry.name}</span>
                                                </div>
                                                <span className="text-zinc-200">{percentage.toFixed(1)}%</span>
                                            </div>
                                        );
                                    })}
                                    {revenueShareData.length > 4 && (
                                        <div className="text-[8px] text-zinc-550 text-center font-black uppercase tracking-wider pt-0.5">
                                            + {revenueShareData.length - 4} parceiros
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Studios Ranking and operational classification list */}
                        <div className="bg-zinc-950/35 border border-zinc-900 rounded-[2.5rem] overflow-hidden">
                            <div className="p-6 md:p-8 border-b border-zinc-900 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl">
                                        <Layers size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black tracking-tight text-white">Análise Operacional dos Parceiros</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-550">Métricas consolidadas de vendas e categorização comercial.</p>
                                    </div>
                                </div>
                                <span className="bg-zinc-900 px-3.5 py-1.5 rounded-2xl text-xs font-black text-zinc-400 border border-zinc-800 shadow-inner">
                                    {filteredStudios.length} Estúdios
                                </span>
                            </div>

                            <div className="overflow-x-auto w-full">
                                <table className="min-w-[1150px] w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-900/60 text-[10px] font-black uppercase tracking-widest text-zinc-550 bg-zinc-950/20">
                                            <th className="py-4 px-5 min-w-[150px]">Parceiro</th>
                                            <th className="py-4 px-5 min-w-[125px]">
                                                <div className="flex items-center gap-1.5 justify-start">
                                                    <span>Decisão</span>
                                                    <button 
                                                        onClick={() => setShowHelpModal(true)} 
                                                        className="p-1 bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                                                        title="Ver critérios de viabilidade"
                                                    >
                                                        <HelpCircle size={10} />
                                                    </button>
                                                </div>
                                            </th>
                                            <th className="py-4 px-5 text-center">Cliques</th>
                                            <th className="py-4 px-5 text-center">Conversão</th>
                                            <th className="py-4 px-5 text-center">Unidades</th>
                                            <th className="py-4 px-5 text-right">Faturamento</th>
                                            <th className="py-4 px-5 text-right">Lucro Peças</th>
                                            <th className="py-4 px-5 text-right">Custo Período</th>
                                            <th className="py-4 px-5 text-right">Resultado Líquido</th>
                                            <th className="py-4 px-5 text-right">Ticket Médio</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-900/40 text-xs font-bold text-zinc-350">
                                        {filteredStudios.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="py-12 text-center text-zinc-600 uppercase font-black tracking-widest">
                                                    Nenhum estúdio encontrado
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredStudios.map((studio) => {
                                                const { revenue, profit, ticket, clicks, sales, commConversion, costInPeriod, netBalance, verdict } = studio as any;

                                                return (
                                                    <tr key={studio.id} className="hover:bg-zinc-900/20 transition-colors group">
                                                        <td className="py-4 px-5 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-900 overflow-hidden flex items-center justify-center shrink-0">
                                                                    {studio.logo_url ? (
                                                                        <img src={studio.logo_url} alt={studio.nome} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-[10px] font-black text-zinc-655">
                                                                            {studio.nome.slice(0, 2).toUpperCase()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-zinc-200 group-hover:text-blue-400 transition-colors text-xs font-black tracking-tight">{studio.nome}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-5">
                                                            {(() => {
                                                                const label = verdict.label;
                                                                const hasSubtitle = label.includes(' (');
                                                                const mainText = hasSubtitle ? label.split(' (')[0] : label;
                                                                const subtitle = hasSubtitle ? label.split(' (')[1].replace(')', '') : '';
                                                                return (
                                                                    <span className={`inline-flex items-center justify-center w-[120px] h-9 rounded-lg border text-[8px] font-black uppercase tracking-wider text-center ${verdict.badge}`}>
                                                                        {hasSubtitle ? (
                                                                            <span className="flex flex-col items-center leading-none justify-center">
                                                                                <span>{mainText}</span>
                                                                                <span className="text-[7px] opacity-75 mt-0.5 font-bold">({subtitle})</span>
                                                                            </span>
                                                                        ) : (
                                                                            <span className="flex items-center justify-center">{label}</span>
                                                                        )}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="py-4 px-5 text-center text-zinc-300 font-bold whitespace-nowrap">
                                                            {clicks.toLocaleString('pt-BR')}
                                                        </td>
                                                        <td className="py-4 px-5 text-center whitespace-nowrap">
                                                            {clicks > 0 ? (
                                                                <span className={`inline-flex items-center text-[10px] font-black ${
                                                                    commConversion >= 10 ? 'text-emerald-450' :
                                                                    commConversion >= 3 ? 'text-blue-400' : 'text-zinc-500'
                                                                }`}>
                                                                    {commConversion.toFixed(1)}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-zinc-600">-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-5 text-center text-zinc-200 font-black whitespace-nowrap">
                                                            {studio.total_itens || 0}
                                                            <span className="block text-[8px] text-zinc-655 font-bold uppercase mt-0.5">{sales} vend.</span>
                                                        </td>
                                                        <td className="py-4 px-5 text-right text-zinc-250 font-bold whitespace-nowrap">
                                                            R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-4 px-5 text-right text-emerald-400 font-black whitespace-nowrap">
                                                            R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-4 px-5 text-right text-zinc-400 font-medium whitespace-nowrap">
                                                            {costInPeriod > 0 ? `R$ ${costInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : <span className="text-zinc-650">Isento</span>}
                                                        </td>
                                                        <td className={`py-4 px-5 text-right font-black text-xs whitespace-nowrap ${netBalance >= 0 ? 'text-emerald-450' : 'text-rose-455'}`}>
                                                            R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="py-4 px-5 text-right text-zinc-200 font-bold whitespace-nowrap">
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
            </div>

            {/* Viability Decision Criteria Help Modal */}
            {showHelpModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowHelpModal(false)}>
                    <div className="bg-zinc-950 border border-zinc-900 rounded-[2rem] p-6 max-w-md w-full relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowHelpModal(false)} className="absolute top-4 right-4 p-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-lg transition-colors cursor-pointer">
                            <X size={14} />
                        </button>
                        <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                            <HelpCircle size={16} className="text-blue-500" />
                            Critérios de Viabilidade
                        </h4>
                        <div className="space-y-4 text-xs text-zinc-400">
                            <p className="leading-relaxed">Como funciona a recomendação operacional automática:</p>
                            <div className="space-y-3">
                                <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl">
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-black uppercase tracking-wider mb-1">Manter (Custo Zero)</span>
                                    <p className="text-[10px] text-zinc-500 leading-tight">Catálogo próprio ou sem custo fixo mensal de licença.</p>
                                </div>
                                <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl">
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-black uppercase tracking-wider mb-1">Manter (Lucrativo)</span>
                                    <p className="text-[10px] text-zinc-500 leading-tight">O lucro gerado pelas peças vendidas supera o custo da licença no período.</p>
                                </div>
                                <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl">
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[8px] font-black uppercase tracking-wider mb-1">Manter (Atrai Público)</span>
                                    <p className="text-[10px] text-zinc-500 leading-tight">Embora o saldo individual seja negativo, o estúdio gerou alto engajamento no site (mais de 40 cliques), atraindo público qualificado.</p>
                                </div>
                                <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl">
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[8px] font-black uppercase tracking-wider mb-1">Manter (Diluído/Interesse)</span>
                                    <p className="text-[10px] text-zinc-500 leading-tight">Estúdio com cliques moderados (15+) e pelo menos uma venda, indicando interesse diluído.</p>
                                </div>
                                <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl">
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-455 text-[8px] font-black uppercase tracking-wider mb-1">Reavaliar</span>
                                    <p className="text-[10px] text-zinc-500 leading-tight">Estúdio no vermelho financeiro com baixo interesse/cliques do público.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
