'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { toast } from 'sonner';
import { 
    Save, 
    Loader2, 
    ArrowLeft, 
    DollarSign, 
    Percent, 
    Plus,
    Image as ImageIcon,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    Search,
    Check,
    ArrowRight,
    Users,
    ShieldCheck,
    Sparkles,
    Clock,
    Tag,
    Gift,
    Eye,
    Calculator,
    Package,
    CreditCard,
    Sliders,
    TrendingUp,
    Layers,
    RotateCcw
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import UsersManager from '@/components/Admin/UsersManager';

interface MismatchItem {
    sheet: string;
    row: number;
    figureName: string;
    currentUrl: string;
    currentFilePath: string;
    currentFileName: string;
    proposedFileName: string;
    proposedUrl: string;
    isVersionMismatch: boolean;
    nameVersion?: string | null;
    fileVersion?: string | null;
}

function SettingsContent() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') === 'usuarios' 
        ? 'usuarios' 
        : searchParams.get('tab') === 'sync' 
        ? 'sync' 
        : searchParams.get('tab') === 'marketing'
        ? 'marketing'
        : 'custos';
    const [activeTab, setActiveTab] = useState<'custos' | 'marketing' | 'usuarios' | 'sync'>(initialTab);

    const changeTab = (tab: 'custos' | 'marketing' | 'usuarios' | 'sync') => {
        setActiveTab(tab);
        const params = new URLSearchParams(window.location.search);
        params.set('tab', tab);
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    };

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        custo_h_impressao: 0,
        custo_h_pintura: 0,
        custo_resina_kg: 0,
        estoque_resina_kg: 0,
        margem_basica: 0,
        margem_premium: 0,
        margem_pobre: 0,
        taxa_cartao: 1.15,
        desconto_primeira_compra: 10,
        desconto_captacao: 5,
        modal_intervalo_dias: 30,
        modal_tempo_inatividade_segundos: 45
    });

    // Estados da ferramenta de Sincronização de Imagens
    const [selectedTab, setSelectedTab] = useState<string>('ALL');
    const [isScanning, setIsScanning] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [scanResult, setScanResult] = useState<{
        tabsScanned: string[];
        totalRowsScanned: number;
        totalMismatches: number;
        activeProvider?: string;
        mismatches: MismatchItem[];
    } | null>(null);
    const [selectedMismatchIndexes, setSelectedMismatchIndexes] = useState<number[]>([]);
    const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
    const [syncResults, setSyncResults] = useState<any[] | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setFormData({
                custo_h_impressao: data.custo_h_impressao || 0,
                custo_h_pintura: data.custo_h_pintura || 0,
                custo_resina_kg: data.custo_resina_kg || 0,
                estoque_resina_kg: data.estoque_resina_kg || 0,
                margem_basica: data.margem_basica || 0,
                margem_premium: data.margem_premium || 0,
                margem_pobre: data.margem_pobre || 0,
                taxa_cartao: data.taxa_cartao || 1.15,
                desconto_primeira_compra: data.desconto_primeira_compra !== undefined ? Number(data.desconto_primeira_compra) : 10,
                desconto_captacao: data.desconto_captacao !== undefined ? Number(data.desconto_captacao) : 5,
                modal_intervalo_dias: data.modal_intervalo_dias !== undefined ? Number(data.modal_intervalo_dias) : 30,
                modal_tempo_inatividade_segundos: data.modal_tempo_inatividade_segundos !== undefined ? Number(data.modal_tempo_inatividade_segundos) : 45
            });
        } catch (err) {
            toast.error('Erro ao carregar configurações');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('Configurações salvas com sucesso!');
            setFormData(data);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleQuickAddResin = (amount: number) => {
        setFormData(prev => ({
            ...prev,
            estoque_resina_kg: Number((Number(prev.estoque_resina_kg || 0) + amount).toFixed(2))
        }));
        toast.info(`+${amount}kg adicionados à fila de estoque. Clique em "Salvar Configurações" para gravar.`);
    };

    const handleAddResinPrompt = () => {
        const more = prompt('Quantos KG de resina deseja adicionar ao estoque atual?');
        if (more && !isNaN(parseFloat(more))) {
            const val = parseFloat(more);
            handleQuickAddResin(val);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    // Live Price Simulator Calculations (Reference Figure: 150g resin, 8h print, 2h painting)
    const liveSimulation = useMemo(() => {
        const refResinaKg = 0.15; // 150g
        const refHImpressao = 8;  // 8h
        const refHPintura = 2;    // 2h

        const custoResina = refResinaKg * (formData.custo_resina_kg || 0);
        const custoImpressao = refHImpressao * (formData.custo_h_impressao || 0);
        const custoPintura = refHPintura * (formData.custo_h_pintura || 0);

        const custoProducaoEstilizado = Math.ceil(custoResina + custoImpressao);
        const custoProducaoColorido = Math.ceil(custoResina + custoImpressao + custoPintura);

        const roundTo5 = (val: number) => Math.ceil(val / 5) * 5;

        const pixEstilizado = roundTo5(custoProducaoEstilizado * (formData.margem_pobre || 1));
        const pixColorido = roundTo5(custoProducaoColorido * (formData.margem_basica || 1));

        const cartaoEstilizado = roundTo5(pixEstilizado * (formData.taxa_cartao || 1));
        const cartaoColorido = roundTo5(pixColorido * (formData.taxa_cartao || 1));

        const lucroPixEstilizado = Math.max(0, pixEstilizado - custoProducaoEstilizado);
        const lucroPixColorido = Math.max(0, pixColorido - custoProducaoColorido);

        return {
            custoResina,
            custoImpressao,
            custoPintura,
            custoProducaoEstilizado,
            custoProducaoColorido,
            pixEstilizado,
            pixColorido,
            cartaoEstilizado,
            cartaoColorido,
            lucroPixEstilizado,
            lucroPixColorido
        };
    }, [formData]);

    // Handlers de Sincronização de Imagens
    const handleScanImages = async () => {
        setIsScanning(true);
        setSyncResults(null);
        try {
            const res = await fetch(`/api/admin/tools/sync-images?tab=${selectedTab}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao analisar imagens');
            }
            const data = await res.json();
            setScanResult(data);
            setSelectedMismatchIndexes(data.mismatches.map((_: any, idx: number) => idx));
            if (data.totalMismatches === 0) {
                toast.success('Todas as imagens estão perfeitamente sincronizadas!');
            } else {
                toast.info(`${data.totalMismatches} descasamento(s) encontrado(s).`);
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsScanning(false);
        }
    };

    const handleToggleSelect = (idx: number) => {
        setSelectedMismatchIndexes(prev => 
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    const handleSelectAll = () => {
        if (!scanResult) return;
        if (selectedMismatchIndexes.length === scanResult.mismatches.length) {
            setSelectedMismatchIndexes([]);
        } else {
            setSelectedMismatchIndexes(scanResult.mismatches.map((_, idx) => idx));
        }
    };

    const handleSyncImages = async () => {
        if (!scanResult || selectedMismatchIndexes.length === 0) return;
        const itemsToSync = selectedMismatchIndexes.map(idx => scanResult.mismatches[idx]);
        const providerName = scanResult?.activeProvider === 'cloudflare' ? 'Cloudflare R2' : 'ImageKit';
        if (!confirm(`Deseja renomear ${itemsToSync.length} imagem(ns) no Storage (${providerName}) e atualizar na Planilha e no Banco de Dados?`)) return;

        setIsSyncing(true);
        setSyncProgress({ current: 0, total: itemsToSync.length });
        try {
            const res = await fetch('/api/admin/tools/sync-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: itemsToSync })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao sincronizar');
            }

            const data = await res.json();
            setSyncResults(data.results);
            toast.success(data.message || 'Sincronização concluída com sucesso!');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSyncing(false);
            setSyncProgress(null);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
            <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
        </div>
    );

    return (
        <div className="w-full text-zinc-100 transition-colors duration-300 space-y-6">
            {/* Header com Navegação e Switcher de Abas */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
                <div className="flex items-center gap-4">
                    <Link 
                        href="/admin" 
                        className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded-xl transition-all shadow-sm text-zinc-400 cursor-pointer"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-white">Configurações & Gestão</h1>
                            <span className="text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full uppercase">
                                Painel Mestre
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-medium mt-0.5">
                            Custos operacionais, precificação dinâmica, equipe operacional e integridade do catálogo.
                        </p>
                    </div>
                </div>

                {/* Segmented Control de Abas */}
                <div className="flex items-center gap-1.5 p-1 bg-zinc-950/90 border border-zinc-800/80 rounded-2xl w-fit flex-wrap">
                    <button
                        type="button"
                        onClick={() => changeTab('custos')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                            activeTab === 'custos'
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <DollarSign size={14} />
                        Custos & Preços
                    </button>

                    <button
                        type="button"
                        onClick={() => changeTab('marketing')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                            activeTab === 'marketing'
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <Sparkles size={14} />
                        Marketing & Cupons
                    </button>

                    <button
                        type="button"
                        onClick={() => changeTab('usuarios')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                            activeTab === 'usuarios'
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <Users size={14} />
                        Equipe & Permissões
                    </button>

                    <button
                        type="button"
                        onClick={() => changeTab('sync')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                            activeTab === 'sync'
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <RefreshCw size={14} />
                        Sincronização
                    </button>
                </div>
            </div>

            {/* 4 Cards Executivos de Resumo Top-Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Estoque de Resina */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Estoque de Resina</span>
                        <div className="p-2 bg-zinc-800/80 rounded-lg text-orange-400">
                            <Package size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-white font-mono">
                            {formData.estoque_resina_kg.toFixed(2)} <span className="text-sm font-bold text-zinc-500">kg</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            Patrimônio: R$ {(formData.estoque_resina_kg * formData.custo_resina_kg).toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* KPI 2: Custo Máquina / Hora */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Custo Hora Impressão</span>
                        <div className="p-2 bg-zinc-800/80 rounded-lg text-emerald-400">
                            <Sliders size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-white font-mono">
                            R$ {formData.custo_h_impressao.toFixed(2)} <span className="text-sm font-bold text-zinc-500">/h</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            Pintura: R$ {formData.custo_h_pintura.toFixed(2)}/h • Kg: R$ {formData.custo_resina_kg.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* KPI 3: Taxa de Cartão */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Taxa Cartão (Gateway)</span>
                        <div className="p-2 bg-zinc-800/80 rounded-lg text-cyan-400">
                            <CreditCard size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-white font-mono">
                            +{((formData.taxa_cartao - 1) * 100).toFixed(1)}%
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            Multiplicador checkout: x{formData.taxa_cartao.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* KPI 4: Cupons & Conversão */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Descontos Globais</span>
                        <div className="p-2 bg-zinc-800/80 rounded-lg text-purple-400">
                            <Gift size={16} />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-white font-mono">
                            {formData.desconto_primeira_compra}% <span className="text-xs font-bold text-zinc-500">1ª Compra</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            Captação: {formData.desconto_captacao}% • Janela: {formData.modal_intervalo_dias}d
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTEÚDO DAS ABAS */}

            {/* ABA 1: CUSTOS & PRECIFICAÇÃO */}
            {activeTab === 'custos' && (
                <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Bloco 1: Custos Base de Insumos & Máquinas */}
                        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/70">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl">
                                        <DollarSign size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-white tracking-tight">Custos Operacionais Base</h2>
                                        <p className="text-xs text-zinc-400">Valores de insumos brutos e hora de maquinário.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {/* Resina R$/kg */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                                        Resina (R$ / Kg)
                                    </label>
                                    <input
                                        type="number" 
                                        step="0.01"
                                        value={formData.custo_resina_kg}
                                        onChange={e => handleChange('custo_resina_kg', e.target.value)}
                                        className="w-full bg-zinc-900/90 border border-zinc-800 text-white rounded-xl p-3 outline-none focus:border-orange-500 font-mono font-bold transition-all text-sm"
                                    />
                                    <p className="text-[10px] text-zinc-500 ml-1">Preço médio por kg na compra de insumo.</p>
                                </div>

                                {/* Estoque de Resina em Kg com Quick-Add Pills */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                            Estoque Atual (Kg)
                                        </label>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="number" 
                                            step="0.01"
                                            value={formData.estoque_resina_kg}
                                            onChange={e => handleChange('estoque_resina_kg', e.target.value)}
                                            className="w-full bg-zinc-900/90 border border-zinc-800 text-white rounded-xl p-3 outline-none focus:border-orange-500 font-mono font-bold transition-all text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddResinPrompt}
                                            className="bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-orange-500/50 text-orange-400 p-3 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                                            title="Adicionar quantidade customizada"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                    {/* 1-Click Quick Add Pills */}
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase mr-1">Rápido:</span>
                                        {[1, 5, 10, 25].map(amt => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => handleQuickAddResin(amt)}
                                                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-800/90 border border-zinc-700/60 text-zinc-300 hover:text-white hover:border-orange-500/50 transition-all cursor-pointer"
                                            >
                                                +{amt}kg
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Hora Impressão */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                                        Hora Impressão (R$ / h)
                                    </label>
                                    <input
                                        type="number" 
                                        step="0.01"
                                        value={formData.custo_h_impressao}
                                        onChange={e => handleChange('custo_h_impressao', e.target.value)}
                                        className="w-full bg-zinc-900/90 border border-zinc-800 text-white rounded-xl p-3 outline-none focus:border-orange-500 font-mono font-bold transition-all text-sm"
                                    />
                                    <p className="text-[10px] text-zinc-500 ml-1">Depreciação, energia elétrica e FEP/LCD.</p>
                                </div>

                                {/* Hora Pintura */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                                        Hora Pintura (R$ / h)
                                    </label>
                                    <input
                                        type="number" 
                                        step="0.01"
                                        value={formData.custo_h_pintura}
                                        onChange={e => handleChange('custo_h_pintura', e.target.value)}
                                        className="w-full bg-zinc-900/90 border border-zinc-800 text-white rounded-xl p-3 outline-none focus:border-orange-500 font-mono font-bold transition-all text-sm"
                                    />
                                    <p className="text-[10px] text-zinc-500 ml-1">Remuneração do artista de pintura manual.</p>
                                </div>
                            </div>
                        </div>

                        {/* Bloco 2: Multiplicadores de Margem & Gateway */}
                        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/70">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
                                        <Percent size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-white tracking-tight">Multiplicadores & Margens</h2>
                                        <p className="text-xs text-zinc-400">Coeficientes de lucro comercial e taxa de cartão.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                {/* Margem Estilizado */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-orange-400 ml-1">
                                        Margem Estilizado
                                    </label>
                                    <input
                                        type="number" 
                                        step="0.01"
                                        value={formData.margem_pobre}
                                        onChange={e => handleChange('margem_pobre', e.target.value)}
                                        className="w-full bg-zinc-900/90 border border-orange-500/30 text-white rounded-xl p-3 outline-none focus:border-orange-500 font-mono font-bold transition-all text-sm"
                                    />
                                    <p className="text-[10px] text-zinc-500 ml-1">Ex: 1.15 = 15% de lucro base (Sem Pintura).</p>
                                </div>

                                {/* Margem Colorido */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                                        Margem Colorido
                                    </label>
                                    <input
                                        type="number" 
                                        step="0.01"
                                        value={formData.margem_basica}
                                        onChange={e => handleChange('margem_basica', e.target.value)}
                                        className="w-full bg-zinc-900/90 border border-zinc-800 text-white rounded-xl p-3 outline-none focus:border-orange-500 font-mono font-bold transition-all text-sm"
                                    />
                                    <p className="text-[10px] text-zinc-500 ml-1">Ex: 1.30 = 30% de lucro final pintado.</p>
                                </div>

                                {/* Taxa Cartão Global */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-cyan-400 ml-1">
                                        Taxa Cartão (Global)
                                    </label>
                                    <input
                                        type="number" 
                                        step="0.01"
                                        value={formData.taxa_cartao}
                                        onChange={e => handleChange('taxa_cartao', e.target.value)}
                                        className="w-full bg-zinc-900/90 border border-zinc-800 text-white rounded-xl p-3 outline-none focus:border-orange-500 font-mono font-bold transition-all text-sm"
                                    />
                                    <p className="text-[10px] text-zinc-500 ml-1">Ex: 1.15 = 15% acréscimo p/ parcelamento.</p>
                                </div>
                            </div>

                            <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs">
                                <span className="text-zinc-400 font-medium">Regra de Arredondamento do Catálogo:</span>
                                <span className="text-orange-400 font-mono font-bold">Múltiplos de R$ 5,00 (teto)</span>
                            </div>
                        </div>
                    </div>

                    {/* LIVE PRICE CALCULATOR PREVIEW (SIMULADOR EM TEMPO REAL) */}
                    <div className="bg-gradient-to-br from-zinc-900/70 via-zinc-900/40 to-zinc-950 border border-zinc-800/90 rounded-2xl p-6 space-y-5 shadow-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-xl shrink-0">
                                    <Calculator size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-black text-white tracking-tight">Simulador de Preço em Tempo Real</h3>
                                        <span className="text-[9px] font-mono font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                            Live Engine
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Projeção instantânea para figura de referência: <strong className="text-zinc-200">150g de Resina</strong> • <strong className="text-zinc-200">8h Impressão</strong> • <strong className="text-zinc-200">2h Pintura</strong>
                                    </p>
                                </div>
                            </div>
                            <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5 self-start sm:self-center">
                                <TrendingUp size={13} className="text-orange-400" />
                                <span>Atualizado dinamicamente</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Card Simulação Estilizado */}
                            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-black uppercase tracking-wider text-zinc-200">Versão Estilizada</span>
                                        <p className="text-[11px] text-zinc-500">Impressão 3D pura, primer e verniz (sem pintura manual)</p>
                                    </div>
                                    <span className="text-[10px] font-mono bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700/60 font-bold">
                                        Margem x{formData.margem_pobre}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/60 text-center">
                                    <div>
                                        <div className="text-[10px] font-bold text-zinc-500 uppercase">Custo Produção</div>
                                        <div className="text-sm font-black font-mono text-zinc-300 mt-0.5">
                                            R$ {liveSimulation.custoProducaoEstilizado.toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-emerald-400 uppercase">Preço PIX</div>
                                        <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                                            R$ {liveSimulation.pixEstilizado.toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-cyan-400 uppercase">Cartão</div>
                                        <div className="text-sm font-black font-mono text-cyan-300 mt-0.5">
                                            R$ {liveSimulation.cartaoEstilizado.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 font-mono">
                                    <span>Lucro Bruto Estimado (PIX):</span>
                                    <span className="text-emerald-400 font-bold">
                                        +R$ {liveSimulation.lucroPixEstilizado.toFixed(2)} ({((formData.margem_pobre - 1) * 100).toFixed(0)}%)
                                    </span>
                                </div>
                            </div>

                            {/* Card Simulação Colorido */}
                            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-black uppercase tracking-wider text-orange-400">Versão Colorida</span>
                                        <p className="text-[11px] text-zinc-500">Impressão + Pintura artística manual completa (2h)</p>
                                    </div>
                                    <span className="text-[10px] font-mono bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20 font-bold">
                                        Margem x{formData.margem_basica}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/60 text-center">
                                    <div>
                                        <div className="text-[10px] font-bold text-zinc-500 uppercase">Custo Produção</div>
                                        <div className="text-sm font-black font-mono text-zinc-300 mt-0.5">
                                            R$ {liveSimulation.custoProducaoColorido.toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-emerald-400 uppercase">Preço PIX</div>
                                        <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                                            R$ {liveSimulation.pixColorido.toFixed(2)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-cyan-400 uppercase">Cartão</div>
                                        <div className="text-sm font-black font-mono text-cyan-300 mt-0.5">
                                            R$ {liveSimulation.cartaoColorido.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 font-mono">
                                    <span>Lucro Bruto Estimado (PIX):</span>
                                    <span className="text-emerald-400 font-bold">
                                        +R$ {liveSimulation.lucroPixColorido.toFixed(2)} ({((formData.margem_basica - 1) * 100).toFixed(0)}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Botão Salvar Custos */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.99] flex items-center justify-center gap-2.5 text-sm uppercase tracking-wider cursor-pointer"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Salvar Parâmetros de Custo & Precificação</>}
                    </button>
                </form>
            )}

            {/* ABA 2: MARKETING & CUPONS */}
            {activeTab === 'marketing' && (
                <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Card 1: Cupons Mestres */}
                        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-5">
                            <div className="flex items-center gap-3 pb-3 border-b border-zinc-800/70">
                                <div className="p-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl">
                                    <Tag size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-white tracking-tight">Cupons & Descontos Mestres</h2>
                                    <p className="text-xs text-zinc-400">Percentuais aplicados automaticamente nas jornadas.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* % Desconto Primeira Compra */}
                                <div className="space-y-2 p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                            <Gift size={14} className="text-orange-400" />
                                            % Primeira Compra
                                        </label>
                                        <span className="text-[10px] font-mono font-bold bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md">
                                            PRIMEIRACOMPRA
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={formData.desconto_primeira_compra}
                                            onChange={e => handleChange('desconto_primeira_compra', e.target.value)}
                                            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 pr-10 outline-none focus:border-orange-500 font-mono font-bold transition-all text-white text-base"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-sm">%</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 font-medium">
                                        Válido para clientes novos sem pedidos vinculados ao WhatsApp no checkout.
                                    </p>
                                </div>

                                {/* % Desconto de Captação */}
                                <div className="space-y-2 p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                            <Percent size={14} className="text-orange-400" />
                                            % Captação Anti-Abandono
                                        </label>
                                        <span className="text-[10px] font-mono font-bold bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md">
                                            RESGATE5
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={formData.desconto_captacao}
                                            onChange={e => handleChange('desconto_captacao', e.target.value)}
                                            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 pr-10 outline-none focus:border-orange-500 font-mono font-bold transition-all text-white text-base"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-sm">%</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 font-medium">
                                        Desconto ofertado no modal de retenção "Eu Mereço" ao tentar fechar a página.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Modal Anti-Abandono ("Eu Mereço") */}
                        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-5">
                            <div className="flex items-center gap-3 pb-3 border-b border-zinc-800/70">
                                <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-white tracking-tight">Comportamento do Modal "Eu Mereço"</h2>
                                    <p className="text-xs text-zinc-400">Frequência e temporizadores de exibição ao visitante.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Frequência de Surgimento (dias) */}
                                <div className="space-y-2 p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black uppercase tracking-wider text-white">
                                            Janela de Frequência
                                        </label>
                                        <div className="flex gap-1.5">
                                            {[7, 15, 30].map(days => (
                                                <button
                                                    key={days}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, modal_intervalo_dias: days }))}
                                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                                        formData.modal_intervalo_dias === days
                                                            ? 'bg-orange-500 text-white font-black shadow-sm'
                                                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                                    }`}
                                                >
                                                    {days}d
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            max="365"
                                            step="1"
                                            value={formData.modal_intervalo_dias}
                                            onChange={e => handleChange('modal_intervalo_dias', e.target.value)}
                                            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 pr-14 outline-none focus:border-orange-500 font-mono font-bold transition-all text-white text-base"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-xs uppercase">dias</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 font-medium">
                                        Trava de exibição: impede que o cliente seja incomodado seguidamente após visualizar a oferta.
                                    </p>
                                </div>

                                {/* Tempo de Inatividade na Página */}
                                <div className="space-y-2 p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-black uppercase tracking-wider text-white">
                                            Inatividade na Página
                                        </label>
                                        <div className="flex gap-1.5">
                                            {[30, 45, 60].map(sec => (
                                                <button
                                                    key={sec}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, modal_tempo_inatividade_segundos: sec }))}
                                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                                        formData.modal_tempo_inatividade_segundos === sec
                                                            ? 'bg-orange-500 text-white font-black shadow-sm'
                                                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                                    }`}
                                                >
                                                    {sec}s
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="5"
                                            max="600"
                                            step="5"
                                            value={formData.modal_tempo_inatividade_segundos}
                                            onChange={e => handleChange('modal_tempo_inatividade_segundos', e.target.value)}
                                            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 pr-14 outline-none focus:border-orange-500 font-mono font-bold transition-all text-white text-base"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-xs uppercase">seg</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 font-medium">
                                        Dispara a oferta quando o cliente passa esse tempo sem rolar ou mover o mouse (ou ao apontar para fora da aba).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resumo das Regras Vigentes & Ação de Salvar */}
                    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                                <Eye size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-white">Resumo de Conversão Vigente</h4>
                                <p className="text-xs text-zinc-400">
                                    1ª Compra: <strong className="text-orange-400">{formData.desconto_primeira_compra}% OFF</strong> • Captação: <strong className="text-orange-400">{formData.desconto_captacao}% OFF</strong> • Modal: a cada <strong className="text-white">{formData.modal_intervalo_dias} dias</strong> ({formData.modal_tempo_inatividade_segundos}s inatividade).
                                </p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full md:w-auto px-8 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer shrink-0"
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Salvar Regras de Marketing</>}
                        </button>
                    </div>
                </form>
            )}

            {/* ABA 3: EQUIPE & USUÁRIOS */}
            {activeTab === 'usuarios' && <UsersManager />}

            {/* ABA 4: MANUTENÇÃO E SINCRONIZAÇÃO DE IMAGENS */}
            {activeTab === 'sync' && (
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2.5">
                                    <ImageIcon className="text-orange-400" size={20} />
                                    Sincronização de Imagens & Armazenamento
                                </h2>
                                <span className="text-[10px] font-mono font-bold bg-zinc-800 border border-zinc-700/60 text-zinc-300 px-2 py-0.5 rounded-md">
                                    {scanResult?.activeProvider === 'imagekit' ? 'ImageKit' : 'Cloudflare R2'}
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                                Detecte e corrija discrepâncias entre nomes de figuras e arquivos no storage após exclusões ou renomeações de versões.
                            </p>
                        </div>
                    </div>

                    {/* Filtro de Abas */}
                    <div className="flex flex-wrap gap-2">
                        {['ALL', 'Games', 'Marvel', 'DC', 'Random', 'Anime'].map(tab => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => { setSelectedTab(tab); setScanResult(null); setSyncResults(null); }}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    selectedTab === tab
                                        ? 'bg-orange-500 text-white font-black shadow-sm'
                                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                                }`}
                            >
                                {tab === 'ALL' ? 'Todas as Categorias' : tab}
                            </button>
                        ))}
                    </div>

                    {/* Botão de Análise */}
                    <div>
                        <button
                            type="button"
                            disabled={isScanning || isSyncing}
                            onClick={handleScanImages}
                            className="w-full bg-zinc-950/80 border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-900 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer"
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 size={16} className="animate-spin text-orange-400" />
                                    Analisando Planilha & Storage Ativo...
                                </>
                            ) : (
                                <>
                                    <Search size={16} className="text-orange-400" />
                                    Analisar Descasamentos {selectedTab !== 'ALL' ? `(${selectedTab})` : ''}
                                </>
                            )}
                        </button>
                    </div>

                    {/* Resultados do Scan */}
                    {scanResult && (
                        <div className="space-y-4 pt-4 border-t border-zinc-800/80 animate-in fade-in duration-300">
                            {scanResult.totalMismatches === 0 ? (
                                <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-4 text-emerald-400">
                                    <CheckCircle2 size={24} className="shrink-0" />
                                    <div>
                                        <div className="font-black text-sm">Tudo 100% Sincronizado!</div>
                                        <div className="text-xs text-emerald-400/80 mt-0.5">
                                            Nenhum descasamento encontrado em {scanResult.totalRowsScanned} figuras analisadas na categoria {selectedTab === 'ALL' ? 'todas' : selectedTab}.
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-400">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle size={20} className="shrink-0" />
                                            <div className="text-xs font-bold">
                                                <strong>{scanResult.totalMismatches}</strong> descasamento(s) encontrado(s) entre o nome da figura e o arquivo no storage ({scanResult.activeProvider === 'imagekit' ? 'ImageKit' : 'Cloudflare R2'}).
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleSelectAll}
                                                className="text-[10px] font-black uppercase bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white cursor-pointer"
                                            >
                                                {selectedMismatchIndexes.length === scanResult.mismatches.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tabela de Divergências */}
                                    <div className="max-h-96 overflow-y-auto rounded-2xl border border-zinc-800 divide-y divide-zinc-900 bg-zinc-950/60 text-xs">
                                        {scanResult.mismatches.map((m, idx) => {
                                            const isSelected = selectedMismatchIndexes.includes(idx);
                                            const syncResult = syncResults?.find(r => r.sheet === m.sheet && r.row === m.row);

                                            return (
                                                <div
                                                    key={`${m.sheet}-${m.row}`}
                                                    onClick={() => handleToggleSelect(idx)}
                                                    className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                                                        isSelected ? 'bg-orange-500/5' : 'hover:bg-zinc-900/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => {}}
                                                            className="w-4 h-4 rounded accent-orange-500 pointer-events-none"
                                                        />
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0">
                                                            {m.sheet} #{m.row}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-zinc-200 truncate flex items-center gap-2">
                                                                {m.figureName}
                                                                {m.isVersionMismatch && (
                                                                    <span className="bg-red-500/10 border border-red-500/30 text-red-400 px-1.5 py-0.2 text-[9px] rounded font-black uppercase">
                                                                        Versão {m.nameVersion} ≠ {m.fileVersion}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-mono truncate mt-0.5">
                                                                <span className="line-through text-zinc-600">{m.currentFileName}</span>
                                                                <ArrowRight size={10} className="text-zinc-600 shrink-0" />
                                                                <span className="text-emerald-400">{m.proposedFileName}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 text-right">
                                                        {syncResult ? (
                                                            syncResult.success ? (
                                                                <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                                                    <Check size={14} /> Corrigido
                                                                </span>
                                                            ) : (
                                                                <span className="text-red-400 font-bold text-[10px]" title={syncResult.error}>
                                                                    Erro
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="text-[10px] text-zinc-500 font-bold uppercase">
                                                                Pronto p/ Renomear
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Botão de Execução da Sincronização */}
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            disabled={isSyncing || selectedMismatchIndexes.length === 0}
                                            onClick={handleSyncImages}
                                            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] text-xs uppercase tracking-widest shadow-lg shadow-orange-500/10 cursor-pointer"
                                        >
                                            {isSyncing ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Renomeando no Storage & Atualizando Banco... ({syncProgress?.current || 0}/{syncProgress?.total || selectedMismatchIndexes.length})
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw size={16} />
                                                    Renomear e Sincronizar ({selectedMismatchIndexes.length} Selecionados)
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
            </div>
        }>
            <SettingsContent />
        </Suspense>
    );
}


