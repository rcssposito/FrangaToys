'use client';

import { useState, useEffect } from 'react';
import { 
    Calendar, 
    TrendingUp, 
    DollarSign, 
    Printer, 
    RefreshCw, 
    ChevronLeft, 
    ChevronRight, 
    Layers, 
    Building2, 
    Package, 
    CheckCircle2, 
    AlertCircle, 
    Sparkles, 
    Percent, 
    ShoppingBag, 
    Paintbrush, 
    HelpCircle, 
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const MESES = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
];

export default function DrePage() {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
    const [activeTab, setActiveTab] = useState<'dre' | 'pedidos' | 'estudios'>('dre');
    
    const [regime, setRegime] = useState<'competencia' | 'caixa'>('competencia');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    const fetchDRE = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/financial/dre?year=${selectedYear}&month=${selectedMonth}&regime=${regime}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro ao carregar dados do DRE');
            setData(json);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Erro ao carregar relatório');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDRE();
    }, [selectedMonth, selectedYear, regime]);

    const handlePrevMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(prev => prev - 1);
        } else {
            setSelectedMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(prev => prev + 1);
        } else {
            setSelectedMonth(prev => prev + 1);
        }
    };

    const formatCurrency = (val: number) => {
        return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const mesAtualNome = MESES.find(m => m.value === selectedMonth)?.label || '';

    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-12">
            
            {/* Header da Página e Navegação */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[var(--card-border)]">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--foreground)]">
                                DRE & Fechamento Financeiro
                            </h1>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                Demonstrativo do Resultado do Exercício consolidado com resina, estúdios, comissões e lucro líquido real.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Controles de Período & Ações */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Seletor Mês Anterior / Próximo */}
                    <div className="flex items-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-2 hover:bg-[var(--input-bg)] rounded-xl text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                            title="Mês Anterior"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        
                        <div className="px-3 flex items-center gap-2 font-black text-xs uppercase tracking-wider text-orange-500">
                            <Calendar size={14} />
                            <span>{mesAtualNome} / {selectedYear}</span>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-2 hover:bg-[var(--input-bg)] rounded-xl text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                            title="Próximo Mês"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Alternador de Regime: Competência vs Caixa */}
                    <div className="flex items-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-1 shadow-sm text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => setRegime('competencia')}
                            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                regime === 'competencia'
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : 'text-[var(--text-muted)] hover:text-white'
                            }`}
                            title="Regime de Competência: considera todas as vendas realizadas no mês (padrão contábil)"
                        >
                            Competência (Vendas Feitas)
                        </button>
                        <button
                            type="button"
                            onClick={() => setRegime('caixa')}
                            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                regime === 'caixa'
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : 'text-[var(--text-muted)] hover:text-white'
                            }`}
                            title="Regime de Caixa: considera apenas pedidos com pagamento confirmado"
                        >
                            Caixa (Apenas Pagas)
                        </button>
                    </div>

                    {/* Dropdowns rápidos */}
                    <div className="flex items-center gap-1.5">
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(Number(e.target.value))}
                            className="bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-bold rounded-2xl px-3 py-2.5 outline-none focus:border-orange-500 text-[var(--foreground)] cursor-pointer"
                        >
                            {MESES.map(m => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(Number(e.target.value))}
                            className="bg-[var(--card-bg)] border border-[var(--card-border)] text-xs font-bold rounded-2xl px-3 py-2.5 outline-none focus:border-orange-500 text-[var(--foreground)] cursor-pointer"
                        >
                            {[2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={fetchDRE}
                            className="p-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-white rounded-2xl transition-all cursor-pointer shadow-sm"
                            title="Atualizar Dados"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin text-orange-500' : ''} />
                        </button>

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 text-zinc-300 hover:text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                            title="Imprimir Relatório"
                        >
                            <Printer size={15} />
                            <span className="hidden sm:inline">Imprimir DRE</span>
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
                    <Loader2 size={36} className="animate-spin text-orange-500" />
                    <p className="text-xs uppercase font-black tracking-widest text-zinc-500">
                        Consolidando Fechamento de {mesAtualNome}...
                    </p>
                </div>
            ) : !data ? (
                <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-12 text-center text-zinc-500">
                    Nenhum dado encontrado para o período selecionado.
                </div>
            ) : (
                <>
                    {/* 4 Cards de Destaque / KPIs Executivos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {/* 1. Faturamento Total */}
                        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 space-y-3 shadow-md relative overflow-hidden group hover:border-orange-500/30 transition-all">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                    Faturamento Bruto (Vendas)
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                    <DollarSign size={16} />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-[var(--foreground)] tracking-tight">
                                {formatCurrency(data.kpis?.faturamento_total)}
                            </div>
                            <div className="space-y-1 pt-1 border-t border-[var(--card-border)] text-[11px]">
                                <div className="flex items-center justify-between">
                                    <span className="text-[var(--text-muted)]">Recebido (Caixa):</span>
                                    <strong className="text-emerald-400 font-bold">{formatCurrency(data.kpis?.faturamento_recebido)}</strong>
                                </div>
                                {data.kpis?.faturamento_pendente > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-[var(--text-muted)]">A Receber (Pendente):</span>
                                        <strong className="text-amber-400 font-bold">{formatCurrency(data.kpis?.faturamento_pendente)}</strong>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Custos Variáveis / CPV */}
                        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 space-y-3 shadow-md relative overflow-hidden group hover:border-amber-500/30 transition-all">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                    Custos de Produção (CPV)
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <Layers size={16} />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                                {formatCurrency(data.kpis?.total_custos_producao)}
                            </div>
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--card-border)] text-[var(--text-muted)]">
                                <span>Snapshot Produção: {formatCurrency(data.kpis?.total_custo_impressao_resina)}</span>
                                {(data.kpis?.total_custo_pintores > 0 || data.kpis?.total_comissoes_vendedores > 0) ? (
                                    <span>Pintor/Comissão: {formatCurrency((data.kpis?.total_custo_pintores || 0) + (data.kpis?.total_comissoes_vendedores || 0))}</span>
                                ) : (
                                    <span className="text-zinc-600">Base tabela vendas</span>
                                )}
                            </div>
                        </div>

                        {/* 3. Assinaturas de Estúdios (Patreon) */}
                        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 space-y-3 shadow-md relative overflow-hidden group hover:border-purple-500/30 transition-all">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                    Assinaturas de Estúdios
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                                    <Building2 size={16} />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-purple-400 tracking-tight">
                                {formatCurrency(data.kpis?.total_assinaturas_estudios)}
                            </div>
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--card-border)] text-[var(--text-muted)]">
                                <span>{data.dre?.despesas_fixas?.qtd_estudios || 0} estúdios ativos</span>
                                <span className="text-purple-400 font-bold">Custo Fixo</span>
                            </div>
                        </div>

                        {/* 4. Lucro Líquido Real */}
                        <div className={`border rounded-3xl p-6 space-y-3 shadow-lg relative overflow-hidden transition-all ${
                            data.kpis?.lucro_liquido_real >= 0 
                                ? 'bg-gradient-to-br from-emerald-950/40 via-zinc-950 to-zinc-950 border-emerald-500/30'
                                : 'bg-gradient-to-br from-red-950/40 via-zinc-950 to-zinc-950 border-red-500/30'
                        }`}>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                                    Lucro Líquido Real
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                                    {data.kpis?.margem_liquida_pct}% margem
                                </span>
                            </div>
                            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
                                data.kpis?.lucro_liquido_real >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                                {formatCurrency(data.kpis?.lucro_liquido_real)}
                            </div>
                            <div className="space-y-1 pt-1 border-t border-zinc-800 text-[11px]">
                                <div className="flex items-center justify-between text-zinc-400">
                                    <span>Lucro Real das Peças:</span>
                                    <strong className="text-zinc-200 font-bold">{formatCurrency(data.kpis?.soma_lucro_real_vendas)}</strong>
                                </div>
                                <div className="flex items-center justify-between text-zinc-500 text-[10px]">
                                    <span>Após Estúdios ({formatCurrency(data.kpis?.total_assinaturas_estudios)})</span>
                                    {data.kpis?.comparativo?.diff_lucro_pct !== undefined && (
                                        <span className={`font-bold flex items-center ${
                                            data.kpis.comparativo.diff_lucro_pct >= 0 ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                            {data.kpis.comparativo.diff_lucro_pct >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                                            {Math.abs(data.kpis.comparativo.diff_lucro_pct)}% vs mês ant.
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navegação de Abas Detalhadas */}
                    <div className="flex items-center gap-2 border-b border-[var(--card-border)] pb-3">
                        <button
                            type="button"
                            onClick={() => setActiveTab('dre')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'dre'
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                    : 'text-[var(--text-muted)] hover:text-white'
                            }`}
                        >
                            <FileText size={15} />
                            Estrutura do DRE
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('pedidos')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'pedidos'
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                    : 'text-[var(--text-muted)] hover:text-white'
                            }`}
                        >
                            <ShoppingBag size={15} />
                            Pedidos do Mês ({data.pedidos?.length || 0})
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('estudios')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'estudios'
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                    : 'text-[var(--text-muted)] hover:text-white'
                            }`}
                        >
                            <Building2 size={15} />
                            Estúdios / Assinaturas ({data.estudios?.length || 0})
                        </button>
                    </div>

                    {/* ABA 1: ESTRUTURA DO DRE */}
                    {activeTab === 'dre' && (
                        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--card-border)]">
                                <div>
                                    <h3 className="text-lg font-black text-[var(--foreground)]">
                                        Demonstração do Resultado do Exercício (DRE)
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Competência: {mesAtualNome} de {selectedYear} • Valores em Reais (BRL)
                                    </p>
                                </div>
                                <div className="text-xs font-bold text-zinc-500">
                                    Resina Base: {formatCurrency(data.parametros_utilizados?.custo_resina_kg)}/kg • Impressão: {formatCurrency(data.parametros_utilizados?.custo_h_impressao)}/h
                                </div>
                            </div>

                            {/* Tabela Contábil DRE */}
                            <div className="divide-y divide-[var(--card-border)] text-sm">
                                
                                {/* 1. RECEITA BRUTA */}
                                <div className="py-3.5 flex items-center justify-between font-black text-white bg-zinc-900/40 px-4 rounded-xl">
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <span>(+) 1. RECEITA OPERACIONAL BRUTA</span>
                                    </div>
                                    <span className="text-base text-emerald-400">
                                        {formatCurrency(data.dre?.receita_bruta?.total)}
                                    </span>
                                </div>
                                <div className="py-2 px-6 flex items-center justify-between text-xs text-zinc-400">
                                    <span>• Venda de Peças e Colecionáveis</span>
                                    <span>{formatCurrency(data.dre?.receita_bruta?.vendas_produtos)}</span>
                                </div>
                                <div className="py-2 px-6 flex items-center justify-between text-xs text-zinc-400">
                                    <span>• Fretes e Entregas Cobradas</span>
                                    <span>{formatCurrency(data.dre?.receita_bruta?.fretes)}</span>
                                </div>

                                {/* 2. CUSTOS VARIÁVEIS / CPV (SNAPSHOT REAL) */}
                                <div className="py-3.5 flex items-center justify-between font-bold text-zinc-300 px-4">
                                    <div className="flex items-center gap-2 text-amber-400">
                                        <span>(-) 2. CUSTOS VARIÁVEIS DOS PRODUTOS (CPV - Tabela Vendas)</span>
                                    </div>
                                    <span className="text-amber-400 font-mono">
                                        -{formatCurrency(data.dre?.custos_variaveis_cpv?.total)}
                                    </span>
                                </div>
                                <div className="py-2 px-6 flex items-center justify-between text-xs text-zinc-400">
                                    <span>• Custos de Produção & Impressora (Snapshot Registrado)</span>
                                    <span className="font-mono">-{formatCurrency(data.dre?.custos_variaveis_cpv?.impressao_e_resina)}</span>
                                </div>
                                {data.dre?.custos_variaveis_cpv?.pintores_freelancers > 0 && (
                                    <div className="py-2 px-6 flex items-center justify-between text-xs text-zinc-400">
                                        <span>• Mão de Obra de Pintores & Freelancers</span>
                                        <span className="font-mono">-{formatCurrency(data.dre?.custos_variaveis_cpv?.pintores_freelancers)}</span>
                                    </div>
                                )}
                                {data.dre?.custos_variaveis_cpv?.comissoes_vendedores > 0 && (
                                    <div className="py-2 px-6 flex items-center justify-between text-xs text-zinc-400">
                                        <span>• Comissões de Vendedores</span>
                                        <span className="font-mono">-{formatCurrency(data.dre?.custos_variaveis_cpv?.comissoes_vendedores)}</span>
                                    </div>
                                )}

                                {/* 3. MARGEM DE CONTRIBUIÇÃO (LUCRO BRUTO DAS PEÇAS) */}
                                <div className="py-3.5 flex items-center justify-between font-black text-white bg-zinc-900/60 px-4 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <span>(=) 3. MARGEM DE CONTRIBUIÇÃO / LUCRO REAL DAS PEÇAS</span>
                                        <span className="text-[10px] font-mono text-zinc-400 font-bold bg-zinc-800 px-2 py-0.5 rounded">
                                            {data.dre?.margem_bruta_pct}% margem
                                        </span>
                                    </div>
                                    <span className="text-base font-mono text-amber-400">
                                        {formatCurrency(data.dre?.lucro_bruto)}
                                    </span>
                                </div>

                                {/* 4. DESPESAS FIXAS */}
                                <div className="py-3.5 flex items-center justify-between font-bold text-zinc-300 px-4">
                                    <div className="flex items-center gap-2 text-purple-400">
                                        <span>(-) 4. DESPESAS OPERACIONAIS FIXAS</span>
                                    </div>
                                    <span className="text-purple-400 font-mono">
                                        -{formatCurrency(data.dre?.despesas_fixas?.total)}
                                    </span>
                                </div>
                                <div className="py-2 px-6 flex items-center justify-between text-xs text-zinc-400">
                                    <span>• Assinaturas de Estúdios & Licenças Comerciais Patreon ({data.dre?.despesas_fixas?.qtd_estudios} estúdios)</span>
                                    <span className="font-mono">-{formatCurrency(data.dre?.despesas_fixas?.assinaturas_patreon)}</span>
                                </div>

                                {/* 5. RESULTADO LÍQUIDO REAL */}
                                <div className={`py-5 px-5 rounded-2xl flex items-center justify-between font-black text-base sm:text-lg border ${
                                    data.dre?.lucro_liquido_real >= 0 
                                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
                                        : 'bg-red-950/40 border-red-500/40 text-red-400'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <Sparkles size={20} className={data.dre?.lucro_liquido_real >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                                        <div>
                                            <div>(=) 5. RESULTADO OPERACIONAL LÍQUIDO (LUCRO REAL DA OPERAÇÃO)</div>
                                            <div className="text-xs font-medium text-zinc-400 mt-0.5">
                                                Margem Líquida da Operação: <strong className="text-white">{data.dre?.margem_liquida_pct}%</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xl sm:text-2xl font-mono font-black">
                                        {formatCurrency(data.dre?.lucro_liquido_real)}
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* ABA 2: PEDIDOS DO MÊS */}
                    {activeTab === 'pedidos' && (
                        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 sm:p-8 shadow-md space-y-4">
                            <div className="flex items-center justify-between pb-4 border-b border-[var(--card-border)]">
                                <div>
                                    <h3 className="text-base font-black text-[var(--foreground)]">
                                        Pedidos Realizados em {mesAtualNome} ({data.pedidos?.length || 0})
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Base de dados direta da tabela de vendas que consolida o DRE.
                                    </p>
                                </div>
                            </div>

                            {data.pedidos?.length === 0 ? (
                                <p className="text-center py-10 text-xs text-zinc-500">
                                    Nenhum pedido registrado no mês de {mesAtualNome}.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                                <th className="py-3 px-3">Data</th>
                                                <th className="py-3 px-3">Cliente</th>
                                                <th className="py-3 px-3">Figura / Estúdio</th>
                                                <th className="py-3 px-3">Canal</th>
                                                <th className="py-3 px-3">Status</th>
                                                <th className="py-3 px-3 text-right">Valor Venda</th>
                                                <th className="py-3 px-3 text-right">Custo Produção (Snapshot)</th>
                                                <th className="py-3 px-3 text-right">Lucro Real</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-850">
                                            {data.pedidos.map((p: any) => (
                                                <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                                                    <td className="py-3 px-3 text-zinc-400 font-mono">
                                                        {new Date(p.data_venda).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="py-3 px-3 font-bold text-white">
                                                        {p.cliente_nome}
                                                    </td>
                                                    <td className="py-3 px-3 text-zinc-300">
                                                        <div className="font-bold truncate max-w-[200px]">{p.figura_nome}</div>
                                                        <div className="text-[10px] text-zinc-500">{p.studio_nome}</div>
                                                    </td>
                                                    <td className="py-3 px-3 text-zinc-400">
                                                        {p.canal_venda || 'Loja'}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                            p.status_pagamento === 'Pago' 
                                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                        }`}>
                                                            {p.status_pagamento || p.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-bold text-white font-mono">
                                                        {formatCurrency(p.valor_total)}
                                                    </td>
                                                    <td className="py-3 px-3 text-right text-zinc-400 font-mono">
                                                        {formatCurrency(p.custo_producao + (p.valor_pintor || 0) + (p.comissao_vendedor || 0))}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-bold text-emerald-400 font-mono">
                                                        {formatCurrency(p.lucro_real)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ABA 3: ESTÚDIOS / ASSINATURAS */}
                    {activeTab === 'estudios' && (
                        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-6 sm:p-8 shadow-md space-y-4">
                            <div className="flex items-center justify-between pb-4 border-b border-[var(--card-border)]">
                                <div>
                                    <h3 className="text-base font-black text-[var(--foreground)]">
                                        Assinaturas e Licenças de Estúdios ({data.estudios?.length || 0})
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Custos fixos de assinaturas comerciais de arquivos 3D no mês.
                                    </p>
                                </div>
                                <div className="text-xs font-black text-purple-400 font-mono">
                                    Total: {formatCurrency(data.kpis?.total_assinaturas_estudios)}
                                </div>
                            </div>

                            {data.estudios?.length === 0 ? (
                                <p className="text-center py-10 text-xs text-zinc-500">
                                    Nenhuma assinatura de estúdio registrada para este mês.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {data.estudios.map((st: any, idx: number) => (
                                        <div key={idx} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-black text-white truncate">{st.nome}</h4>
                                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{st.tier || 'Licença Mensal'}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-xs font-black text-purple-400 font-mono">{formatCurrency(st.valor)}</div>
                                                <span className="text-[9px] text-emerald-400 font-bold">Ativo</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

        </div>
    );
}
