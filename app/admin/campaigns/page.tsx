'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Flame, Loader2, Search, Percent, AlertCircle, Plus, Trash2, Tag } from 'lucide-react';
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

    const fetchFigures = useCallback(async () => {
        try {
            setLoading(true);
            // Busca apenas peças que já estão na campanha
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
    }, [fetchFigures, fetchStudios]);

    const campaignFigures = useMemo(() => allFigures.filter(f => f.is_campanha || f.is_campanha_active || f.preco_fixo_campanha > 0 || f.desconto_campanha > 0), [allFigures]);

    // Busca Dinâmica no Servidor (Debounced)
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const delayDebounceFn = setTimeout(async () => {
            if (globalSearch.length >= 2) {
                setIsSearching(true);
                try {
                    // Adicionado limit maior (20) e signal para abortar se a busca mudar
                    const res = await fetch(`/api/admin/figures?search=${encodeURIComponent(globalSearch)}&limit=20`, { signal });
                    if (res.ok) {
                        const data = await res.json();
                        // Filtrar para não mostrar o que já está na campanha (visível no painel)
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
                setIsSearching(false); // Garante que destrave se limpar o campo
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
            // Regra de Ouro: Se a campanha for removida, zera os valores promocionais
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

            // Gerencia o estado local allFigures (adição/remoção/update)
            setAllFigures(prev => {
                const exists = prev.find(item => item.id === f.id);
                if (exists) {
                    // Se foi removido da campanha, tira da lista
                    if (updates.is_campanha === false) {
                        return prev.filter(item => item.id !== f.id);
                    }
                    // Se apenas atualizou valores, mapeia
                    return prev.map(item => item.id === f.id ? { ...item, ...updates } : item);
                }
                // Se não existia e foi adicionado, coloca na lista
                if (updates.is_campanha === true) {
                    return [...prev, { ...f, ...updates }];
                }
                return prev;
            });

            // Limpa o valor local temporário para forçar o re-render com o valor salvo
            setLocalValues(prev => {
                const next = { ...prev };
                delete next[f.id];
                return next;
            });

            if (updates.is_campanha === true) {
                toast.success(`${f.nome} adicionado à campanha!`);
                setGlobalSearch(''); // Limpa a busca após adicionar
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

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
                    <Flame size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-purple-500">Gestor de Campanhas</h1>
                    <p className="text-[var(--text-muted)] text-sm font-medium">Controle as peças em oferta de forma centralizada.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* LADO ESQUERDO: Controles Globais */}
                <div className="xl:col-span-1 flex flex-col gap-6">
                    {/* Desconto em Massa */}
                    <div className="bg-[var(--card-bg)] border border-purple-500/20 rounded-2xl p-6 shadow-lg order-1">
                        <h3 className="font-black text-lg flex items-center gap-2 mb-2">
                            <Percent size={20} className="text-purple-500" />
                            Desconto em Massa
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] mb-4">Aplica % apenas nas peças que estão com o status "Em Destaque" ativado.</p>

                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    placeholder="Ex: 15"
                                    value={bulkDiscount}
                                    onChange={(e) => setBulkDiscount(e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-purple-500/30 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-all font-black text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-purple-500 opacity-50">%</span>
                            </div>
                            <button
                                onClick={handleApplyBulkDiscount}
                                disabled={!canEdit}
                                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>

                    {/* Promoção por Estúdio */}
                    <div className="bg-[var(--card-bg)] border border-purple-500/20 rounded-2xl p-6 shadow-lg order-2 animate-in fade-in duration-300">
                        <h3 className="font-black text-lg flex items-center gap-2 mb-2">
                            <Tag size={20} className="text-purple-500" />
                            Promoção por Estúdio
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] mb-4">Aplica ou remove desconto de todas as peças de um estúdio selecionado.</p>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-2">Selecione o Estúdio</label>
                                <select
                                    value={selectedStudioId}
                                    onChange={(e) => setSelectedStudioId(e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-all font-bold text-sm text-[var(--foreground)]"
                                >
                                    <option value="">-- Selecione --</option>
                                    {studios.map(s => (
                                        <option key={s.id} value={s.id}>{s.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] mb-2">Desconto (%)</label>
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

                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <button
                                    onClick={handleApplyStudioDiscount}
                                    disabled={!canEdit || !selectedStudioId || isApplyingStudio}
                                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                                >
                                    Aplicar
                                </button>
                                <button
                                    onClick={handleClearStudioDiscount}
                                    disabled={!canEdit || !selectedStudioId || isApplyingStudio}
                                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500 hover:text-red-400 text-zinc-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                                >
                                    Limpar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Adicionar à Campanha */}
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 shadow-sm order-3">
                        <h2 className="text-xl font-black mb-2 flex items-center gap-2">
                            <Plus size={20} className="text-purple-500" />
                            Adicionar à Campanha
                        </h2>
                        <p className="text-sm text-[var(--text-muted)] mb-6">Busque peças do catálogo para inserir na gestão promocional.</p>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar no catálogo inteiro..."
                                value={globalSearch}
                                onChange={e => setGlobalSearch(e.target.value)}
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl pl-10 pr-4 py-3 outline-none focus:border-purple-500 transition-all font-medium"
                            />
                        </div>

                        {/* Resultados da Busca */}
                        {globalSearch && (
                            <div className="space-y-3">
                                {isSearching ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="animate-spin text-purple-500" size={24} />
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(f => (
                                        <div key={f.id} className="flex items-center gap-3 p-3 bg-[var(--background)] border border-[var(--card-border)] rounded-xl">
                                            <img src={f.imagem_url || '/icon.png'} className="w-12 h-12 rounded object-cover border border-white/5" alt={f.nome} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate" title={f.nome}>{f.nome}</p>
                                            </div>
                                            <button
                                                onClick={() => handleSave(f, { is_campanha: true })}
                                                disabled={!canEdit || savingId === f.id}
                                                className="p-2 text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                title="Adicionar à Campanha"
                                            >
                                                {savingId === f.id ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
                                            </button>
                                        </div>
                                    ))
                                ) : globalSearch.length >= 2 ? (
                                    <p className="text-sm text-[var(--text-muted)] text-center py-4 italic">Nenhuma peça nova encontrada com esse nome.</p>
                                ) : (
                                    <p className="text-sm text-[var(--text-muted)] text-center py-4 italic">Digite pelo menos 2 caracteres para buscar...</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* LADO DIREITO: Peças na Campanha */}
                <div className="xl:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black flex items-center gap-2">
                            <Tag className="text-purple-500" size={24} />
                            Painel de Ofertas <span className="bg-purple-500/20 text-purple-500 px-3 py-1 rounded-full text-sm font-black">{campaignFigures.length}</span>
                        </h2>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="animate-spin text-purple-500" size={32} />
                        </div>
                    ) : campaignFigures.length === 0 ? (
                        <div className="bg-[var(--card-bg)] border border-dashed border-[var(--card-border)] rounded-2xl p-16 text-center text-[var(--text-muted)] flex flex-col items-center gap-4">
                            <AlertCircle size={48} className="opacity-20" />
                            <p className="font-medium text-lg">Nenhuma peça adicionada à campanha.</p>
                            <p className="text-sm opacity-60">Use a busca ao lado para puxar peças do catálogo.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {campaignFigures.map(f => (
                                <div key={f.id} className={`bg-[var(--card-bg)] border ${f.is_campanha_active ? 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'border-[var(--card-border)] opacity-80'} rounded-xl p-4 flex gap-4 transition-all duration-300 relative group`}>

                                    {/* Botão de Remover */}
                                    <button
                                        onClick={() => handleSave(f, { is_campanha: false, is_campanha_active: false })}
                                        disabled={!canEdit || savingId === f.id}
                                        className="absolute top-2 right-2 p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remover da Campanha"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    <img src={f.imagem_url || '/icon.png'} alt={f.nome} className="w-20 h-20 object-cover rounded-lg bg-zinc-900 shrink-0 border border-[var(--card-border)]" />

                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <h4 className="font-bold text-sm truncate pr-6" title={f.nome}>{f.nome}</h4>

                                        <div className="flex flex-col gap-2 mt-2">
                                            <div className="flex gap-6">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Na Oferta</span>
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={f.is_campanha}
                                                            disabled={!canEdit || savingId === f.id}
                                                            onChange={(e) => handleSave(f, { is_campanha: e.target.checked })}
                                                        />
                                                        <div className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500 disabled:opacity-50"></div>
                                                    </div>
                                                </label>

                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Disponível</span>
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={f.is_campanha_active}
                                                            disabled={!canEdit || savingId === f.id}
                                                            onChange={(e) => handleSave(f, { is_campanha_active: e.target.checked })}
                                                        />
                                                        <div className="w-8 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500 disabled:opacity-50"></div>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="flex items-center gap-2 bg-[var(--input-bg)] p-1.5 rounded-lg border border-[var(--input-border)] flex-1">
                                                <span className="text-[10px] font-black uppercase text-[var(--text-muted)] pl-1 whitespace-nowrap">Desc. %</span>
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
                                                    className="w-full flex-1 bg-transparent text-right text-sm font-black text-purple-400 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-purple-900/50"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 bg-[var(--input-bg)] p-1.5 rounded-lg border border-[var(--input-border)] flex-1" title={f.custo_producao ? `Custo de Produção (Preço sugerido): R$ ${f.custo_producao.toFixed(2)}` : undefined}>
                                                <span className="text-[10px] font-black uppercase text-[var(--text-muted)] pl-1 whitespace-nowrap">Fixo R$</span>
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
                                                    className="w-full flex-1 bg-transparent text-right text-sm font-black text-green-400 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-green-900/50"
                                                />
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
