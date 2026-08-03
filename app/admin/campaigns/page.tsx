'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { 
    Flame, Loader2, Search, Percent, AlertCircle, Plus, Trash2, Tag, 
    Layers, Building2, Tv, Sparkles, Filter, CheckCircle2, RefreshCw, X
} from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';

interface CampaignFigure {
    id: number;
    nome: string;
    imagem_url: string;
    is_campanha: boolean;
    is_campanha_active: boolean;
    desconto_campanha: number;
    preco_fixo_campanha: number;
    disponivel: boolean;
    custo_producao?: number;
    studio_id?: number;
    studios?: { nome: string };
    serie_id?: number;
    serie?: string;
}

export default function CampaignManager() {
    const { hasRole } = usePermission();
    const canEdit = hasRole('admin') || hasRole('sales') || hasRole('pricing');

    const [allFigures, setAllFigures] = useState<CampaignFigure[]>([]);
    const [searchResults, setSearchResults] = useState<CampaignFigure[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [localValues, setLocalValues] = useState<Record<number, any>>({});
    const [loading, setLoading] = useState(true);
    const [globalSearch, setGlobalSearch] = useState('');
    const [savingId, setSavingId] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);

    // Bulk Discount State
    const [bulkDiscount, setBulkDiscount] = useState<string>('');

    // Bulk Studio Campaign State
    const [studios, setStudios] = useState<{ id: number, nome: string }[]>([]);
    const [selectedStudioId, setSelectedStudioId] = useState<string>('');
    const [studioDiscount, setStudioDiscount] = useState<string>('');
    const [isApplyingStudio, setIsApplyingStudio] = useState(false);

    // Bulk Series Campaign State
    const [seriesList, setSeriesList] = useState<{ id: number, nome: string }[]>([]);
    const [selectedSerieId, setSelectedSerieId] = useState<string>('');
    const [serieDiscount, setSerieDiscount] = useState<string>('');
    const [isApplyingSerie, setIsApplyingSerie] = useState(false);

    // Filter Panel State (right side)
    const [panelSearch, setPanelSearch] = useState('');
    const [filterStudio, setFilterStudio] = useState('');
    const [filterSerie, setFilterSerie] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

    // Control Tab (Left Column)
    const [activeTab, setActiveTab] = useState<'series' | 'studio' | 'global'>('series');

    // Fetch Studios
    const fetchStudios = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/studios');
            if (res.ok) {
                const data = await res.json();
                setStudios(data.filter((s: any) => s.ativo));
            }
        } catch (e) {
            console.error('Erro ao carregar estúdios:', e);
        }
    }, []);

    // Fetch Series
    const fetchSeries = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/series');
            if (res.ok) {
                const data = await res.json();
                setSeriesList(data);
            }
        } catch (e) {
            console.error('Erro ao carregar séries:', e);
        }
    }, []);

    const fetchFigures = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/figures?campanha=true&limit=1000`);
            if (!res.ok) throw new Error('Falha ao carregar figuras');
            const data = await res.json();
            setAllFigures(data.items);
        } catch (error) {
            toast.error('Erro ao carregar catálogo');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        fetchFigures();
        fetchStudios();
        fetchSeries();
    }, [fetchFigures, fetchStudios, fetchSeries]);

    const campaignFigures = useMemo(() => {
        return allFigures.filter(f => f.is_campanha || f.is_campanha_active || f.preco_fixo_campanha > 0 || f.desconto_campanha > 0);
    }, [allFigures]);

    // Filtered Figures for Panel
    const filteredCampaignFigures = useMemo(() => {
        return campaignFigures.filter(f => {
            if (panelSearch) {
                const searchLower = panelSearch.toLowerCase();
                const matchName = f.nome.toLowerCase().includes(searchLower);
                const matchSerie = f.serie?.toLowerCase().includes(searchLower);
                const matchStudio = f.studios?.nome?.toLowerCase().includes(searchLower);
                if (!matchName && !matchSerie && !matchStudio) return false;
            }
            if (filterStudio && String(f.studio_id) !== filterStudio) return false;
            if (filterSerie && String(f.serie_id) !== filterSerie) return false;
            if (filterStatus === 'active' && !f.is_campanha_active) return false;
            if (filterStatus === 'inactive' && f.is_campanha_active) return false;
            return true;
        });
    }, [campaignFigures, panelSearch, filterStudio, filterSerie, filterStatus]);

    // Summary Stats
    const stats = useMemo(() => {
        const total = campaignFigures.length;
        const activeCount = campaignFigures.filter(f => f.is_campanha_active).length;
        const inactiveCount = total - activeCount;
        const totalDiscounts = campaignFigures.reduce((acc, f) => acc + (f.desconto_campanha || 0), 0);
        const avgDiscount = total > 0 ? (totalDiscounts / total).toFixed(1) : '0';
        return { total, activeCount, inactiveCount, avgDiscount };
    }, [campaignFigures]);

    // Dynamic Search for adding single figures
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const delayDebounceFn = setTimeout(async () => {
            if (globalSearch.length >= 2) {
                setIsSearching(true);
                try {
                    const res = await fetch(`/api/admin/figures?search=${encodeURIComponent(globalSearch)}&limit=20`, { signal });
                    if (res.ok) {
                        const data = await res.json();
                        const filtered = (data.items as CampaignFigure[]).filter(
                            f => !campaignFigures.some(existing => existing.id === f.id)
                        );
                        setSearchResults(filtered);
                    }
                } catch (error: any) {
                    if (error.name !== 'AbortError') {
                        console.error('Erro na busca:', error);
                    }
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setIsSearching(false);
            }
        }, 500);

        return () => {
            clearTimeout(delayDebounceFn);
            controller.abort();
        };
    }, [globalSearch, campaignFigures]);

    const handleSave = async (f: CampaignFigure, updates: Partial<CampaignFigure>) => {
        if (!canEdit) return;
        setSavingId(f.id);

        const isActivating = updates.is_campanha_active !== undefined ? updates.is_campanha_active : f.is_campanha_active;
        const isInCampaign = updates.is_campanha !== undefined ? updates.is_campanha : f.is_campanha;

        const payload = {
            id: f.id,
            is_campanha: isInCampaign,
            is_campanha_active: isActivating,
            desconto_campanha: (!isInCampaign) ? 0 : (updates.desconto_campanha !== undefined ? Number(updates.desconto_campanha) : f.desconto_campanha),
            preco_fixo_campanha: (!isInCampaign) ? 0 : (updates.preco_fixo_campanha !== undefined ? Number(updates.preco_fixo_campanha) : f.preco_fixo_campanha),
            disponivel: updates.disponivel !== undefined ? updates.disponivel : f.disponivel,
        };

        try {
            const res = await fetch('/api/admin/figures', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Erro ao salvar');

            setAllFigures(prev => {
                const exists = prev.find(item => item.id === f.id);
                if (exists) {
                    if (updates.is_campanha === false) {
                        return prev.filter(item => item.id !== f.id);
                    }
                    return prev.map(item => item.id === f.id ? { ...item, ...updates } : item);
                }
                if (updates.is_campanha === true) {
                    return [...prev, { ...f, ...updates }];
                }
                return prev;
            });

            setLocalValues(prev => {
                const next = { ...prev };
                delete next[f.id];
                return next;
            });

            if (updates.is_campanha === true) {
                toast.success(`${f.nome} adicionado à campanha!`);
                setGlobalSearch('');
            } else if (updates.is_campanha === false) {
                toast.info(`${f.nome} removido da campanha.`);
            } else {
                toast.success('Atualizado!');
            }
        } catch (err) {
            toast.error('Erro ao salvar modificação');
        } finally {
            setSavingId(null);
        }
    };

    // Bulk Global Discount
    const handleApplyBulkDiscount = async () => {
        if (!canEdit) return;
        const desc = Number(bulkDiscount);
        if (isNaN(desc) || desc <= 0 || desc > 100) {
            toast.error('Insira uma porcentagem válida entre 1 e 100.');
            return;
        }

        const activeFigures = allFigures.filter(f => f.is_campanha_active);
        if (activeFigures.length === 0) {
            toast.info('Nenhuma peça está "Ativa" na campanha no momento.');
            return;
        }

        const confirm = window.confirm(`Deseja aplicar ${desc}% de desconto em TODAS as ${activeFigures.length} peças atualmente ativas na campanha?`);
        if (!confirm) return;

        toast.loading(`Aplicando ${desc}% de desconto...`, { id: 'bulk-desc' });
        let errors = 0;

        for (const f of activeFigures) {
            try {
                await fetch('/api/admin/figures', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: f.id, desconto_campanha: desc }),
                });
            } catch (e) {
                errors++;
            }
        }

        if (errors > 0) {
            toast.error(`Concluído com ${errors} erros.`, { id: 'bulk-desc' });
        } else {
            toast.success('Desconto aplicado em massa!', { id: 'bulk-desc' });
        }

        fetchFigures();
    };

    // Bulk Studio Discount
    const handleApplyStudioDiscount = async () => {
        if (!canEdit || !selectedStudioId) return;
        const desc = Number(studioDiscount);
        if (isNaN(desc) || desc < 0 || desc > 100) {
            toast.error('Insira uma porcentagem válida entre 0 e 100.');
            return;
        }

        const studio = studios.find(s => s.id === Number(selectedStudioId));
        const confirm = window.confirm(`Deseja aplicar ${desc}% de desconto em TODAS as peças do estúdio "${studio?.nome}"?`);
        if (!confirm) return;

        setIsApplyingStudio(true);
        toast.loading('Aplicando promoção no estúdio...', { id: 'studio-desc' });

        try {
            const res = await fetch('/api/admin/figures/bulk-campaign', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studioId: Number(selectedStudioId), discount: desc }),
            });

            if (!res.ok) throw new Error();

            toast.success('Desconto por estúdio aplicado com sucesso!', { id: 'studio-desc' });
            setStudioDiscount('');
            fetchFigures();
        } catch (e) {
            toast.error('Erro ao aplicar desconto por estúdio.', { id: 'studio-desc' });
        } finally {
            setIsApplyingStudio(false);
        }
    };

    const handleClearStudioDiscount = async () => {
        if (!canEdit || !selectedStudioId) return;

        const studio = studios.find(s => s.id === Number(selectedStudioId));
        const confirm = window.confirm(`Deseja remover da campanha TODAS as peças do estúdio "${studio?.nome}"?`);
        if (!confirm) return;

        setIsApplyingStudio(true);
        toast.loading('Limpando promoção do estúdio...', { id: 'studio-desc' });

        try {
            const res = await fetch(`/api/admin/figures/bulk-campaign?studioId=${selectedStudioId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error();

            toast.success('Promoção do estúdio removida com sucesso!', { id: 'studio-desc' });
            fetchFigures();
        } catch (e) {
            toast.error('Erro ao remover promoção do estúdio.', { id: 'studio-desc' });
        } finally {
            setIsApplyingStudio(false);
        }
    };

    // Bulk Series Discount
    const handleApplySerieDiscount = async () => {
        if (!canEdit || !selectedSerieId) return;
        const desc = Number(serieDiscount);
        if (isNaN(desc) || desc < 0 || desc > 100) {
            toast.error('Insira uma porcentagem válida entre 0 e 100.');
            return;
        }

        const serieObj = seriesList.find(s => s.id === Number(selectedSerieId));
        const confirm = window.confirm(`Deseja aplicar ${desc}% de desconto em TODAS as peças da série "${serieObj?.nome}"?`);
        if (!confirm) return;

        setIsApplyingSerie(true);
        toast.loading('Aplicando promoção na série...', { id: 'serie-desc' });

        try {
            const res = await fetch('/api/admin/figures/bulk-campaign', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serieId: Number(selectedSerieId), discount: desc }),
            });

            if (!res.ok) throw new Error();

            toast.success('Desconto por série aplicado com sucesso!', { id: 'serie-desc' });
            setSerieDiscount('');
            fetchFigures();
        } catch (e) {
            toast.error('Erro ao aplicar desconto por série.', { id: 'serie-desc' });
        } finally {
            setIsApplyingSerie(false);
        }
    };

    const handleClearSerieDiscount = async () => {
        if (!canEdit || !selectedSerieId) return;

        const serieObj = seriesList.find(s => s.id === Number(selectedSerieId));
        const confirm = window.confirm(`Deseja remover da campanha TODAS as peças da série "${serieObj?.nome}"?`);
        if (!confirm) return;

        setIsApplyingSerie(true);
        toast.loading('Limpando promoção da série...', { id: 'serie-desc' });

        try {
            const res = await fetch(`/api/admin/figures/bulk-campaign?serieId=${selectedSerieId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error();

            toast.success('Promoção da série removida com sucesso!', { id: 'serie-desc' });
            fetchFigures();
        } catch (e) {
            toast.error('Erro ao remover promoção da série.', { id: 'serie-desc' });
        } finally {
            setIsApplyingSerie(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 space-y-8">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--card-border)] pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-gradient-to-br from-purple-500/20 to-purple-700/20 border border-purple-500/30 rounded-2xl text-purple-400 shadow-lg shadow-purple-500/10">
                        <Flame size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                            Gestor de Campanhas & Ofertas
                        </h1>
                        <p className="text-[var(--text-muted)] text-sm font-medium">
                            Gerencie promoções por Figuras Individuais, Estúdios, Séries ou Desconto Global.
                        </p>
                    </div>
                </div>

                <button
                    onClick={fetchFigures}
                    disabled={loading}
                    className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 bg-[var(--card-bg)] hover:bg-purple-500/10 border border-[var(--card-border)] hover:border-purple-500/30 rounded-xl text-xs font-bold text-[var(--foreground)] transition-all active:scale-95 shadow-sm"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin text-purple-400' : ''} />
                    Atualizar Dados
                </button>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-5 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                        <Tag size={22} />
                    </div>
                    <div>
                        <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Peças em Oferta</span>
                        <span className="text-2xl font-black text-[var(--foreground)]">{stats.total}</span>
                    </div>
                </div>

                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-5 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 rounded-xl text-green-400 border border-green-500/20">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Ativas na Vitrine</span>
                        <span className="text-2xl font-black text-green-400">{stats.activeCount}</span>
                    </div>
                </div>

                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-5 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-orange-500/10 rounded-xl text-orange-400 border border-orange-500/20">
                        <AlertCircle size={22} />
                    </div>
                    <div>
                        <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Pausadas / Inativas</span>
                        <span className="text-2xl font-black text-orange-400">{stats.inactiveCount}</span>
                    </div>
                </div>

                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-5 rounded-2xl shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                        <Percent size={22} />
                    </div>
                    <div>
                        <span className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Média de Desconto</span>
                        <span className="text-2xl font-black text-indigo-400">{stats.avgDiscount}%</span>
                    </div>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                
                {/* LEFT COLUMN: Controls & Search */}
                <div className="xl:col-span-4 space-y-6">
                    
                    {/* Control Panel Tabs */}
                    <div className="bg-[var(--card-bg)] border border-purple-500/20 rounded-2xl p-6 shadow-lg space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-lg flex items-center gap-2 text-purple-400">
                                <Sparkles size={20} />
                                Ações Promocionais em Lote
                            </h3>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--background)] border border-[var(--card-border)] rounded-xl">
                            <button
                                onClick={() => setActiveTab('series')}
                                className={`flex items-center justify-center gap-1.5 py-2 px-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                    activeTab === 'series'
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                                }`}
                            >
                                <Tv size={12} /> Séries
                            </button>

                            <button
                                onClick={() => setActiveTab('studio')}
                                className={`flex items-center justify-center gap-1.5 py-2 px-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                    activeTab === 'studio'
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                                }`}
                            >
                                <Building2 size={12} /> Estúdios
                            </button>

                            <button
                                onClick={() => setActiveTab('global')}
                                className={`flex items-center justify-center gap-1.5 py-2 px-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                    activeTab === 'global'
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                                }`}
                            >
                                <Percent size={12} /> Global
                            </button>
                        </div>

                        {/* TAB 1: Promoção por Série */}
                        {activeTab === 'series' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <p className="text-xs text-[var(--text-muted)]">
                                    Aplica ou remove o desconto em <strong className="text-purple-400">todas as figuras</strong> vinculadas a uma série selecionada (ex: *One Piece*, *Bleach*, *Dragon Ball*...).
                                </p>

                                <div>
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1.5">
                                        Selecione a Série ({seriesList.length})
                                    </label>
                                    <select
                                        value={selectedSerieId}
                                        onChange={(e) => setSelectedSerieId(e.target.value)}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] focus:border-purple-500 rounded-xl px-4 py-2.5 outline-none transition-all font-bold text-sm text-[var(--foreground)]"
                                    >
                                        <option value="">-- Escolha uma Série --</option>
                                        {seriesList.map(s => (
                                            <option key={s.id} value={s.id}>{s.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1.5">
                                        Porcentagem de Desconto (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            placeholder="Ex: 15"
                                            value={serieDiscount}
                                            onChange={(e) => setSerieDiscount(e.target.value)}
                                            className="w-full bg-[var(--input-bg)] border border-purple-500/30 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-all font-black text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-purple-500 opacity-50">%</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={handleApplySerieDiscount}
                                        disabled={!canEdit || !selectedSerieId || isApplyingSerie}
                                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    >
                                        {isApplyingSerie ? <Loader2 size={14} className="animate-spin" /> : 'Aplicar Série'}
                                    </button>
                                    <button
                                        onClick={handleClearSerieDiscount}
                                        disabled={!canEdit || !selectedSerieId || isApplyingSerie}
                                        className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/50 hover:text-red-400 text-zinc-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                                    >
                                        Limpar Série
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: Promoção por Estúdio */}
                        {activeTab === 'studio' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <p className="text-xs text-[var(--text-muted)]">
                                    Aplica ou remove a porcentagem de desconto em <strong className="text-purple-400">todas as peças</strong> de um determinado estúdio de modelagem.
                                </p>

                                <div>
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1.5">
                                        Selecione o Estúdio ({studios.length})
                                    </label>
                                    <select
                                        value={selectedStudioId}
                                        onChange={(e) => setSelectedStudioId(e.target.value)}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] focus:border-purple-500 rounded-xl px-4 py-2.5 outline-none transition-all font-bold text-sm text-[var(--foreground)]"
                                    >
                                        <option value="">-- Escolha um Estúdio --</option>
                                        {studios.map(s => (
                                            <option key={s.id} value={s.id}>{s.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1.5">
                                        Porcentagem de Desconto (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            placeholder="Ex: 10"
                                            value={studioDiscount}
                                            onChange={(e) => setStudioDiscount(e.target.value)}
                                            className="w-full bg-[var(--input-bg)] border border-purple-500/30 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-all font-black text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-purple-500 opacity-50">%</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={handleApplyStudioDiscount}
                                        disabled={!canEdit || !selectedStudioId || isApplyingStudio}
                                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    >
                                        {isApplyingStudio ? <Loader2 size={14} className="animate-spin" /> : 'Aplicar Estúdio'}
                                    </button>
                                    <button
                                        onClick={handleClearStudioDiscount}
                                        disabled={!canEdit || !selectedStudioId || isApplyingStudio}
                                        className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/50 hover:text-red-400 text-zinc-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                                    >
                                        Limpar Estúdio
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: Desconto Global em Massa */}
                        {activeTab === 'global' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <p className="text-xs text-[var(--text-muted)]">
                                    Aplica uma porcentagem de desconto geral em <strong className="text-purple-400">TODAS</strong> as peças que estão atualmente ativas no painel de ofertas.
                                </p>

                                <div>
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1.5">
                                        Desconto Global (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            placeholder="Ex: 20"
                                            value={bulkDiscount}
                                            onChange={(e) => setBulkDiscount(e.target.value)}
                                            className="w-full bg-[var(--input-bg)] border border-purple-500/30 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-all font-black text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-purple-500 opacity-50">%</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleApplyBulkDiscount}
                                    disabled={!canEdit}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    Aplicar Desconto em Todas as Ativas
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Adicionar Figuras Individuais */}
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 shadow-sm space-y-4">
                        <h2 className="text-lg font-black flex items-center gap-2 text-[var(--foreground)]">
                            <Plus size={20} className="text-purple-500" />
                            Adicionar Figura Individual
                        </h2>
                        <p className="text-xs text-[var(--text-muted)]">
                            Busque qualquer peça do catálogo para incluir no Gestor de Campanhas.
                        </p>

                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar figura no catálogo..."
                                value={globalSearch}
                                onChange={e => setGlobalSearch(e.target.value)}
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all font-medium text-sm text-[var(--foreground)]"
                            />
                        </div>

                        {/* Search Results Dropdown/List */}
                        {globalSearch && (
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                {isSearching ? (
                                    <div className="flex justify-center py-6">
                                        <Loader2 className="animate-spin text-purple-500" size={24} />
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(f => (
                                        <div key={f.id} className="flex items-center gap-3 p-2.5 bg-[var(--background)] border border-[var(--card-border)] rounded-xl hover:border-purple-500/40 transition-all">
                                            <img src={f.imagem_url || '/icon.png'} className="w-11 h-11 rounded-lg object-cover bg-zinc-900 border border-white/5 shrink-0" alt={f.nome} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-xs truncate" title={f.nome}>{f.nome}</p>
                                                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] truncate">
                                                    {f.serie && <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-bold">{f.serie}</span>}
                                                    {f.studios?.nome && <span>{f.studios.nome}</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleSave(f, { is_campanha: true })}
                                                disabled={!canEdit || savingId === f.id}
                                                className="p-2 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white rounded-lg transition-all disabled:opacity-50 shrink-0"
                                                title="Adicionar à Campanha"
                                            >
                                                {savingId === f.id ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={3} />}
                                            </button>
                                        </div>
                                    ))
                                ) : globalSearch.length >= 2 ? (
                                    <p className="text-xs text-[var(--text-muted)] text-center py-4 italic">Nenhuma figura nova encontrada com esse nome.</p>
                                ) : (
                                    <p className="text-xs text-[var(--text-muted)] text-center py-4 italic">Digite pelo menos 2 caracteres...</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Offers Panel Grid & Filters */}
                <div className="xl:col-span-8 space-y-6">
                    
                    {/* Header + Filter Toolbar */}
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h2 className="text-xl font-black flex items-center gap-2 text-[var(--foreground)]">
                                <Tag className="text-purple-400" size={22} />
                                Painel de Ofertas
                                <span className="bg-purple-500/20 text-purple-400 px-2.5 py-0.5 rounded-full text-xs font-black">
                                    {filteredCampaignFigures.length} / {campaignFigures.length}
                                </span>
                            </h2>

                            {/* Clear Panel Filters Button */}
                            {(panelSearch || filterStudio || filterSerie || filterStatus !== 'all') && (
                                <button
                                    onClick={() => {
                                        setPanelSearch('');
                                        setFilterStudio('');
                                        setFilterSerie('');
                                        setFilterStatus('all');
                                    }}
                                    className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-bold self-start sm:self-auto"
                                >
                                    <X size={14} /> Limpar Filtros
                                </button>
                            )}
                        </div>

                        {/* Filter inputs row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-[var(--card-border)]">
                            {/* Search Name */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                                <input
                                    type="text"
                                    placeholder="Filtrar por nome..."
                                    value={panelSearch}
                                    onChange={e => setPanelSearch(e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 outline-none transition-all text-xs font-medium text-[var(--foreground)]"
                                />
                            </div>

                            {/* Filter Studio */}
                            <select
                                value={filterStudio}
                                onChange={e => setFilterStudio(e.target.value)}
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-purple-500 rounded-xl px-3 py-2 outline-none transition-all text-xs font-medium text-[var(--foreground)]"
                            >
                                <option value="">Todos os Estúdios</option>
                                {studios.map(s => (
                                    <option key={s.id} value={s.id}>{s.nome}</option>
                                ))}
                            </select>

                            {/* Filter Serie */}
                            <select
                                value={filterSerie}
                                onChange={e => setFilterSerie(e.target.value)}
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-purple-500 rounded-xl px-3 py-2 outline-none transition-all text-xs font-medium text-[var(--foreground)]"
                            >
                                <option value="">Todas as Séries</option>
                                {seriesList.map(s => (
                                    <option key={s.id} value={s.id}>{s.nome}</option>
                                ))}
                            </select>

                            {/* Filter Status */}
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value as any)}
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-purple-500 rounded-xl px-3 py-2 outline-none transition-all text-xs font-medium text-[var(--foreground)]"
                            >
                                <option value="all">Todos os Status</option>
                                <option value="active">Somente Ativas</option>
                                <option value="inactive">Somente Pausadas</option>
                            </select>
                        </div>
                    </div>

                    {/* Figures Grid */}
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="animate-spin text-purple-500" size={32} />
                        </div>
                    ) : filteredCampaignFigures.length === 0 ? (
                        <div className="bg-[var(--card-bg)] border border-dashed border-[var(--card-border)] rounded-2xl p-16 text-center text-[var(--text-muted)] flex flex-col items-center gap-4">
                            <AlertCircle size={48} className="opacity-20" />
                            <p className="font-medium text-base">
                                {campaignFigures.length === 0 
                                    ? 'Nenhuma peça adicionada à campanha.' 
                                    : 'Nenhuma peça corresponde aos filtros aplicados.'}
                            </p>
                            <p className="text-xs opacity-60">
                                {campaignFigures.length === 0 
                                    ? 'Use as ações em lote ou a busca ao lado para inserir figuras.' 
                                    : 'Tente limpar os filtros acima.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredCampaignFigures.map(f => (
                                <div 
                                    key={f.id} 
                                    className={`bg-[var(--card-bg)] border ${
                                        f.is_campanha_active 
                                            ? 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.12)]' 
                                            : 'border-[var(--card-border)] opacity-80'
                                    } rounded-2xl p-4 flex gap-4 transition-all duration-300 relative group`}
                                >
                                    {/* Delete/Remove Button */}
                                    <button
                                        onClick={() => handleSave(f, { is_campanha: false, is_campanha_active: false })}
                                        disabled={!canEdit || savingId === f.id}
                                        className="absolute top-3 right-3 p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remover da Campanha"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    {/* Figure Image */}
                                    <div className="relative shrink-0">
                                        <img 
                                            src={f.imagem_url || '/icon.png'} 
                                            alt={f.nome} 
                                            className="w-20 h-24 object-cover rounded-xl bg-zinc-900 border border-[var(--card-border)]" 
                                        />
                                        {f.is_campanha_active && (
                                            <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--card-bg)] shadow" title="Ativo no Catálogo" />
                                        )}
                                    </div>

                                    {/* Figure Content */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-bold text-sm truncate pr-6" title={f.nome}>{f.nome}</h4>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)] flex-wrap">
                                                {f.serie && (
                                                    <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded font-bold border border-purple-500/20">
                                                        {f.serie}
                                                    </span>
                                                )}
                                                {f.studios?.nome && (
                                                    <span className="bg-zinc-800/60 text-zinc-400 px-2 py-0.5 rounded font-medium border border-zinc-700/40">
                                                        {f.studios.nome}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Controls & Inputs */}
                                        <div className="space-y-2 mt-3">
                                            {/* Switches */}
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <span className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">Na Oferta</span>
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={f.is_campanha}
                                                            disabled={!canEdit || savingId === f.id}
                                                            onChange={(e) => handleSave(f, { is_campanha: e.target.checked })}
                                                        />
                                                        <div className="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500 disabled:opacity-50"></div>
                                                    </div>
                                                </label>

                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <span className="text-[10px] font-black uppercase tracking-wide text-[var(--text-muted)]">Disponível</span>
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={f.is_campanha_active}
                                                            disabled={!canEdit || savingId === f.id}
                                                            onChange={(e) => handleSave(f, { is_campanha_active: e.target.checked })}
                                                        />
                                                        <div className="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500 disabled:opacity-50"></div>
                                                    </div>
                                                </label>
                                            </div>

                                            {/* Inputs Row */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {/* Discount % */}
                                                <div className="flex items-center gap-1.5 bg-[var(--input-bg)] p-1.5 rounded-xl border border-[var(--input-border)]">
                                                    <span className="text-[9px] font-black uppercase text-[var(--text-muted)] pl-1 whitespace-nowrap">Desc. %</span>
                                                    <input
                                                        type="number"
                                                        value={localValues[f.id]?.desconto_campanha ?? (f.desconto_campanha || '')}
                                                        placeholder="0"
                                                        disabled={!canEdit || savingId === f.id}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setLocalValues(prev => ({ ...prev, [f.id]: { ...prev[f.id], desconto_campanha: val } }));
                                                        }}
                                                        onBlur={(e) => handleSave(f, { desconto_campanha: e.target.value === '' ? 0 : Number(e.target.value) })}
                                                        className="w-full bg-transparent text-right text-xs font-black text-purple-400 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-purple-900/50"
                                                    />
                                                </div>

                                                {/* Fixed Price R$ */}
                                                <div className="flex items-center gap-1.5 bg-[var(--input-bg)] p-1.5 rounded-xl border border-[var(--input-border)]" title={f.custo_producao ? `Custo de Produção (Sugerido): R$ ${f.custo_producao.toFixed(2)}` : undefined}>
                                                    <span className="text-[9px] font-black uppercase text-[var(--text-muted)] pl-1 whitespace-nowrap">Fixo R$</span>
                                                    <input
                                                        type="number"
                                                        value={localValues[f.id]?.preco_fixo_campanha ?? (f.preco_fixo_campanha || '')}
                                                        placeholder={f.custo_producao ? f.custo_producao.toFixed(2) : "0.00"}
                                                        disabled={!canEdit || savingId === f.id}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setLocalValues(prev => ({ ...prev, [f.id]: { ...prev[f.id], preco_fixo_campanha: val } }));
                                                        }}
                                                        onBlur={(e) => handleSave(f, { preco_fixo_campanha: e.target.value === '' ? 0 : Number(e.target.value) })}
                                                        className="w-full bg-transparent text-right text-xs font-black text-green-400 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-green-900/50"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
