'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { toast } from 'sonner';
import { 
    ArrowLeft, 
    Save, 
    DollarSign, 
    Star, 
    Box, 
    Loader2, 
    Trash, 
    Plus, 
    Instagram, 
    Globe, 
    ExternalLink, 
    Search, 
    ImageIcon, 
    Sparkles, 
    ShoppingBag, 
    Settings, 
    TrendingUp, 
    Percent, 
    ChevronDown, 
    MessageSquare, 
    Crown, 
    UserCheck, 
    UserX, 
    MoreVertical, 
    Target, 
    ShieldCheck, 
    AlertTriangle,
    Layers,
    Calendar,
    FolderGit2
} from 'lucide-react';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';
import { useRouter, useSearchParams } from 'next/navigation';
import StudiosBI from '@/components/Admin/StudiosBI';
import StudiosMonthlyControl from '@/components/Admin/StudiosMonthlyControl';
import AdminPatreonRepositoryPage from '../patreon/repository/page';

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
    custo_anual?: number;
    lucro_medio_unitario?: number;
    break_even_pecas_ano?: number;
    break_even_pecas_restantes?: number;
    break_even_progresso_pct?: number;
    break_even_faturamento_anual?: number;
    break_even_status?: 'isento' | 'pago' | 'proximo' | 'em_progresso' | 'sem_vendas';
}

function StudiosContent() {
    const [studios, setStudios] = useState<Studio[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newStudioName, setNewStudioName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'receita_bruta' | 'lucro_liquido' | 'break_even_progresso_pct' | 'total_figuras' | 'custo_mensal' | 'nome'>('receita_bruta');
    const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'with_sales' | 'pending_breakeven' | 'inactive'>('active');
    const [expandedStudioIds, setExpandedStudioIds] = useState<Record<number, boolean>>({});
    const [patreonData, setPatreonData] = useState<any>(null);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const initialTab: 'acervo' | 'bi' | 'mensalidades' | 'franga-studio' = 
        tabParam === 'bi' || tabParam === 'analytics' ? 'bi' :
        tabParam === 'mensalidades' || tabParam === 'gastos' ? 'mensalidades' :
        tabParam === 'franga-studio' || tabParam === 'patreon' ? 'franga-studio' : 'acervo';
    const [activeTab, setActiveTab] = useState<'acervo' | 'bi' | 'mensalidades' | 'franga-studio'>(initialTab);

    const changeTab = (tab: 'acervo' | 'bi' | 'mensalidades' | 'franga-studio') => {
        setActiveTab(tab);
        const params = new URLSearchParams(window.location.search);
        params.set('tab', tab);
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    };
    
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
            fetchStudios();
        }
    }, [canEdit]);

    useEffect(() => {
        if (canEdit && activeTab === 'acervo' && !patreonData) {
            fetchPatreon();
        }
    }, [canEdit, activeTab, patreonData]);

    const fetchPatreon = async () => {
        try {
            const res = await fetch('/api/admin/integrations/patreon/licenses', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setPatreonData(data);
            }
        } catch (error) {
            console.error('Erro ao carregar licenças Patreon:', error);
        }
    };

    const findPatreonMembership = (studioName: string) => {
        if (!patreonData?.memberships) return null;
        const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const normStudio = norm(studioName);
        return patreonData.memberships.find((m: any) => {
            const normCamp = norm(m.campaignName);
            return normCamp.includes(normStudio) || normStudio.includes(normCamp);
        });
    };

    const fetchStudios = async () => {
        try {
            const res = await fetch('/api/admin/studios', { cache: 'no-store' });
            const data = await res.json();
            if (res.ok) setStudios(data);
        } catch (error) {
            toast.error('Erro ao carregar estúdios');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (studio: Studio) => {
        setSaving(studio.id);
        try {
            const payload = {
                ...studio,
                custo_mensal: studio.custo_mensal === '' ? 0 : studio.custo_mensal
            };

            const res = await fetch('/api/admin/studios', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Falha ao salvar');
            toast.success('Estúdio atualizado!');
        } catch (error) {
            toast.error('Erro ao salvar alterações');
        } finally {
            setSaving(null);
        }
    };

    const handleAddStudio = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStudioName.trim()) return;

        setIsAdding(true);
        try {
            const res = await fetch('/api/admin/studios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: newStudioName.trim() })
            });

            if (!res.ok) throw new Error('Falha ao adicionar estúdio');

            toast.success('Estúdio adicionado!');
            setNewStudioName('');
            fetchStudios();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao adicionar estúdio');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: number, count: number = 0) => {
        if (count > 0) {
            toast.error(`Não é possível excluir. Existem ${count} figuras vinculadas.`);
            return;
        }
        if (!confirm('Você tem certeza que deseja excluir este estúdio?')) return;

        try {
            const res = await fetch(`/api/admin/studios?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Falha ao excluir o estúdio');
            toast.success('Estúdio removido!');
            fetchStudios();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao excluir estúdio');
        }
    };

    const handleChange = (id: number, field: keyof Studio, value: any) => {
        setStudios(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const toggleExpand = (id: number) => {
        setExpandedStudioIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const activeCount = studios.filter(s => s.ativo).length;
    const inactiveCount = studios.filter(s => !s.ativo).length;
    const withSalesCount = studios.filter(s => (Number(s.total_vendas) || 0) > 0).length;
    const pendingBreakEvenCount = studios.filter(s => {
        if (!s.ativo) return false;
        const custoAnual = s.custo_anual ?? ((Number(s.custo_mensal) || 0) * 12);
        const profit = s.lucro_liquido || 0;
        return custoAnual > 0 && profit < custoAnual;
    }).length;

    const filteredAndSortedStudios = useMemo(() => studios
        .filter(s => {
            if (statusFilter === 'active' && !s.ativo) return false;
            if (statusFilter === 'inactive' && s.ativo) return false;
            if (statusFilter === 'with_sales' && (Number(s.total_vendas) || 0) === 0) return false;
            if (statusFilter === 'pending_breakeven') {
                if (!s.ativo) return false;
                const custoAnual = s.custo_anual ?? ((Number(s.custo_mensal) || 0) * 12);
                const profit = s.lucro_liquido || 0;
                if (!(custoAnual > 0 && profit < custoAnual)) return false;
            }
            if (!searchTerm.trim()) return true;
            return s.nome.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .sort((a, b) => {
            if (sortBy === 'nome') {
                return a.nome.localeCompare(b.nome);
            }
            const valA = Number(a[sortBy]) || 0;
            const valB = Number(b[sortBy]) || 0;
            return valB - valA; // Descending for metrics and costs
        }), [studios, statusFilter, searchTerm, sortBy]);

    return (
        <div className="w-full text-zinc-100 relative">
            <div className="w-full relative z-10 transition-all duration-300">
                {/* Header & Main Tabs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3.5 flex-wrap">
                        <Link href="/admin" className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded-xl transition-all text-zinc-400 group">
                            <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Estúdios Parceiros</h1>
                            <p className="text-xs text-zinc-400 mt-0.5">Gestão de acervo, branding, custos operacionais e viabilidade comercial.</p>
                        </div>
                    </div>

                    {/* Segmented Control Tab Switcher */}
                    <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800/80 rounded-xl w-fit">
                        <button
                            type="button"
                            onClick={() => changeTab('acervo')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'acervo'
                                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                            }`}
                        >
                            <Box size={14} />
                            <span>Acervo & Licenças</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                                activeTab === 'acervo' ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-800/60 text-zinc-400'
                            }`}>
                                {activeCount}/{studios.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => changeTab('bi')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'bi'
                                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                            }`}
                        >
                            <TrendingUp size={14} />
                            <span>Painel de BI</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => changeTab('mensalidades')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'mensalidades'
                                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                            }`}
                        >
                            <Calendar size={14} />
                            <span>Controle Mensal</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => changeTab('franga-studio')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'franga-studio'
                                    ? 'bg-purple-900/40 text-purple-300 border border-purple-800/50 shadow-sm'
                                    : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/20'
                            }`}
                            title="Gerenciar lançamentos e repositórios do Franga Studio"
                        >
                            <FolderGit2 size={14} />
                            <span>Franga Studio</span>
                        </button>
                    </div>
                </div>

                {activeTab === 'mensalidades' ? (
                    <StudiosMonthlyControl />
                ) : activeTab === 'bi' ? (
                    <StudiosBI />
                ) : activeTab === 'franga-studio' ? (
                    <div className="bg-zinc-950/60 rounded-2xl p-4 border border-zinc-800 shadow-xl">
                        <AdminPatreonRepositoryPage />
                    </div>
                ) : (
                    <>
                        {/* Executive Financial Summary */}
                        {!loading && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
                                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Custo Licenças</span>
                                        <DollarSign size={16} className="text-zinc-500" />
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold font-mono tracking-tight text-zinc-100">
                                            R$ {studios.filter(s => s.ativo).reduce((acc, s) => acc + (Number(s.custo_mensal) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            <span className="text-xs font-normal text-zinc-400 font-sans ml-1">/ mês</span>
                                        </div>
                                        <div className="text-[11px] text-zinc-400 font-mono mt-1">
                                            R$ {(studios.filter(s => s.ativo).reduce((acc, s) => acc + (Number(s.custo_mensal) || 0), 0) * 12).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/ano total
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
                                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Estúdios Parceiros</span>
                                        <Box size={16} className="text-zinc-500" />
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold font-mono tracking-tight text-zinc-100">
                                            {activeCount} <span className="text-xs font-normal text-zinc-400 font-sans">ativos</span>
                                            <span className="text-zinc-600 font-normal text-sm font-sans mx-1">/</span>
                                            <span className="text-sm font-normal text-zinc-400 font-mono">{studios.length} total</span>
                                        </div>
                                        <div className="text-[11px] text-zinc-400 mt-1">
                                            {inactiveCount} estúdios inativos ou pausados
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
                                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Acervo em Catálogo</span>
                                        <Sparkles size={16} className="text-zinc-500" />
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold font-mono tracking-tight text-zinc-100">
                                            {studios.filter(s => s.merchant).reduce((acc, s) => acc + (s.total_figuras || 0), 0)}
                                            <span className="text-xs font-normal text-zinc-400 font-sans ml-1">figuras</span>
                                        </div>
                                        <div className="text-[11px] text-zinc-400 mt-1">
                                            {studios.filter(s => s.merchant && (s.total_figuras || 0) > 0).length} estúdios ativos com vitrine
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
                                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Licenças Patreon</span>
                                        <ShoppingBag size={16} className="text-zinc-500" />
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold font-mono tracking-tight text-zinc-100">
                                            {patreonData?.stats?.totalActive || 0}
                                            <span className="text-xs font-normal text-zinc-400 font-sans ml-1">ativas</span>
                                        </div>
                                        <div className="text-[11px] text-zinc-400 font-mono mt-1">
                                            {patreonData?.stats?.totalMonthlyUSD || '$0.00'} / mês em USD
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status Filter Toolbar, Search & Sort */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 bg-zinc-900/30 border border-zinc-800/80 p-3 rounded-2xl">
                            {/* Filter Pills */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('active')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        statusFilter === 'active'
                                            ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                                            : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                                    }`}
                                >
                                    <span>Apenas Ativos</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                                        statusFilter === 'active' ? 'bg-zinc-300 text-zinc-900' : 'bg-zinc-800 text-zinc-400'
                                    }`}>
                                        {activeCount}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('all')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        statusFilter === 'all'
                                            ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                                            : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                                    }`}
                                >
                                    <span>Todos os Estúdios</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                                        statusFilter === 'all' ? 'bg-zinc-300 text-zinc-900' : 'bg-zinc-800 text-zinc-400'
                                    }`}>
                                        {studios.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('with_sales')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        statusFilter === 'with_sales'
                                            ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                                            : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                                    }`}
                                >
                                    <span>Com Vendas</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                                        statusFilter === 'with_sales' ? 'bg-zinc-300 text-zinc-900' : 'bg-zinc-800 text-zinc-400'
                                    }`}>
                                        {withSalesCount}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('pending_breakeven')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        statusFilter === 'pending_breakeven'
                                            ? 'bg-amber-500 text-zinc-950 shadow-sm'
                                            : 'bg-zinc-900/60 text-amber-400/90 hover:text-amber-300 border border-amber-500/20'
                                    }`}
                                    title="Estúdios ativos com custo de licença ainda não coberto pelo lucro anual"
                                >
                                    <Target size={12} />
                                    <span>Break-Even Pendente</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                                        statusFilter === 'pending_breakeven' ? 'bg-black/20 text-zinc-950 font-bold' : 'bg-amber-500/15 text-amber-300'
                                    }`}>
                                        {pendingBreakEvenCount}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('inactive')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        statusFilter === 'inactive'
                                            ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                                            : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                                    }`}
                                >
                                    <span>Inativos / Pausados</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                                        statusFilter === 'inactive' ? 'bg-zinc-300 text-zinc-900' : 'bg-zinc-800 text-zinc-400'
                                    }`}>
                                        {inactiveCount}
                                    </span>
                                </button>
                            </div>

                            {/* Search & Sort */}
                            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                                <div className="relative flex-1 sm:w-64">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar estúdio..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 py-1.5 pl-9 pr-3 rounded-xl outline-none text-xs text-zinc-200 placeholder:text-zinc-500 transition-all"
                                    />
                                </div>

                                <div className="relative min-w-[170px]">
                                    <select
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value as any)}
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 py-1.5 pl-3 pr-8 rounded-xl outline-none text-xs font-medium text-zinc-300 appearance-none cursor-pointer"
                                    >
                                        <option value="receita_bruta">Faturamento Bruto</option>
                                        <option value="lucro_liquido">Lucro Líquido Real</option>
                                        <option value="break_even_progresso_pct">Progresso Break-Even (%)</option>
                                        <option value="total_figuras">Tamanho do Acervo</option>
                                        <option value="custo_mensal">Custo Mensal</option>
                                        <option value="nome">Nome do Estúdio</option>
                                    </select>
                                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                {loading ? (
                    <div className="py-24 flex justify-center w-full"><Loader2 className="animate-spin text-zinc-400 w-8 h-8" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-20">
                        {/* New Studio Card */}
                        {hasRole('admin') && (
                            <div className="bg-zinc-950/40 border-2 border-dashed border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-center items-center gap-4 hover:border-zinc-700 transition-all group min-h-[340px]">
                                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-zinc-200 transition-all">
                                    {isAdding ? <Loader2 className="animate-spin" size={20} /> : <Plus size={24} />}
                                </div>
                                <div className="text-center w-full px-2">
                                    <input 
                                        type="text"
                                        value={newStudioName}
                                        onChange={e => setNewStudioName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddStudio(e as any); }}
                                        placeholder="Nome do Novo Parceiro"
                                        className="bg-transparent text-center font-bold text-base outline-none text-zinc-100 placeholder:text-zinc-600 w-full mb-1"
                                    />
                                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Enter para cadastrar</p>
                                </div>
                            </div>
                        )}

                        {filteredAndSortedStudios.map(studio => {
                            const isExpanded = !!expandedStudioIds[studio.id];
                            const patreonMembership = findPatreonMembership(studio.nome);
                            
                            const revenue = studio.receita_bruta || 0;
                            const profit = studio.lucro_liquido || 0;
                            const salesCount = studio.total_vendas || 0;
                            
                            let healthLabel = 'Sem Vendas';
                            let healthColor = 'border-zinc-800 text-zinc-500 bg-zinc-900/10 shadow-[0_0_10px_rgba(113,113,122,0.05)]';
                            
                            if (salesCount > 0) {
                                if (profit > 1000) {
                                    healthLabel = 'Altamente Lucrativo';
                                    healthColor = 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
                                } else if (profit > 0) {
                                    healthLabel = 'Lucrativo';
                                    healthColor = 'border-emerald-600/20 text-emerald-500 bg-emerald-600/5 shadow-[0_0_10px_rgba(16,185,129,0.05)]';
                                } else if (profit === 0) {
                                    healthLabel = 'Break-even';
                                    healthColor = 'border-blue-500/20 text-blue-400 bg-blue-500/5';
                                } else {
                                    healthLabel = 'Operando em Prejuízo';
                                    healthColor = 'border-rose-500/30 text-rose-400 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
                                }
                            }

                            return (
                                <div key={studio.id} className={clsx(
                                    "bg-zinc-900/40 border rounded-2xl p-4 shadow-sm flex flex-col justify-between gap-3.5 transition-all duration-200 relative group",
                                    studio.ativo ? "border-zinc-800/80 hover:border-zinc-700/90" : "border-zinc-900/80 opacity-60 hover:opacity-90"
                                )}>
                                    {/* Studio Header */}
                                    <div className="flex justify-between items-start gap-2.5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="relative w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                                                {studio.logo_url ? (
                                                    <img src={studio.logo_url} alt={studio.nome} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="font-bold text-sm text-zinc-500 bg-zinc-950 w-full h-full flex items-center justify-center font-mono">
                                                        {studio.nome.slice(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                {!studio.ativo && (
                                                    <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-[7px] font-bold uppercase text-zinc-400 tracking-wider">OFF</div>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-col min-w-0">
                                                <div 
                                                    className="font-bold text-sm tracking-tight text-zinc-100 truncate"
                                                    title={studio.nome}
                                                >
                                                    {studio.nome}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                    <span className={clsx(
                                                        "text-[9px] font-semibold px-1.5 py-0.2 rounded border",
                                                        studio.ativo ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-500 border-zinc-700/40"
                                                    )}>
                                                        {studio.ativo ? 'Ativo' : 'Inativo'}
                                                    </span>

                                                    {studio.merchant && (
                                                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                                            Vitrine
                                                        </span>
                                                    )}

                                                    {studio.instagram_handle && (
                                                        <a href={`https://instagram.com/${studio.instagram_handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-1 bg-zinc-950 rounded text-zinc-500 hover:text-pink-400 transition-colors border border-zinc-800" title={studio.instagram_handle}>
                                                            <Instagram size={10} />
                                                        </a>
                                                    )}
                                                    {studio.social_url && (
                                                        <a href={studio.social_url} target="_blank" rel="noopener noreferrer" className="p-1 bg-zinc-950 rounded text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800" title="Website / Link">
                                                            <Globe size={10} />
                                                        </a>
                                                    )}
                                                    {studio.observacao && (
                                                        <div className="p-1 bg-zinc-950 rounded text-zinc-500 border border-zinc-800 group/obs relative cursor-help" title={studio.observacao}>
                                                            <MessageSquare size={10} />
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/obs:block bg-zinc-950 text-zinc-300 text-[10px] p-2 rounded-lg border border-zinc-800 w-48 shadow-2xl z-50 text-center font-medium normal-case tracking-normal">
                                                                {studio.observacao}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions Menu */}
                                        <div className="relative shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setOpenMenuId(openMenuId === studio.id ? null : studio.id)}
                                                className={clsx(
                                                    "w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border text-zinc-400 hover:text-white",
                                                    openMenuId === studio.id
                                                        ? "bg-zinc-800 border-zinc-700 text-white"
                                                        : "bg-zinc-950 border-zinc-800/80 hover:border-zinc-700"
                                                )}
                                                title="Opções"
                                            >
                                                <MoreVertical size={14} />
                                            </button>

                                            {openMenuId === studio.id && (
                                                <>
                                                    <div 
                                                        className="fixed inset-0 z-40" 
                                                        onClick={() => setOpenMenuId(null)} 
                                                    />
                                                    <div className="absolute right-0 top-8 z-50 bg-zinc-950 border border-zinc-800 rounded-xl p-1.5 shadow-2xl w-48 space-y-1">
                                                        {/* Vitrine Toggle */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newVal = !studio.merchant;
                                                                handleChange(studio.id, 'merchant', newVal);
                                                                handleUpdate({ ...studio, merchant: newVal });
                                                            }}
                                                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <ShoppingBag size={13} className={studio.merchant ? "text-purple-400" : "text-zinc-500"} />
                                                                <span>Exibir na Vitrine</span>
                                                            </div>
                                                            <span className={clsx("text-[9px] font-bold uppercase px-1.5 py-0.2 rounded", studio.merchant ? "bg-purple-500/20 text-purple-300" : "bg-zinc-800 text-zinc-500")}>
                                                                {studio.merchant ? 'Sim' : 'Não'}
                                                            </span>
                                                        </button>

                                                        {/* Operação Switch */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newVal = !studio.ativo;
                                                                handleChange(studio.id, 'ativo', newVal);
                                                                handleUpdate({ ...studio, ativo: newVal });
                                                            }}
                                                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Sparkles size={13} className={studio.ativo ? "text-emerald-400" : "text-zinc-500"} />
                                                                <span>Status Operação</span>
                                                            </div>
                                                            <span className={clsx("text-[9px] font-bold uppercase px-1.5 py-0.2 rounded", studio.ativo ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500")}>
                                                                {studio.ativo ? 'Ativo' : 'Pausado'}
                                                            </span>
                                                        </button>

                                                        {/* Settings Expand */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                toggleExpand(studio.id);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-900 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                                                        >
                                                            <Settings size={13} className="text-zinc-400" />
                                                            <span>Configurações & Links</span>
                                                        </button>

                                                        <div className="border-t border-zinc-900 my-1" />

                                                        {/* Delete Button */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleDelete(studio.id, studio.total_figuras || 0);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-rose-500/10 text-xs font-medium text-rose-400 transition-colors cursor-pointer"
                                                        >
                                                            <Trash size={13} />
                                                            <span>Excluir Estúdio</span>
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Patreon Merchant License Status Banner */}
                                    {patreonMembership && (() => {
                                        const isActive = patreonMembership.patronStatus === 'active_patron' && (patreonMembership.amountCents || 0) > 0;
                                        const isMerchant = patreonMembership.isMerchantTier;

                                        return (
                                            <div className={clsx(
                                                "rounded-xl p-2.5 flex justify-between items-center text-xs border transition-all",
                                                isActive 
                                                    ? (isMerchant ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/25")
                                                    : "bg-zinc-950/60 border-zinc-800/60 opacity-75"
                                            )}>
                                                <div className="flex items-center gap-2">
                                                    <span className={clsx(
                                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                                        isActive 
                                                            ? (isMerchant ? "bg-amber-400" : "bg-emerald-400") 
                                                            : "bg-zinc-600"
                                                    )} />
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-zinc-200 text-[11px] leading-tight">
                                                            {patreonMembership.tiers[0] || 'Tier'}
                                                        </span>
                                                        <span className="text-[9px] text-zinc-400 font-medium">
                                                            {isActive 
                                                                ? (isMerchant ? 'Licença Comercial Ativa' : 'Assinatura Pessoal Ativa')
                                                                : 'Membro Free (Sem licença ativa)'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Financial Health Pill */}
                                    {salesCount > 0 && (
                                        <div className={clsx(
                                            "w-full py-1 px-3 rounded-lg border text-[9px] font-mono font-bold uppercase tracking-wider text-center transition-all",
                                            healthColor
                                        )}>
                                            {healthLabel}
                                        </div>
                                    )}

                                    {/* Metrics Grid (2x2) */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {/* Faturamento */}
                                        <div className="bg-zinc-950/60 border border-zinc-900/80 rounded-xl p-2.5 flex flex-col justify-between">
                                            <span className="text-[9px] font-semibold tracking-wider uppercase text-zinc-500 flex items-center gap-1">
                                                <TrendingUp size={11} className="text-zinc-500" /> FATURAMENTO
                                            </span>
                                            <div className="mt-1.5">
                                                <div className="font-bold font-mono text-sm tracking-tight text-zinc-100">
                                                    R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                                    {salesCount} vendas ({studio.total_itens || 0} pçs)
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lucro Real */}
                                        <div className="bg-zinc-950/60 border border-zinc-900/80 rounded-xl p-2.5 flex flex-col justify-between">
                                            <span className="text-[9px] font-semibold tracking-wider uppercase text-zinc-500 flex items-center gap-1">
                                                <DollarSign size={11} className="text-zinc-500" /> LUCRO REAL
                                            </span>
                                            <div className="mt-1.5">
                                                <div className={clsx(
                                                    "font-bold font-mono text-sm tracking-tight",
                                                    profit > 0 ? "text-emerald-400" : profit < 0 ? "text-rose-500" : "text-zinc-200"
                                                )}>
                                                    R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                                    {(studio.margem_lucro || 0).toFixed(1)}% margem
                                                </div>
                                            </div>
                                        </div>

                                        {/* Acervo & Giro */}
                                        <div className="bg-zinc-950/60 border border-zinc-900/80 rounded-xl p-2.5 flex flex-col justify-between">
                                            <span className="text-[9px] font-semibold tracking-wider uppercase text-zinc-500 flex items-center gap-1">
                                                <Box size={11} className="text-zinc-500" /> ACERVO
                                            </span>
                                            <div className="mt-1.5">
                                                <div className="font-bold font-mono text-sm tracking-tight text-zinc-200">
                                                    {studio.total_figuras || 0} figuras
                                                </div>
                                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                                    {(studio.conversao_acervo || 0).toFixed(1)}% giro catálogo
                                                </div>
                                            </div>
                                        </div>

                                        {/* Qualidade & Ticket */}
                                        <div className="bg-zinc-950/60 border border-zinc-900/80 rounded-xl p-2.5 flex flex-col justify-between">
                                            <span className="text-[9px] font-semibold tracking-wider uppercase text-zinc-500 flex items-center gap-1">
                                                <Star size={11} className="text-zinc-500" /> NÍVEL & TICKET
                                            </span>
                                            <div className="mt-1 flex justify-between items-end">
                                                <div className="flex items-center gap-0.5">
                                                    <select
                                                        value={studio.qualidade || 5}
                                                        onChange={(e) => handleChange(studio.id, 'qualidade', parseInt(e.target.value))}
                                                        onBlur={() => handleUpdate(studio)}
                                                        className="bg-transparent border-none outline-none text-amber-400 font-bold font-mono text-sm cursor-pointer appearance-none text-right hover:text-amber-300 transition-colors py-0"
                                                    >
                                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n} className="bg-zinc-950">{n}</option>)}
                                                    </select>
                                                    <Star size={12} className="text-amber-400 mb-0.5" fill="currentColor" />
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[9px] text-zinc-500">Avg Ticket</div>
                                                    <div className="font-bold font-mono text-xs text-zinc-300">
                                                        R$ {(studio.ticket_medio || 0).toFixed(0)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Break-Even Anual */}
                                    {(() => {
                                        const custoAnual = studio.custo_anual ?? ((Number(studio.custo_mensal) || 0) * 12);
                                        const profit = studio.lucro_liquido || 0;
                                        const items = studio.total_itens || 0;
                                        const pct = studio.break_even_progresso_pct ?? (custoAnual > 0 ? Math.round((profit / custoAnual) * 100) : 100);
                                        const targetPieces = studio.break_even_pecas_ano ?? 0;
                                        const remainingPieces = studio.break_even_pecas_restantes ?? Math.max(0, targetPieces - items);
                                        const isPaid = custoAnual > 0 && profit >= custoAnual;
                                        const isZeroCost = custoAnual === 0;

                                        return (
                                            <div className="bg-zinc-950/60 border border-zinc-900/80 rounded-xl p-2.5 flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={clsx(
                                                            "w-5 h-5 rounded flex items-center justify-center text-xs",
                                                            isZeroCost ? "bg-zinc-800 text-zinc-400" :
                                                            isPaid ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" :
                                                            remainingPieces <= 2 ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" :
                                                            "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                                                        )}>
                                                            <Target size={11} />
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 block leading-none">
                                                                Break-Even Anual
                                                            </span>
                                                            <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                                                                {isZeroCost ? 'Sem custo de licença' : `R$ ${custoAnual.toLocaleString('pt-BR')}/ano`}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Badge de Status do Break-Even */}
                                                    <div>
                                                        {isZeroCost ? (
                                                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50 font-mono">
                                                                Isento
                                                            </span>
                                                        ) : isPaid ? (
                                                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                                                                <ShieldCheck size={10} />
                                                                Pago (+R$ {(profit - custoAnual).toLocaleString('pt-BR', { maximumFractionDigits: 0 })})
                                                            </span>
                                                        ) : remainingPieces <= 2 && items > 0 ? (
                                                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-mono">
                                                                <AlertTriangle size={10} />
                                                                Falta {remainingPieces} {remainingPieces === 1 ? 'pç' : 'pçs'}
                                                            </span>
                                                        ) : items === 0 ? (
                                                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                                                                Meta: {targetPieces} pçs/ano
                                                            </span>
                                                        ) : (
                                                            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/50 font-mono">
                                                                {pct}% coberto
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Barra de Progresso do Break-Even */}
                                                {!isZeroCost && (
                                                    <div className="space-y-1">
                                                        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden p-0.2 border border-zinc-800/80">
                                                            <div 
                                                                className={clsx(
                                                                    "h-full rounded-full transition-all duration-500",
                                                                    isPaid ? "bg-emerald-400" :
                                                                    remainingPieces <= 2 ? "bg-amber-400" :
                                                                    items === 0 ? "bg-zinc-800" :
                                                                    "bg-zinc-400"
                                                                )}
                                                                style={{ width: `${Math.min(100, Math.max(items > 0 ? 5 : 0, pct))}%` }}
                                                            />
                                                        </div>

                                                        <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono">
                                                            <span>
                                                                {isPaid ? (
                                                                    <span className="text-emerald-400 font-semibold">Meta anual atingida! ({items} vendidas)</span>
                                                                ) : (
                                                                    <span>
                                                                        <strong className="text-zinc-300">{items}</strong> de <strong className="text-zinc-300">{targetPieces}</strong> peças vendidas
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span>
                                                                {isPaid ? (
                                                                    <span className="text-zinc-400">{pct}%</span>
                                                                ) : (
                                                                    <span>Faltam <strong className="text-amber-400">{remainingPieces}</strong> pçs</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* 1-Click Shortcuts: Ver Figuras no Catálogo + Configurar */}
                                    <div className="flex items-center gap-2">
                                        <Link 
                                            href={`/admin/figures?studio=${studio.id}`}
                                            className="flex-1 py-2 px-3 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/50 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                                        >
                                            <Box size={13} className="text-zinc-400 shrink-0" />
                                            <span className="truncate">Figuras ({studio.total_figuras || 0})</span>
                                            <ExternalLink size={11} className="text-zinc-500 shrink-0" />
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() => toggleExpand(studio.id)}
                                            className={clsx(
                                                "py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0",
                                                isExpanded
                                                    ? "bg-zinc-800 border-zinc-700 text-white"
                                                    : "bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/50 text-zinc-400 hover:text-white"
                                            )}
                                            title="Editar logo, Instagram, site e anotações"
                                        >
                                            <Settings size={13} />
                                            <span>{isExpanded ? 'Fechar' : 'Editar'}</span>
                                        </button>
                                    </div>

                                    {/* Collapsible Edit Panel */}
                                    {isExpanded && (
                                        <div className="space-y-3 pt-3 border-t border-zinc-900/85">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Configurações</h4>
                                                {patreonMembership && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = {
                                                                ...studio,
                                                                social_url: studio.social_url || patreonMembership.campaignUrl || '',
                                                                custo_mensal: patreonMembership.amountBRL
                                                            };
                                                            setStudios(prev => prev.map(s => s.id === studio.id ? updated : s));
                                                            handleUpdate(updated);
                                                            toast.success(`Dados do ${studio.nome} sincronizados com o Patreon!`);
                                                        }}
                                                        className="px-2 py-0.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                                    >
                                                        <Sparkles size={11} /> Auto-Patreon
                                                    </button>
                                                )}
                                            </div>
                                            
                                            <div className="grid grid-cols-1 gap-2.5">
                                                {/* Logo URL */}
                                                <div className="flex items-center gap-2.5 bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                                                    <div className="p-1.5 bg-zinc-900 rounded-lg text-zinc-500"><ImageIcon size={13} /></div>
                                                    <div className="flex-1 flex flex-col">
                                                        <label className="text-[8px] font-semibold text-zinc-500 uppercase">URL do Logo</label>
                                                        <input
                                                            type="text"
                                                            placeholder="https://..."
                                                            value={studio.logo_url || ''}
                                                            onChange={e => handleChange(studio.id, 'logo_url', e.target.value)}
                                                            onBlur={() => handleUpdate(studio)}
                                                            className="bg-transparent text-xs font-medium outline-none text-zinc-200 placeholder:text-zinc-600 w-full mt-0.5"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Instagram */}
                                                <div className="flex items-center gap-2.5 bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                                                    <div className="p-1.5 bg-zinc-900 rounded-lg text-zinc-500"><Instagram size={13} /></div>
                                                    <div className="flex-1 flex flex-col">
                                                        <label className="text-[8px] font-semibold text-zinc-500 uppercase">Instagram</label>
                                                        <input
                                                            type="text"
                                                            placeholder="@handle"
                                                            value={studio.instagram_handle || ''}
                                                            onChange={e => handleChange(studio.id, 'instagram_handle', e.target.value)}
                                                            onBlur={() => handleUpdate(studio)}
                                                            className="bg-transparent text-xs font-medium outline-none text-zinc-200 placeholder:text-zinc-600 w-full mt-0.5"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Site URL */}
                                                <div className="flex items-center gap-2.5 bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                                                    <div className="p-1.5 bg-zinc-900 rounded-lg text-zinc-500"><Globe size={13} /></div>
                                                    <div className="flex-1 flex flex-col">
                                                        <label className="text-[8px] font-semibold text-zinc-500 uppercase">Website</label>
                                                        <input
                                                            type="text"
                                                            placeholder="https://site.com"
                                                            value={studio.social_url || ''}
                                                            onChange={e => handleChange(studio.id, 'social_url', e.target.value)}
                                                            onBlur={() => handleUpdate(studio)}
                                                            className="bg-transparent text-xs font-medium outline-none text-zinc-200 placeholder:text-zinc-600 w-full mt-0.5"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Observações */}
                                                <div className="flex items-start gap-2.5 bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                                                    <div className="p-1.5 bg-zinc-900 rounded-lg text-zinc-500 mt-0.5"><MessageSquare size={13} /></div>
                                                    <div className="flex-1 flex flex-col">
                                                        <label className="text-[8px] font-semibold text-zinc-500 uppercase">Anotações Internas</label>
                                                        <textarea
                                                            placeholder="Notas de licenciamento, suporte, prazos..."
                                                            value={studio.observacao || ''}
                                                            onChange={e => handleChange(studio.id, 'observacao', e.target.value)}
                                                            onBlur={() => handleUpdate(studio)}
                                                            rows={2}
                                                            className="bg-transparent text-xs font-medium outline-none text-zinc-200 placeholder:text-zinc-600 w-full mt-1 resize-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Custo Operacional Mensal */}
                                    <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/80 border-dashed transition-all mt-auto flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider">CUSTO MENSAL</span>
                                                {patreonMembership && patreonMembership.patronStatus === 'active_patron' && (
                                                    <span className="text-[8px] font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1 py-0.2 rounded">
                                                        Patreon Sync
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-zinc-500 font-mono text-xs">R$</span>
                                                <span className="text-base font-bold font-mono text-zinc-100 tracking-tight">
                                                    {(patreonMembership && patreonMembership.patronStatus === 'active_patron')
                                                        ? (patreonMembership.amountBRL || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                                                        : ((studio.custo_mensal || 0) as number).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                        {(!patreonMembership || patreonMembership.patronStatus !== 'active_patron') && (
                                            <div className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                                                <span className="text-[10px] text-zinc-500 font-mono">R$</span>
                                                <input
                                                    type="number"
                                                    value={studio.custo_mensal ?? ''}
                                                    onChange={(e) => handleChange(studio.id, 'custo_mensal', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                    onBlur={() => handleUpdate(studio)}
                                                    className="bg-transparent text-right text-xs font-mono font-medium text-zinc-200 outline-none w-14"
                                                    placeholder="0,00"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function StudiosPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
            </div>
        }>
            <StudiosContent />
        </Suspense>
    );
}
