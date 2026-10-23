'use client';

import { useState, useEffect, Suspense } from 'react';
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
    Eye
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

            toast.success('Configurações salvas!');
            setFormData(data);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAddResin = () => {
        const more = prompt('Quantos KG de resina deseja adicionar ao estoque atual?');
        if (more && !isNaN(parseFloat(more))) {
            const val = parseFloat(more);
            setFormData(prev => ({ ...prev, estoque_resina_kg: Number((prev.estoque_resina_kg + val).toFixed(2)) }));
            toast.info(`${val}kg adicionados ao estoque (temporário). Clique em SALVAR para confirmar.`);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

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
        if (!confirm(`Deseja renomear ${itemsToSync.length} imagem(ns) no Storage (${scanResult?.activeProvider === 'cloudflare' ? 'Cloudflare R2' : 'ImageKit'}) e atualizar na Planilha e no Banco de Dados?`)) return;

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
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
            <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
        </div>
    );

    return (
        <div className="w-full text-[var(--foreground)] transition-colors duration-300">
            <div className="w-full space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--card-border)] pb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] hover:bg-[var(--input-bg)] rounded-xl transition-all shadow-sm text-[var(--text-muted)] hover:text-orange-500">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Configurações & Gestão</h1>
                            <p className="text-[var(--text-muted)] font-medium text-xs">Custos operacionais, equipe/permissões e manutenção do catálogo.</p>
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex items-center gap-1.5 p-1 bg-zinc-950/80 border border-zinc-900 rounded-2xl w-fit flex-wrap">
                        <button
                            type="button"
                            onClick={() => changeTab('custos')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'custos'
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <DollarSign size={14} />
                            Custos & Precificação
                        </button>

                        <button
                            type="button"
                            onClick={() => changeTab('marketing')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'marketing'
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Sparkles size={14} />
                            Marketing & Conversão
                        </button>

                        <button
                            type="button"
                            onClick={() => changeTab('usuarios')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'usuarios'
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Users size={14} />
                            Equipe & Usuários
                        </button>

                        <button
                            type="button"
                            onClick={() => changeTab('sync')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                activeTab === 'sync'
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <RefreshCw size={14} />
                            Sincronização
                        </button>
                    </div>
                </div>

                {activeTab === 'usuarios' && <UsersManager />}

                {activeTab === 'marketing' && (
                    <form onSubmit={handleSave} className="space-y-8 w-full animate-in fade-in duration-300">
                        {/* Header explicativo */}
                        <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white">Marketing, Descontos & Modal de Conversão</h2>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Configure incentivos de primeira compra, cupom de captação e o comportamento do modal anti-abandono.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Automações Ativas
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Card 1: Cupons & Descontos Comerciais */}
                            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 shadow-[var(--shadow-md)] space-y-6">
                                <div className="flex items-center gap-3">
                                    <Tag className="text-orange-500" size={24} />
                                    <div>
                                        <h3 className="text-lg font-black tracking-tight text-white">Cupons & Descontos</h3>
                                        <p className="text-xs text-[var(--text-muted)]">Percentuais aplicados automaticamente nas jornadas de compra.</p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {/* % Desconto Primeira Compra */}
                                    <div className="space-y-2 p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                                                <Gift size={14} className="text-orange-500" />
                                                % Desconto Primeira Compra
                                            </label>
                                            <span className="text-[10px] font-mono font-bold bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md">
                                                CUPOM: PRIMEIRACOMPRA
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
                                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 pr-10 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)] text-base"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-sm">%</span>
                                        </div>
                                        <p className="text-[11px] text-[var(--text-muted)] font-medium">
                                            Válido apenas para clientes que ainda não possuem pedidos anteriores registrados no WhatsApp informado no checkout.
                                        </p>
                                    </div>

                                    {/* % Desconto de Captação */}
                                    <div className="space-y-2 p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                                                <Percent size={14} className="text-orange-500" />
                                                % Desconto de Captação
                                            </label>
                                            <span className="text-[10px] font-mono font-bold bg-orange-500/15 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-md">
                                                CUPOM: RESGATE5
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
                                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 pr-10 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)] text-base"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-sm">%</span>
                                        </div>
                                        <p className="text-[11px] text-[var(--text-muted)] font-medium">
                                            Percentual exibido e aplicado automaticamente quando o visitante aceita o modal anti-abandono ("Eu Mereço").
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Modal Anti-Abandono ("Eu Mereço") */}
                            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 shadow-[var(--shadow-md)] space-y-6">
                                <div className="flex items-center gap-3">
                                    <Clock className="text-orange-500" size={24} />
                                    <div>
                                        <h3 className="text-lg font-black tracking-tight text-white">Comportamento do Modal</h3>
                                        <p className="text-xs text-[var(--text-muted)]">Frequência e temporizadores do modal "Eu Mereço".</p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {/* Frequência de Surgimento (dias) */}
                                    <div className="space-y-2 p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest text-white">
                                                Intervalo de Frequência (Dias)
                                            </label>
                                            <div className="flex gap-1.5">
                                                {[7, 15, 30].map(days => (
                                                    <button
                                                        key={days}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, modal_intervalo_dias: days }))}
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                                            formData.modal_intervalo_dias === days
                                                                ? 'bg-orange-500 text-black font-black'
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
                                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 pr-14 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)] text-base"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-xs uppercase">dias</span>
                                        </div>
                                        <p className="text-[11px] text-[var(--text-muted)] font-medium">
                                            Trava anti-exploit: Uma vez visualizado pelo visitante, o modal não será reexibido para ele pelo período de dias definido.
                                        </p>
                                    </div>

                                    {/* Tempo de Inatividade na Página */}
                                    <div className="space-y-2 p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest text-white">
                                                Tempo de Inatividade (Segundos)
                                            </label>
                                            <div className="flex gap-1.5">
                                                {[30, 45, 60].map(sec => (
                                                    <button
                                                        key={sec}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, modal_tempo_inatividade_segundos: sec }))}
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                                            formData.modal_tempo_inatividade_segundos === sec
                                                                ? 'bg-orange-500 text-black font-black'
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
                                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 pr-14 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)] text-base"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-xs uppercase">seg</span>
                                        </div>
                                        <p className="text-[11px] text-[var(--text-muted)] font-medium">
                                            Segundos de inatividade na página da figura antes de acionar a oferta. Também dispara imediatamente caso o visitante mova o mouse para fora da janela (Exit-Intent).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card Resumo / Live Preview */}
                        <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0">
                                    <Eye size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-white">Resumo das Regras Vigentes</h4>
                                    <p className="text-xs text-zinc-500">
                                        Primeira compra: <span className="text-orange-400 font-bold">{formData.desconto_primeira_compra}% OFF</span> • Captação: <span className="text-orange-400 font-bold">{formData.desconto_captacao}% OFF</span> • Modal: a cada <span className="text-zinc-300 font-bold">{formData.modal_intervalo_dias} dias</span> (inatividade de <span className="text-zinc-300 font-bold">{formData.modal_tempo_inatividade_segundos}s</span>).
                                    </p>
                                </div>
                            </div>

                            <button
                                disabled={saving}
                                className="w-full md:w-auto px-8 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-3 text-sm cursor-pointer shrink-0"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <><Save size={18} /> SALVAR CONFIGURAÇÕES DE MARKETING</>}
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'custos' && (
                    <form onSubmit={handleSave} className="space-y-8 w-full animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Custos Base */}
                            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 shadow-[var(--shadow-md)]">
                                <h2 className="text-xl font-black mb-6 flex items-center gap-3 tracking-tight">
                                    <DollarSign className="text-orange-500" size={24} /> Custos Base
                                </h2>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Resina (R$/Kg)</label>
                                        <input
                                            type="number" step="0.01"
                                            value={formData.custo_resina_kg}
                                            onChange={e => handleChange('custo_resina_kg', e.target.value)}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Estoque Resina (Kg)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number" step="0.01"
                                                value={formData.estoque_resina_kg}
                                                onChange={e => handleChange('estoque_resina_kg', e.target.value)}
                                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddResin}
                                                className="bg-zinc-900 border border-zinc-800 hover:border-orange-500 text-orange-500 p-3.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                                                title="Adicionar Compra"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Hora Impressão (R$/h)</label>
                                        <input
                                            type="number" step="0.01"
                                            value={formData.custo_h_impressao}
                                            onChange={e => handleChange('custo_h_impressao', e.target.value)}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Hora Pintura (R$/h)</label>
                                        <input
                                            type="number" step="0.01"
                                            value={formData.custo_h_pintura}
                                            onChange={e => handleChange('custo_h_pintura', e.target.value)}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Margens de Lucro */}
                            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 shadow-[var(--shadow-md)]">
                                <h2 className="text-xl font-black mb-6 flex items-center gap-3 tracking-tight">
                                    <Percent className="text-orange-500" size={24} /> Margens de Lucro
                                </h2>
                                <div className="grid gap-6 md:grid-cols-3">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-black uppercase tracking-widest text-orange-500 ml-1">Margem Estilizado</label>
                                        <input
                                            type="number" step="0.01"
                                            value={formData.margem_pobre}
                                            onChange={e => handleChange('margem_pobre', e.target.value)}
                                            className="w-full bg-[var(--input-bg)] border border-orange-500/20 rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                        />
                                        <p className="text-[10px] text-[var(--text-muted)] font-medium ml-1">Ex: 1.15 = 15% de lucro base (Sem Pintura)</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Margem Colorido</label>
                                        <input
                                            type="number" step="0.01"
                                            value={formData.margem_basica}
                                            onChange={e => handleChange('margem_basica', e.target.value)}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                        />
                                        <p className="text-[10px] text-[var(--text-muted)] font-medium ml-1">Ex: 1.30 = 30% de lucro final</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Taxa Cartão (Global)</label>
                                        <input
                                            type="number" step="0.01"
                                            value={formData.taxa_cartao}
                                            onChange={e => handleChange('taxa_cartao', e.target.value)}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                        />
                                        <p className="text-[10px] text-[var(--text-muted)] font-medium ml-1">Ex: 1.15 = 15% de acréscimo final</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Banner de atalho para Marketing */}
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Sparkles size={18} className="text-orange-500 shrink-0" />
                                <span className="text-xs text-zinc-300">
                                    Desconto de primeira compra: <strong className="text-white">{formData.desconto_primeira_compra}%</strong> • Modal de captação: <strong className="text-white">{formData.desconto_captacao}%</strong> (a cada {formData.modal_intervalo_dias}d)
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => changeTab('marketing')}
                                className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                                Ajustar Marketing <ArrowRight size={14} />
                            </button>
                        </div>

                        <button
                            disabled={saving}
                            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-5 rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-3 text-lg cursor-pointer"
                        >
                            {saving ? <Loader2 className="animate-spin" /> : <><Save size={24} /> SALVAR PREÇOS E TAXAS</>}
                        </button>
                    </form>
                )}

                {/* Card: Manutenção e Sincronização de Imagens (ImageKit & Planilha) */}
                {activeTab === 'sync' && (
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 shadow-[var(--shadow-md)] space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--card-border)]">
                        <div>
                            <h2 className="text-xl font-black flex items-center gap-3 tracking-tight">
                                <ImageIcon className="text-orange-500" size={24} /> Sincronização de Imagens ({scanResult?.activeProvider === 'imagekit' ? 'ImageKit' : 'Cloudflare R2'})
                            </h2>
                            <p className="text-[var(--text-muted)] text-xs mt-1 font-medium">
                                Detecte e corrija descasamentos de nomes de figuras e arquivos no storage ativo ({scanResult?.activeProvider === 'imagekit' ? 'ImageKit' : 'Cloudflare R2'}) após exclusões ou renomeações de versões.
                            </p>
                        </div>
                    </div>

                    {/* Seleção de Abas */}
                    <div className="flex flex-wrap gap-2">
                        {['ALL', 'Games', 'Marvel', 'DC', 'Random', 'Anime'].map(tab => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => { setSelectedTab(tab); setScanResult(null); setSyncResults(null); }}
                                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    selectedTab === tab
                                        ? 'bg-orange-500 text-white shadow-sm'
                                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                                }`}
                            >
                                {tab === 'ALL' ? 'Todas as Abas' : tab}
                            </button>
                        ))}
                    </div>

                    {/* Botão de Análise */}
                    <div>
                        <button
                            type="button"
                            disabled={isScanning || isSyncing}
                            onClick={handleScanImages}
                            className="w-full bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-850 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer"
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 size={16} className="animate-spin text-orange-500" />
                                    Analisando Planilha & Storage...
                                </>
                            ) : (
                                <>
                                    <Search size={16} className="text-orange-500" />
                                    Analisar Descasamentos {selectedTab !== 'ALL' ? `(${selectedTab})` : ''}
                                </>
                            )}
                        </button>
                    </div>

                    {/* Resultados do Scan */}
                    {scanResult && (
                        <div className="space-y-4 pt-4 border-t border-[var(--card-border)] animate-in fade-in duration-300">
                            {scanResult.totalMismatches === 0 ? (
                                <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-4 text-emerald-400">
                                    <CheckCircle2 size={24} className="shrink-0" />
                                    <div>
                                        <div className="font-black text-sm">Tudo 100% Sincronizado!</div>
                                        <div className="text-xs text-emerald-500/80 mt-0.5">
                                            Nenhum descasamento encontrado em {scanResult.totalRowsScanned} linhas analisadas na aba {selectedTab === 'ALL' ? 'todas' : selectedTab}.
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-400">
                                        <div className="flex items-center gap-3">
                                            <AlertTriangle size={20} className="shrink-0" />
                                            <div className="text-xs font-bold">
                                                <strong>{scanResult.totalMismatches}</strong> descasamento(s) encontrado(s) entre o nome da figura e o arquivo no {scanResult.activeProvider === 'imagekit' ? 'ImageKit' : 'Cloudflare R2'}.
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
                                                    Renomeando no Storage & Atualizando Planilha... ({syncProgress?.current || 0}/{syncProgress?.total || selectedMismatchIndexes.length})
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
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
            </div>
        }>
            <SettingsContent />
        </Suspense>
    );
}

