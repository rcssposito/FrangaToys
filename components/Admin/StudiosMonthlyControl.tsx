'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
    Calendar, 
    DollarSign, 
    Check, 
    X, 
    Loader2, 
    RotateCw, 
    Building2, 
    Search, 
    TrendingUp, 
    AlertCircle, 
    ChevronRight,
    Edit3,
    Crown,
    ArrowDownRight,
    Pause
} from 'lucide-react';

interface MonthData {
    mes: number;
    ativo: boolean;
    valor: number;
    tier_tipo?: string;
    observacao?: string | null;
    registrado: boolean;
}

interface StudioMonthly {
    id: number;
    nome: string;
    custo_mensal_base: number;
    ativo_atual: boolean;
    logo_url?: string;
    total_ano: number;
    meses_ativos_count: number;
    meses: MonthData[];
}

interface MensalidadesResponse {
    ano: number;
    totais_por_mes: number[];
    total_geral_ano: number;
    studios: StudioMonthly[];
}

export default function StudiosMonthlyControl() {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [data, setData] = useState<MensalidadesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingKey, setUpdatingKey] = useState<string | null>(null); // "studioId-mes"
    const [search, setSearch] = useState('');
    const [filterOnlyActive, setFilterOnlyActive] = useState(false);
    
    // Modal para edição de valor personalizado e alteração de tier
    const [editingCell, setEditingCell] = useState<{
        studioId: number;
        studioNome: string;
        custoBase: number;
        mes: number;
        valor: number;
        ativo: boolean;
        tier_tipo: string;
        observacao: string;
    } | null>(null);

    const monthNames = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    const currentMonthIndex = new Date().getMonth(); // 0 a 11
    const currentYear = new Date().getFullYear();

    const fetchMensalidades = async (anoToFetch = selectedYear) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/studios/mensalidades?ano=${anoToFetch}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Erro ao carregar controle de mensalidades');
            const json: MensalidadesResponse = await res.json();
            setData(json);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Falha ao buscar dados');
        } finally {
            setLoading(false);
        }
    };

    const [isSyncingPatreon, setIsSyncingPatreon] = useState(false);

    const handleSyncPatreonCurrentMonth = async () => {
        setIsSyncingPatreon(true);
        try {
            const res = await fetch('/api/admin/integrations/patreon/licenses', { cache: 'no-store' });
            if (!res.ok) throw new Error('Falha ao consultar Patreon');
            const patreonJson = await res.json();
            
            const activeMemberships = (patreonJson.memberships || []).filter(
                (m: any) => m.patronStatus === 'active_patron' && m.matchedStudioId
            );

            if (activeMemberships.length === 0) {
                toast.info('Nenhuma assinatura ativa vinculada encontrada no Patreon.');
                return;
            }

            const currentMes = new Date().getMonth() + 1; // 1-12
            const currentAno = new Date().getFullYear();

            const updates = activeMemberships.map((m: any) => ({
                studio_id: m.matchedStudioId,
                ano: currentAno,
                mes: currentMes,
                ativo: true,
                valor_pago: (m.amountBRL && m.amountBRL > 0) ? m.amountBRL : undefined,
                tier_tipo: m.isMerchantTier ? 'merchant' : 'reduzido',
                observacao: m.tiers?.[0] ? `Tier Patreon: ${m.tiers[0]}` : null
            }));

            const saveRes = await fetch('/api/admin/studios/mensalidades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
            });

            if (!saveRes.ok) throw new Error('Falha ao salvar sincronização');
            toast.success(`${activeMemberships.length} estúdios ativos sincronizados do Patreon para o mês atual!`);
            fetchMensalidades(selectedYear);
        } catch (err: any) {
            toast.error(err.message || 'Erro na sincronização com Patreon');
        } finally {
            setIsSyncingPatreon(false);
        }
    };

    useEffect(() => {
        fetchMensalidades(selectedYear);
    }, [selectedYear]);

    // Alternar status ativo/inativo de um estúdio em um mês com Optimistic Update
    const toggleStudioMonth = async (studioId: number, mes: number, currentAtivo: boolean, currentValue: number, defaultCost: number) => {
        const nextAtivo = !currentAtivo;
        const nextValue = nextAtivo ? (currentValue > 0 ? currentValue : defaultCost) : 0;
        const key = `${studioId}-${mes}`;

        setUpdatingKey(key);

        // Optimistic update local
        setData(prev => {
            if (!prev) return prev;
            const updatedStudios = prev.studios.map(st => {
                if (st.id !== studioId) return st;
                const updatedMeses = st.meses.map(m => {
                    if (m.mes !== mes) return m;
                    return { ...m, ativo: nextAtivo, valor: nextValue, registrado: true };
                });
                const totalAno = updatedMeses.reduce((acc, m) => acc + (m.ativo ? m.valor : 0), 0);
                const mesesAtivosCount = updatedMeses.filter(m => m.ativo).length;
                return { ...st, meses: updatedMeses, total_ano: totalAno, meses_ativos_count: mesesAtivosCount };
            });

            // Recalcular totais por mês
            const newTotaisPorMes = Array(12).fill(0);
            let newTotalGeral = 0;
            updatedStudios.forEach(st => {
                st.meses.forEach(m => {
                    if (m.ativo) {
                        newTotaisPorMes[m.mes - 1] += m.valor;
                        newTotalGeral += m.valor;
                    }
                });
            });

            return {
                ...prev,
                totais_por_mes: newTotaisPorMes,
                total_geral_ano: newTotalGeral,
                studios: updatedStudios
            };
        });

        try {
            const res = await fetch('/api/admin/studios/mensalidades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studio_id: studioId,
                    ano: selectedYear,
                    mes,
                    ativo: nextAtivo,
                    valor_pago: nextValue
                })
            });

            if (!res.ok) throw new Error('Erro ao salvar alteração');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao sincronizar alteração');
            // Reverter em caso de erro
            fetchMensalidades(selectedYear);
        } finally {
            setUpdatingKey(null);
        }
    };

    // Salvar valor personalizado / alteração de tier
    const handleSaveCustomValue = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!editingCell) return;

        const isAtivo = editingCell.ativo && editingCell.valor > 0;
        const tierTipo = editingCell.tier_tipo || 
            (!isAtivo ? 'inativo' : (editingCell.valor < editingCell.custoBase && editingCell.custoBase > 0) ? 'reduzido' : 'merchant');

        try {
            const res = await fetch('/api/admin/studios/mensalidades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studio_id: editingCell.studioId,
                    ano: selectedYear,
                    mes: editingCell.mes,
                    ativo: isAtivo,
                    valor_pago: editingCell.valor,
                    tier_tipo: tierTipo,
                    observacao: editingCell.observacao?.trim() || null
                })
            });

            if (!res.ok) throw new Error('Erro ao salvar valor');
            toast.success(`Mensalidade de ${monthNames[editingCell.mes - 1]} atualizada!`);
            setEditingCell(null);
            fetchMensalidades(selectedYear);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao atualizar valor');
        }
    };

    const filteredStudios = (data?.studios || []).filter(st => {
        if (filterOnlyActive && !st.ativo_atual && st.meses_ativos_count === 0) return false;
        if (!search.trim()) return true;
        return st.nome.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Barra Superior de Controles e Resumo */}
            <div className="bg-zinc-950/70 border border-zinc-900 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900/80 pb-5">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <Calendar className="text-blue-500" size={22} />
                            <h2 className="text-xl font-black tracking-tight text-white">
                                Controle de Estúdios Ativos & Mensalidades
                            </h2>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                            Marque mês a mês quais estúdios você pagou/manteve ativos para apuração exata dos gastos e KPIs anuais.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Seletor de Ano */}
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                            {[2024, 2025, 2026, 2027].map(ano => (
                                <button
                                    key={ano}
                                    onClick={() => setSelectedYear(ano)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                        selectedYear === ano
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                            : 'text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    {ano}
                                </button>
                            ))}
                        </div>

                        {/* Botão Sincronizar Mês com Patreon */}
                        <button
                            onClick={handleSyncPatreonCurrentMonth}
                            disabled={isSyncingPatreon || loading}
                            className="px-3.5 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                            title="Consultar assinaturas ativas na API do Patreon para o mês atual"
                        >
                            {isSyncingPatreon ? (
                                <Loader2 size={13} className="animate-spin text-orange-400" />
                            ) : (
                                <Crown size={13} className="text-orange-400" />
                            )}
                            <span className="hidden sm:inline">Sincronizar Mês (Patreon)</span>
                        </button>

                        <button
                            onClick={() => fetchMensalidades()}
                            disabled={loading}
                            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                            title="Recarregar dados"
                        >
                            <RotateCw size={15} className={loading ? 'animate-spin text-blue-400' : ''} />
                        </button>
                    </div>
                </div>

                {/* Cards de Resumo Anual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
                            Gasto Total em {selectedYear}
                        </span>
                        <div className="text-2xl font-black text-white">
                            R$ {(data?.total_geral_ano || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-zinc-400 mt-1 block">
                            Soma das assinaturas pagas no ano
                        </span>
                    </div>

                    <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
                            Média Mensal ({selectedYear})
                        </span>
                        <div className="text-2xl font-black text-blue-400">
                            R$ {((data?.total_geral_ano || 0) / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-zinc-400 mt-1 block">
                            Custo médio distribuído em 12 meses
                        </span>
                    </div>

                    <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
                            Mês Vigente ({monthNames[currentMonthIndex]}/{currentYear})
                        </span>
                        <div className="text-2xl font-black text-emerald-400">
                            R$ {(data?.totais_por_mes?.[currentMonthIndex] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-zinc-400 mt-1 block">
                            Compromisso financeiro deste mês
                        </span>
                    </div>

                    <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
                            Estúdios Ativos no Acervo
                        </span>
                        <div className="text-2xl font-black text-amber-400">
                            {(data?.studios || []).filter(s => s.ativo_atual).length} estúdios
                        </div>
                        <span className="text-[10px] text-zinc-400 mt-1 block">
                            {(data?.studios || []).filter(s => s.meses_ativos_count > 0).length} tiveram mensalidade no ano
                        </span>
                    </div>
                </div>

                {/* Linha dos 12 Meses com Totais */}
                <div className="pt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">
                        Desembolso Mês a Mês ({selectedYear})
                    </span>
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                        {monthNames.map((nomeMes, idx) => {
                            const isCurrent = selectedYear === currentYear && idx === currentMonthIndex;
                            const mesTotal = data?.totais_por_mes?.[idx] || 0;
                            return (
                                <div
                                    key={idx}
                                    className={`p-2.5 rounded-xl border text-center transition-all ${
                                        isCurrent
                                            ? 'bg-blue-600/10 border-blue-500/50 shadow-sm shadow-blue-500/10'
                                            : mesTotal > 0
                                            ? 'bg-zinc-900/70 border-zinc-800'
                                            : 'bg-zinc-950/40 border-zinc-900 text-zinc-600'
                                    }`}
                                >
                                    <div className="text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1">
                                        <span className={isCurrent ? 'text-blue-400' : 'text-zinc-400'}>{nomeMes}</span>
                                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                                    </div>
                                    <div className={`text-xs font-black mt-1 ${mesTotal > 0 ? (isCurrent ? 'text-blue-300' : 'text-zinc-200') : 'text-zinc-600'}`}>
                                        R$ {mesTotal > 0 ? mesTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Filtros e Busca de Estúdios */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Filtrar estúdio..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-zinc-950/70 border border-zinc-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500/50"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setFilterOnlyActive(!filterOnlyActive)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            filterOnlyActive
                                ? 'bg-blue-600 text-white border-blue-500'
                                : 'bg-zinc-950/70 text-zinc-400 border-zinc-850 hover:text-white'
                        }`}
                    >
                        {filterOnlyActive ? 'Mostrando Apenas Ativos' : 'Mostrar Todos os Estúdios'}
                    </button>
                </div>
            </div>

            {/* Matriz Interativa de Estúdios x 12 Meses */}
            {loading ? (
                <div className="p-24 flex justify-center items-center gap-3 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                    <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
                    Carregando matriz de mensalidades...
                </div>
            ) : (
                <div className="bg-zinc-950/80 border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-zinc-900/90 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-850">
                                <tr>
                                    <th className="py-4 px-5 min-w-[200px]">Estúdio</th>
                                    <th className="py-4 px-3 text-right">Custo Base</th>
                                    {monthNames.map((m, idx) => (
                                        <th key={idx} className="py-4 px-2 text-center min-w-[58px]">
                                            {m}
                                        </th>
                                    ))}
                                    <th className="py-4 px-4 text-center">Meses</th>
                                    <th className="py-4 px-5 text-right">Total {selectedYear}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900/80">
                                {filteredStudios.map(st => {
                                    return (
                                        <tr key={st.id} className="hover:bg-zinc-900/40 transition-colors group">
                                            {/* Nome e Status */}
                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                                                        <Building2 size={14} />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-sm text-white flex items-center gap-2">
                                                            {st.nome}
                                                            {st.custo_mensal_base === 0 && (
                                                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-bold">
                                                                    Sem Custo
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${st.ativo_atual ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                                            <span>{st.ativo_atual ? 'Ativo no Acervo' : 'Inativo no Acervo'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Custo Base */}
                                            <td className="py-3.5 px-3 text-right font-mono text-zinc-400 font-bold">
                                                R$ {st.custo_mensal_base.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                            </td>

                                            {/* 12 Células de Meses (Toggles Interativos com Suporte a Tier Reduzido) */}
                                            {st.meses.map(m => {
                                                const key = `${st.id}-${m.mes}`;
                                                const isUpdating = updatingKey === key;
                                                const isZeroCost = st.custo_mensal_base === 0;
                                                const isReduced = m.ativo && !isZeroCost && (m.tier_tipo === 'reduzido' || (m.valor > 0 && m.valor < st.custo_mensal_base));

                                                return (
                                                    <td key={m.mes} className="py-3 px-1.5 text-center">
                                                        <button
                                                            type="button"
                                                            disabled={isUpdating}
                                                            onClick={() => {
                                                                if (!m.ativo) {
                                                                    // Inativo: 1-clique ativa imediatamente no padrão
                                                                    toggleStudioMonth(st.id, m.mes, false, 0, st.custo_mensal_base);
                                                                } else {
                                                                    // Já ativo: abre modal para mudar de tier, alterar valor ou desativar
                                                                    setEditingCell({
                                                                        studioId: st.id,
                                                                        studioNome: st.nome,
                                                                        custoBase: st.custo_mensal_base,
                                                                        mes: m.mes,
                                                                        valor: m.valor,
                                                                        ativo: m.ativo,
                                                                        tier_tipo: m.tier_tipo || (isReduced ? 'reduzido' : 'merchant'),
                                                                        observacao: m.observacao || ''
                                                                    });
                                                                }
                                                            }}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                setEditingCell({
                                                                    studioId: st.id,
                                                                    studioNome: st.nome,
                                                                    custoBase: st.custo_mensal_base,
                                                                    mes: m.mes,
                                                                    valor: m.valor > 0 ? m.valor : st.custo_mensal_base,
                                                                    ativo: m.ativo,
                                                                    tier_tipo: m.tier_tipo || (isReduced ? 'reduzido' : 'merchant'),
                                                                    observacao: m.observacao || ''
                                                                });
                                                            }}
                                                            className={`w-12 h-8 rounded-lg text-[10px] font-black transition-all flex flex-col items-center justify-center mx-auto border cursor-pointer active:scale-95 group relative ${
                                                                m.ativo
                                                                    ? isZeroCost
                                                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 shadow-sm'
                                                                        : isReduced
                                                                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 hover:bg-amber-500/30 shadow-sm shadow-amber-500/15'
                                                                            : 'bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30 shadow-sm'
                                                                    : 'bg-zinc-950/40 border-zinc-900 text-zinc-650 hover:border-zinc-800 hover:text-zinc-500'
                                                            }`}
                                                            title={
                                                                m.ativo
                                                                    ? isReduced
                                                                        ? `Tier Reduzido: R$ ${m.valor.toFixed(2)}${m.observacao ? ` (${m.observacao})` : ''} - Clique para alterar tier/valor`
                                                                        : isZeroCost
                                                                            ? `Sob Encomenda / Custo Zero - Clique para ajustar`
                                                                            : `Tier Comercial: R$ ${m.valor.toFixed(2)}${m.observacao ? ` (${m.observacao})` : ''} - Clique para alterar tier/valor`
                                                                    : `Inativo em ${monthNames[m.mes - 1]} - Clique para ativar (ou botão direito para editar)`
                                                            }
                                                        >
                                                            {isUpdating ? (
                                                                <Loader2 size={11} className="animate-spin text-blue-400" />
                                                            ) : m.ativo ? (
                                                                <span className="flex items-center gap-0.5">
                                                                    {isReduced && <ArrowDownRight size={10} className="text-amber-400" />}
                                                                    <span>{m.valor > 0 ? `${m.valor.toFixed(0)}` : 'Ativo'}</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-zinc-700">-</span>
                                                            )}
                                                        </button>
                                                    </td>
                                                );
                                            })}

                                            {/* Resumo: Qtd de Meses Ativos */}
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                                    st.meses_ativos_count > 0 
                                                        ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' 
                                                        : 'text-zinc-650'
                                                }`}>
                                                    {st.meses_ativos_count}/12 m
                                                </span>
                                            </td>

                                            {/* Resumo: Total Gasto no Ano */}
                                            <td className="py-3.5 px-5 text-right font-mono font-black text-sm">
                                                <span className={st.total_ano > 0 ? 'text-white' : 'text-zinc-600'}>
                                                    R$ {st.total_ano.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Edição de Valor e Troca de Tier */}
            {editingCell && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5">
                        <div className="flex justify-between items-start border-b border-zinc-900 pb-4">
                            <div>
                                <h3 className="font-black text-base text-white flex items-center gap-2">
                                    <Edit3 size={16} className="text-blue-400" />
                                    {editingCell.studioNome}
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                                    Mês: <span className="text-white font-bold">{monthNames[editingCell.mes - 1]} de {selectedYear}</span>
                                    {editingCell.custoBase > 0 && (
                                        <span className="text-zinc-500 ml-2">(Padrão: R$ {editingCell.custoBase.toFixed(2)})</span>
                                    )}
                                </p>
                            </div>
                            <button 
                                onClick={() => setEditingCell(null)} 
                                className="p-1 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Atalhos Rápidos de Seleção de Tier */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
                                Escolha Rápida de Tier / Status
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {/* Botão Tier Comercial */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingCell({
                                            ...editingCell,
                                            ativo: true,
                                            valor: editingCell.custoBase,
                                            tier_tipo: 'merchant',
                                            observacao: 'Tier Comercial Padrão'
                                        });
                                    }}
                                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                        editingCell.ativo && editingCell.valor >= editingCell.custoBase && editingCell.valor > 0
                                            ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-2 ring-blue-500/20'
                                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between w-full mb-1">
                                        <span className="text-xs font-black">Comercial</span>
                                        <Crown size={12} className="text-blue-400" />
                                    </div>
                                    <span className="text-sm font-black text-white font-mono">
                                        R$ {editingCell.custoBase.toFixed(0)}
                                    </span>
                                    <span className="text-[9px] text-zinc-500 mt-1">Tier cheio</span>
                                </button>

                                {/* Botão Tier Reduzido / Pessoal */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const reducedDefault = Math.round(editingCell.custoBase * 0.35) || 50;
                                        const newVal = (editingCell.valor > 0 && editingCell.valor < editingCell.custoBase) ? editingCell.valor : reducedDefault;
                                        setEditingCell({
                                            ...editingCell,
                                            ativo: true,
                                            valor: newVal,
                                            tier_tipo: 'reduzido',
                                            observacao: 'Tier Reduzido / Pessoal'
                                        });
                                    }}
                                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                        editingCell.ativo && (editingCell.tier_tipo === 'reduzido' || (editingCell.valor < editingCell.custoBase && editingCell.valor > 0))
                                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/20'
                                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between w-full mb-1">
                                        <span className="text-xs font-black">Reduzido</span>
                                        <ArrowDownRight size={12} className="text-amber-400" />
                                    </div>
                                    <span className="text-sm font-black text-amber-300 font-mono">
                                        {editingCell.valor < editingCell.custoBase && editingCell.valor > 0 ? `R$ ${editingCell.valor.toFixed(0)}` : 'Menor'}
                                    </span>
                                    <span className="text-[9px] text-zinc-500 mt-1">Apoio menor</span>
                                </button>

                                {/* Botão Inativo / Pausado */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingCell({
                                            ...editingCell,
                                            ativo: false,
                                            valor: 0,
                                            tier_tipo: 'inativo',
                                            observacao: 'Pausado neste mês'
                                        });
                                    }}
                                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                        !editingCell.ativo || editingCell.valor === 0
                                            ? 'bg-red-500/15 border-red-500/60 text-red-300 ring-2 ring-red-500/20'
                                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between w-full mb-1">
                                        <span className="text-xs font-black">Pausado</span>
                                        <Pause size={12} className="text-red-400" />
                                    </div>
                                    <span className="text-sm font-black text-zinc-400 font-mono">
                                        R$ 0
                                    </span>
                                    <span className="text-[9px] text-zinc-500 mt-1">Sem gasto</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSaveCustomValue} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                                    Valor Pago neste Mês (R$)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xs">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editingCell.valor}
                                        onChange={e => {
                                            const v = parseFloat(e.target.value) || 0;
                                            setEditingCell({ 
                                                ...editingCell, 
                                                valor: v,
                                                ativo: v > 0,
                                                tier_tipo: (v > 0 && v < editingCell.custoBase) ? 'reduzido' : (v >= editingCell.custoBase) ? 'merchant' : 'inativo'
                                            });
                                        }}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-sm font-mono font-bold text-white outline-none focus:border-blue-500 transition-all shadow-inner"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                                    Motivo / Anotação (Opcional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Mudei para tier de $5, apoio pessoal, etc."
                                    value={editingCell.observacao}
                                    onChange={e => setEditingCell({ ...editingCell, observacao: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5 text-xs font-medium text-zinc-200 outline-none focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div className="flex justify-between items-center gap-2 pt-3 border-t border-zinc-900">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingCell({ ...editingCell, ativo: false, valor: 0, tier_tipo: 'inativo' });
                                        setTimeout(() => handleSaveCustomValue(), 50);
                                    }}
                                    className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                >
                                    Desativar Mês
                                </button>
                                
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingCell(null)}
                                        className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                                    >
                                        Salvar Alteração
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
