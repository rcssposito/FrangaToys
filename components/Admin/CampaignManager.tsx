'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { 
    Flame, Loader2, Search, Percent, AlertCircle, Plus, Trash2, Tag, 
    Layers, Building2, Tv, Sparkles, Filter, CheckCircle2, RefreshCw, X,
    AlertTriangle, CheckSquare, Square, Zap, Power, Clock
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

interface CampaignManagerProps {
    hideHeader?: boolean;
}

export default function CampaignManager({ hideHeader = false }: CampaignManagerProps) {
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

    // Selection State for Batch Operations
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [selectedBatchDiscount, setSelectedBatchDiscount] = useState<string>('');

    // Bulk Discount State
    const [bulkDiscount, setBulkDiscount] = useState<string>('');
    const [isApplyingGlobal, setIsApplyingGlobal] = useState(false);
    const [isClearingAll, setIsClearingAll] = useState(false);

    // Campaign End Timer State
    const [timerInput, setTimerInput] = useState<string>('');
    const [activeTimerIso, setActiveTimerIso] = useState<string | null>(null);
    const [isSavingTimer, setIsSavingTimer] = useState(false);

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
    const [activeTab, setActiveTab] = useState<'series' | 'studio' | 'global'>('global');

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

    const toDatetimeLocal = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const fetchCampaignTimer = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/figures/bulk-campaign');
            if (res.ok) {
                const data = await res.json();
                if (data.campaignEndAt) {
                    setActiveTimerIso(data.campaignEndAt);
                    setTimerInput(toDatetimeLocal(new Date(data.campaignEndAt)));
                } else {
                    setActiveTimerIso(null);
                    setTimerInput('');
                }
                if (data.expired) {
                    toast.info('O timer da promoção encerrou e as ofertas foram pausadas automaticamente.');
                }
            }
        } catch (e) {
            console.error('Erro ao carregar timer da campanha:', e);
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
        fetchCampaignTimer().then(() => fetchFigures());
        fetchStudios();
        fetchSeries();
    }, [fetchCampaignTimer, fetchFigures, fetchStudios, fetchSeries]);

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

    // 1. ZERAR TODOS OS DESCONTOS DA LOJA (KILL-SWITCH GERAL)
    const handleClearAllDiscounts = async () => {
        if (!canEdit) return;
        const confirm = window.confirm(
            `⚠️ ATENÇÃO - RESET GERAL DE PROMOÇÃO:\n\nDeseja ZERAR E REMOVER TODOS os descontos de campanha de TODAS as peças da loja?\n\nIsso removerá todas as peças da página de promoção e desativará os descontos. Deseja continuar?`
        );
        if (!confirm) return;

        setIsClearingAll(true);
        toast.loading('Removendo todos os descontos da loja...', { id: 'clear-all' });

        try {
            const res = await fetch('/api/admin/figures/bulk-campaign?clearAll=true', {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao remover descontos');

            toast.success(`Sucesso! ${data.count} peças tiveram descontos zerados.`, { id: 'clear-all' });
            setSelectedIds([]);
            setActiveTimerIso(null);
            setTimerInput('');
            fetchFigures();
        } catch (e: any) {
            toast.error(`Erro: ${e.message}`, { id: 'clear-all' });
        } finally {
            setIsClearingAll(false);
        }
    };

    // 2. MODO BLACK FRIDAY - APLICAR NA LOJA TODA
    const handleApplyStorewideDiscount = async () => {
        if (!canEdit) return;
        const desc = Number(bulkDiscount);
        if (isNaN(desc) || desc <= 0 || desc > 100) {
            toast.error('Insira uma porcentagem válida entre 1 e 100.');
            return;
        }

        const confirm = window.confirm(
            `🚀 MODO BLACK FRIDAY:\n\nDeseja aplicar ${desc}% de desconto em TODAS as figuras disponíveis da loja?`
        );
        if (!confirm) return;

        setIsApplyingGlobal(true);
        toast.loading(`Aplicando ${desc}% em toda a loja...`, { id: 'storewide' });

        try {
            const res = await fetch('/api/admin/figures/bulk-campaign', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applyAll: true, discount: desc }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao aplicar desconto');

            toast.success(`Modo Black Friday ativado! ${data.count} peças atualizadas com ${desc}% OFF.`, { id: 'storewide' });
            setBulkDiscount('');
            fetchFigures();
        } catch (e: any) {
            toast.error(`Erro: ${e.message}`, { id: 'storewide' });
        } finally {
            setIsApplyingGlobal(false);
        }
    };

    // 3. PAUSAR / REATIVAR TODAS AS PROMOÇÕES
    const handleToggleAllCampaignStatus = async (action: 'pause-all' | 'resume-all') => {
        if (!canEdit) return;
        const isPause = action === 'pause-all';
        const confirm = window.confirm(
            isPause
                ? 'Deseja pausar todas as peças em promoção? (Os descontos continuarão salvos, mas não aparecerão com preço promocional na vitrine)'
                : 'Deseja reativar todas as peças em promoção na vitrine?'
        );
        if (!confirm) return;

        toast.loading(isPause ? 'Pausando promoções...' : 'Reativando promoções...', { id: 'toggle-status' });

        try {
            const res = await fetch('/api/admin/figures/bulk-campaign', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao alterar status');

            toast.success(data.message || 'Status atualizado com sucesso!', { id: 'toggle-status' });
            if (isPause) {
                setActiveTimerIso(null);
                setTimerInput('');
            }
            fetchFigures();
        } catch (e: any) {
            toast.error(`Erro: ${e.message}`, { id: 'toggle-status' });
        }
    };

    // 3.5. SALVAR / REMOVER TIMER DE FIM DE PROMOÇÃO
    const handleSaveTimer = async (customIso?: string | null) => {
        if (!canEdit) return;
        const targetIso = customIso !== undefined
            ? customIso
            : (timerInput ? new Date(timerInput).toISOString() : null);

        if (targetIso && new Date(targetIso).getTime() <= Date.now()) {
            toast.error('Escolha uma data e horário no futuro para o encerramento.');
            return;
        }

        setIsSavingTimer(true);
        try {
            const res = await fetch('/api/admin/figures/bulk-campaign', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set-timer', campaignEndAt: targetIso }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar timer');

            setActiveTimerIso(data.campaignEndAt || null);
            if (data.campaignEndAt) {
                setTimerInput(toDatetimeLocal(new Date(data.campaignEndAt)));
                toast.success('Timer de encerramento ativado na vitrine!');
            } else {
                setTimerInput('');
                toast.info('Timer de encerramento removido.');
            }
        } catch (e: any) {
            toast.error(`Erro: ${e.message}`);
        } finally {
            setIsSavingTimer(false);
        }
    };

    const applyTimerPreset = (preset: '24h' | '48h' | 'sunday') => {
        const now = new Date();
        let target = new Date();
        if (preset === '24h') {
            target = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        } else if (preset === '48h') {
            target = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        } else if (preset === 'sunday') {
            const day = now.getDay(); // 0 is Sunday
            const daysUntilSunday = day === 0 ? 0 : 7 - day;
            target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 0);
            if (target.getTime() <= now.getTime()) {
                target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 0);
            }
        }
        setTimerInput(toDatetimeLocal(target));
        handleSaveTimer(target.toISOString());
    };

    // 4. APLICAR DESCONTO APENAS NAS ATIVAS DA CAMPANHA
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

        setIsApplyingGlobal(true);
        toast.loading(`Aplicando ${desc}% de desconto...`, { id: 'bulk-desc' });

        try {
            const res = await fetch('/api/admin/figures/bulk-campaign', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    figureIds: activeFigures.map(f => f.id), 
                    discount: desc 
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(`Desconto de ${desc}% aplicado em ${data.count} peças ativas!`, { id: 'bulk-desc' });
            setBulkDiscount('');
            fetchFigures();
        } catch (e: any) {
            toast.error(`Erro: ${e.message}`, { id: 'bulk-desc' });
        } finally {
            setIsApplyingGlobal(false);
        }
    };

    // 5. OPERAÇÕES EM LOTE PARA ITENS SELECIONADOS POR CHECKBOX
    const handleToggleSelect = (id: number) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAllFiltered = (filtered: CampaignFigure[]) => {
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(f => f.id));
        }
    };

    const handleApplySelectedBatchDiscount = async () => {
        if (!canEdit || selectedIds.length === 0) return;
        const desc = Number(selectedBatchDiscount);
        if (isNaN(desc) || desc <= 0 || desc > 100) {
            toast.error('Insira uma porcentagem válida entre 1 e 100.');
            return;
        }

        toast.loading(`Aplicando ${desc}% em ${selectedIds.length} peças selecionadas...`, { id: 'selected-desc' });

        try {
            const res = await fetch('/api/admin/figures/bulk-campaign', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ figureIds: selectedIds, discount: desc }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(`Desconto de ${desc}% aplicado em ${data.count} peças!`, { id: 'selected-desc' });
            setSelectedBatchDiscount('');
            setSelectedIds([]);
            fetchFigures();
        } catch (e: any) {
            toast.error(`Erro: ${e.message}`, { id: 'selected-desc' });
        }
    };

    const handleRemoveSelectedFromCampaign = async () => {
        if (!canEdit || selectedIds.length === 0) return;
        const confirm = window.confirm(`Deseja remover as ${selectedIds.length} peças selecionadas da campanha?`);
        if (!confirm) return;

        toast.loading(`Removendo ${selectedIds.length} peças da campanha...`, { id: 'selected-remove' });

        try {
            const res = await fetch('/api/admin/figures/bulk-campaign', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ figureIds: selectedIds }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(`${data.count} peças removidas da campanha!`, { id: 'selected-remove' });
            setSelectedIds([]);
            fetchFigures();
        } catch (e: any) {
            toast.error(`Erro: ${e.message}`, { id: 'selected-remove' });
        }
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

    const content = (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Header if not hidden */}
            {!hideHeader && (
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
                        className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 bg-[var(--card-bg)] hover:bg-purple-500/10 border border-[var(--card-border)] hover:border-purple-500/30 rounded-xl text-xs font-bold text-[var(--foreground)] transition-all active:scale-95 shadow-sm cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin text-purple-400' : ''} />
                        Atualizar Dados
                    </button>
                </div>
            )}

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
                                className={`flex items-center justify-center gap-1.5 py-2 px-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                    activeTab === 'series'
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                                }`}
                            >
                                <Tv size={12} /> Séries
                            </button>

                            <button
                                onClick={() => setActiveTab('studio')}
                                className={`flex items-center justify-center gap-1.5 py-2 px-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                    activeTab === 'studio'
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
                                }`}
                            >
                                <Building2 size={12} /> Estúdios
                            </button>

                            <button
                                onClick={() => setActiveTab('global')}
                                className={`flex items-center justify-center gap-1.5 py-2 px-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
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
                                        Desconto da Série (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={serieDiscount}
                                            onChange={(e) => setSerieDiscount(e.target.value)}
                                            placeholder="Ex: 15 (para 15% OFF)"
                                            className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] focus:border-purple-500 rounded-xl px-4 py-2.5 outline-none font-bold text-sm text-[var(--foreground)]"
                                        />
                                        <Percent size={16} className="absolute right-3.5 top-3 text-[var(--text-muted)]" />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleApplySerieDiscount}
                                        disabled={!canEdit || isApplyingSerie || !selectedSerieId || !serieDiscount}
                                        className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95 cursor-pointer"
                                    >
                                        {isApplyingSerie ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                        Aplicar na Série
                                    </button>

                                    <button
                                        onClick={handleClearSerieDiscount}
                                        disabled={!canEdit || isApplyingSerie || !selectedSerieId}
                                        title="Remover desconto de todas as figuras desta série"
                                        className="px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-all disabled:opacity-30 active:scale-95 cursor-pointer"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: Promoção por Estúdio */}
                        {activeTab === 'studio' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <p className="text-xs text-[var(--text-muted)]">
                                    Aplica ou remove o desconto em <strong className="text-purple-400">todas as peças</strong> de um estúdio específico de uma só vez.
                                </p>

                                <div>
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1.5">
                                        Selecione o Estúdio
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
                                        Desconto do Estúdio (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={studioDiscount}
                                            onChange={(e) => setStudioDiscount(e.target.value)}
                                            placeholder="Ex: 20 (para 20% OFF)"
                                            className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] focus:border-purple-500 rounded-xl px-4 py-2.5 outline-none font-bold text-sm text-[var(--foreground)]"
                                        />
                                        <Percent size={16} className="absolute right-3.5 top-3 text-[var(--text-muted)]" />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleApplyStudioDiscount}
                                        disabled={!canEdit || isApplyingStudio || !selectedStudioId || !studioDiscount}
                                        className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95 cursor-pointer"
                                    >
                                        {isApplyingStudio ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                        Aplicar no Estúdio
                                    </button>

                                    <button
                                        onClick={handleClearStudioDiscount}
                                        disabled={!canEdit || isApplyingStudio || !selectedStudioId}
                                        title="Remover desconto de todas as figuras deste estúdio"
                                        className="px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-all disabled:opacity-30 active:scale-95 cursor-pointer"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: Desconto Global & Controle Geral */}
                        {activeTab === 'global' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <p className="text-xs text-[var(--text-muted)]">
                                    Aplique descontos em <strong className="text-purple-400">todas as peças ativas</strong> da campanha ou ative o <strong className="text-amber-400">Modo Black Friday</strong> na loja inteira.
                                </p>

                                <div>
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-1.5">
                                        Porcentagem de Desconto (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={bulkDiscount}
                                            onChange={(e) => setBulkDiscount(e.target.value)}
                                            placeholder="Ex: 15 (para 15% OFF)"
                                            className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] focus:border-purple-500 rounded-xl px-4 py-2.5 outline-none font-bold text-sm text-[var(--foreground)]"
                                        />
                                        <Percent size={16} className="absolute right-3.5 top-3 text-[var(--text-muted)]" />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-1">
                                    <button
                                        onClick={handleApplyBulkDiscount}
                                        disabled={!canEdit || isApplyingGlobal || !bulkDiscount || stats.activeCount === 0}
                                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 active:scale-95 cursor-pointer"
                                    >
                                        {isApplyingGlobal ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                        Aplicar nas {stats.activeCount} Peças Ativas
                                    </button>

                                    <button
                                        onClick={handleApplyStorewideDiscount}
                                        disabled={!canEdit || isApplyingGlobal || !bulkDiscount}
                                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-40 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 active:scale-95 cursor-pointer"
                                    >
                                        {isApplyingGlobal ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                        Loja Toda (Modo Black Friday)
                                    </button>
                                </div>

                                {/* Timer de Fim de Promoção */}
                                <div className="pt-4 border-t border-[var(--card-border)] space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">
                                            <Clock size={12} className="text-purple-400" />
                                            Timer de Fim de Promoção
                                        </span>
                                        {activeTimerIso && (
                                            <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[9px] font-black uppercase text-purple-300">
                                                Ativo
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                                        Exibe um cronômetro regressivo na página de ofertas e pausa os descontos automaticamente ao zerar.
                                    </p>

                                    {/* Atalhos Rápidos */}
                                    <div className="grid grid-cols-3 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => applyTimerPreset('24h')}
                                            disabled={!canEdit || isSavingTimer}
                                            className="py-1.5 px-2 bg-[var(--input-bg)] hover:bg-purple-500/15 border border-[var(--card-border)] hover:border-purple-500/40 rounded-lg text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] transition-all cursor-pointer disabled:opacity-40"
                                        >
                                            +24 Horas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyTimerPreset('48h')}
                                            disabled={!canEdit || isSavingTimer}
                                            className="py-1.5 px-2 bg-[var(--input-bg)] hover:bg-purple-500/15 border border-[var(--card-border)] hover:border-purple-500/40 rounded-lg text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] transition-all cursor-pointer disabled:opacity-40"
                                        >
                                            +48 Horas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyTimerPreset('sunday')}
                                            disabled={!canEdit || isSavingTimer}
                                            className="py-1.5 px-2 bg-[var(--input-bg)] hover:bg-purple-500/15 border border-[var(--card-border)] hover:border-purple-500/40 rounded-lg text-[10px] font-black uppercase tracking-wider text-[var(--foreground)] transition-all cursor-pointer disabled:opacity-40"
                                        >
                                            Dom 23:59
                                        </button>
                                    </div>

                                    {/* Input Customizado */}
                                    <div className="flex gap-2">
                                        <input
                                            type="datetime-local"
                                            value={timerInput}
                                            onChange={(e) => setTimerInput(e.target.value)}
                                            disabled={!canEdit || isSavingTimer}
                                            className="flex-1 bg-[var(--input-bg)] border border-[var(--card-border)] focus:border-purple-500 rounded-xl px-3 py-2 text-xs font-bold text-[var(--foreground)] outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleSaveTimer()}
                                            disabled={!canEdit || isSavingTimer || !timerInput}
                                            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer"
                                        >
                                            {isSavingTimer ? <Loader2 size={14} className="animate-spin" /> : 'Salvar'}
                                        </button>
                                        {activeTimerIso && (
                                            <button
                                                type="button"
                                                onClick={() => handleSaveTimer(null)}
                                                disabled={!canEdit || isSavingTimer}
                                                title="Remover timer"
                                                className="px-2.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs transition-all shrink-0 cursor-pointer"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Pausar / Retomar / Reset Geral */}
                                <div className="pt-4 border-t border-[var(--card-border)] space-y-2.5">
                                    <span className="block text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">
                                        Controle Geral de Vitrine
                                    </span>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handleToggleAllCampaignStatus('pause-all')}
                                            disabled={!canEdit || stats.activeCount === 0}
                                            className="py-2.5 px-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-30 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                                        >
                                            <Power size={13} />
                                            Pausar Todas
                                        </button>

                                        <button
                                            onClick={() => handleToggleAllCampaignStatus('resume-all')}
                                            disabled={!canEdit || stats.inactiveCount === 0}
                                            className="py-2.5 px-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-30 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                                        >
                                            <CheckCircle2 size={13} />
                                            Reativar Todas
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleClearAllDiscounts}
                                        disabled={!canEdit || isClearingAll || stats.total === 0}
                                        className="w-full py-2.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-30 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                                    >
                                        {isClearingAll ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                                        Zerar Todos os Descontos da Loja
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add Single Figure Card */}
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2 text-[var(--foreground)]">
                            <Plus size={16} className="text-purple-400" />
                            Adicionar Peça Individual
                        </h3>

                        <div className="relative">
                            <Search className="absolute left-3.5 top-3 text-[var(--text-muted)]" size={16} />
                            <input
                                type="text"
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                                placeholder="Buscar no catálogo geral..."
                                className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 outline-none font-medium text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)]"
                            />
                            {isSearching && (
                                <Loader2 size={16} className="animate-spin absolute right-3.5 top-3 text-purple-400" />
                            )}
                        </div>

                        {/* Search Results Dropdown/List */}
                        {searchResults.length > 0 && (
                            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                {searchResults.map(f => (
                                    <div
                                        key={f.id}
                                        className="flex items-center justify-between p-2 rounded-xl bg-[var(--background)] hover:bg-purple-500/10 border border-[var(--card-border)] transition-all gap-2"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {f.imagem_url ? (
                                                <img src={f.imagem_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg bg-[var(--card-border)] shrink-0 flex items-center justify-center">
                                                    <Tag size={12} className="text-[var(--text-muted)]" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold truncate text-[var(--foreground)]">{f.nome}</p>
                                                <p className="text-[10px] text-[var(--text-muted)] truncate">{f.studios?.nome || f.serie || 'Sem estúdio'}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleSave(f, { is_campanha: true, is_campanha_active: true, desconto_campanha: 10 })}
                                            className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus size={12} />
                                            Incluir
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Interactive Campaign Figures List */}
                <div className="xl:col-span-8 space-y-4">
                    
                    {/* Filters Toolbar */}
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3.5 top-3 text-[var(--text-muted)]" size={16} />
                            <input
                                type="text"
                                value={panelSearch}
                                onChange={(e) => setPanelSearch(e.target.value)}
                                placeholder="Filtrar por nome, série ou estúdio..."
                                className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] focus:border-purple-500 rounded-xl pl-10 pr-4 py-2 outline-none font-medium text-xs text-[var(--foreground)]"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                            {/* Filter Studio */}
                            <select
                                value={filterStudio}
                                onChange={(e) => setFilterStudio(e.target.value)}
                                className="bg-[var(--input-bg)] border border-[var(--card-border)] focus:border-purple-500 rounded-xl px-3 py-2 outline-none text-xs font-bold text-[var(--foreground)]"
                            >
                                <option value="">Todos Estúdios</option>
                                {studios.map(s => (
                                    <option key={s.id} value={s.id}>{s.nome}</option>
                                ))}
                            </select>

                            {/* Filter Serie */}
                            <select
                                value={filterSerie}
                                onChange={(e) => setFilterSerie(e.target.value)}
                                className="bg-[var(--input-bg)] border border-[var(--card-border)] focus:border-purple-500 rounded-xl px-3 py-2 outline-none text-xs font-bold text-[var(--foreground)]"
                            >
                                <option value="">Todas Séries</option>
                                {seriesList.map(s => (
                                    <option key={s.id} value={s.id}>{s.nome}</option>
                                ))}
                            </select>

                            {/* Status Filter */}
                            <div className="flex bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl p-0.5">
                                <button
                                    onClick={() => setFilterStatus('all')}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        filterStatus === 'all' ? 'bg-purple-600 text-white' : 'text-[var(--text-muted)]'
                                    }`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setFilterStatus('active')}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        filterStatus === 'active' ? 'bg-green-600 text-white' : 'text-[var(--text-muted)]'
                                    }`}
                                >
                                    Ativos
                                </button>
                                <button
                                    onClick={() => setFilterStatus('inactive')}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        filterStatus === 'inactive' ? 'bg-orange-600 text-white' : 'text-[var(--text-muted)]'
                                    }`}
                                >
                                    Pausados
                                </button>
                            </div>

                            {/* Select All Filtered Button */}
                            {filteredCampaignFigures.length > 0 && (
                                <button
                                    onClick={() => handleSelectAllFiltered(filteredCampaignFigures)}
                                    title="Selecionar / Desmarcar todos os itens visíveis"
                                    className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                                        selectedIds.length > 0 && selectedIds.length === filteredCampaignFigures.length
                                            ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                                            : 'bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-muted)] hover:text-[var(--foreground)]'
                                    }`}
                                >
                                    {selectedIds.length > 0 && selectedIds.length === filteredCampaignFigures.length ? (
                                        <CheckSquare size={14} className="text-purple-400" />
                                    ) : (
                                        <Square size={14} />
                                    )}
                                    Todos ({filteredCampaignFigures.length})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Batch Action Bar for Selected Items */}
                    {selectedIds.length > 0 && (
                        <div className="bg-purple-950/30 border border-purple-500/40 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center gap-2.5">
                                <span className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-xs font-black">
                                    {selectedIds.length}
                                </span>
                                <span className="text-xs font-bold text-purple-200">
                                    {selectedIds.length === 1 ? 'peça selecionada' : 'peças selecionadas'}
                                </span>
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 underline ml-1 cursor-pointer"
                                >
                                    Limpar seleção
                                </button>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-32">
                                    <input
                                        type="number"
                                        value={selectedBatchDiscount}
                                        onChange={(e) => setSelectedBatchDiscount(e.target.value)}
                                        placeholder="Desc. %"
                                        className="w-full bg-[var(--input-bg)] border border-purple-500/30 focus:border-purple-500 rounded-xl pl-3 pr-7 py-1.5 outline-none text-xs font-bold text-[var(--foreground)]"
                                    />
                                    <Percent size={12} className="absolute right-2.5 top-2.5 text-[var(--text-muted)]" />
                                </div>

                                <button
                                    onClick={handleApplySelectedBatchDiscount}
                                    disabled={!canEdit || !selectedBatchDiscount}
                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                                >
                                    <Sparkles size={12} />
                                    Aplicar %
                                </button>

                                <button
                                    onClick={handleRemoveSelectedFromCampaign}
                                    disabled={!canEdit}
                                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                                >
                                    <Trash2 size={12} />
                                    Remover ({selectedIds.length})
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Figures Grid/List */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl">
                            <Loader2 className="animate-spin text-purple-400 w-8 h-8 mb-3" />
                            <p className="text-xs font-bold text-[var(--text-muted)]">Carregando catálogo promocional...</p>
                        </div>
                    ) : filteredCampaignFigures.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl text-center">
                            <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400 mb-3">
                                <Tag size={28} />
                            </div>
                            <h4 className="font-bold text-sm text-[var(--foreground)]">Nenhuma peça encontrada</h4>
                            <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1">
                                {campaignFigures.length === 0
                                    ? 'Adicione figuras à campanha usando a busca individual ou aplicando um desconto por Estúdio ou Série.'
                                    : 'Nenhum resultado corresponde aos filtros selecionados.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[750px] overflow-y-auto pr-1">
                            {filteredCampaignFigures.map(f => {
                                const isSelected = selectedIds.includes(f.id);
                                return (
                                <div
                                    key={f.id}
                                    className={`bg-[var(--card-bg)] border rounded-2xl p-3.5 transition-all flex gap-3 relative overflow-hidden ${
                                        isSelected
                                            ? 'border-purple-500 ring-1 ring-purple-500/40 bg-purple-500/5'
                                            : f.is_campanha_active 
                                                ? 'border-purple-500/30 hover:border-purple-500/50 shadow-sm' 
                                                : 'border-[var(--card-border)] opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    {/* Checkbox + Thumbnail */}
                                    <div
                                        onClick={() => handleToggleSelect(f.id)}
                                        className="w-16 h-16 rounded-xl bg-[var(--input-bg)] border border-[var(--card-border)] overflow-hidden shrink-0 relative cursor-pointer group"
                                        title="Clique para selecionar em lote"
                                    >
                                        {f.imagem_url ? (
                                            <img src={f.imagem_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Tag size={16} className="text-[var(--text-muted)]" />
                                            </div>
                                        )}
                                        {f.is_campanha_active && (
                                            <div className="absolute top-1 left-1 bg-green-500 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--card-bg)]" title="Ativo na Vitrine" />
                                        )}
                                        <div className={`absolute bottom-1 right-1 p-0.5 rounded-md transition-all ${
                                            isSelected
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-black/60 text-white/70 opacity-0 group-hover:opacity-100'
                                        }`}>
                                            {isSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                                        </div>
                                    </div>

                                    {/* Info & Controls */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-xs truncate text-[var(--foreground)]" title={f.nome}>
                                                    {f.nome}
                                                </h4>
                                                <p className="text-[10px] text-[var(--text-muted)] truncate">
                                                    {f.studios?.nome || f.serie || 'Sem categoria'}
                                                </p>
                                            </div>

                                            {/* Action icons */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={() => handleToggleSelect(f.id)}
                                                    title={isSelected ? 'Desmarcar peça' : 'Selecionar peça em lote'}
                                                    className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-purple-600 text-white'
                                                            : 'bg-zinc-500/10 text-zinc-400 hover:bg-purple-500/20 hover:text-purple-400'
                                                    }`}
                                                >
                                                    {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                                </button>

                                                <button
                                                    onClick={() => handleSave(f, { is_campanha_active: !f.is_campanha_active })}
                                                    disabled={!canEdit || savingId === f.id}
                                                    title={f.is_campanha_active ? 'Pausar promoção' : 'Ativar promoção'}
                                                    className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                                                        f.is_campanha_active
                                                            ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                                            : 'bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20'
                                                    }`}
                                                >
                                                    <CheckCircle2 size={14} />
                                                </button>

                                                <button
                                                    onClick={() => handleSave(f, { is_campanha: false, is_campanha_active: false, desconto_campanha: 0, preco_fixo_campanha: 0 })}
                                                    disabled={!canEdit || savingId === f.id}
                                                    title="Remover da campanha"
                                                    className="p-1.5 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Inputs Row */}
                                        <div className="grid grid-cols-2 gap-2 mt-2">
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
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    if (hideHeader) {
        return content;
    }

    return (
        <div className="w-full text-[var(--foreground)] space-y-8">
            {content}
        </div>
    );
}
