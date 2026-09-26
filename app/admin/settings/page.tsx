'use client';

import { useState, useEffect } from 'react';
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
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';

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

export default function SettingsPage() {
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
        taxa_cartao: 1.15
    });

    // Estados da ferramenta de Sincronização de Imagens
    const [selectedTab, setSelectedTab] = useState<string>('ALL');
    const [onlyVersions, setOnlyVersions] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [scanResult, setScanResult] = useState<{
        tabsScanned: string[];
        totalRowsScanned: number;
        totalMismatches: number;
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
            setFormData(data);
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
            const res = await fetch(`/api/admin/tools/sync-images?tab=${selectedTab}&onlyVersions=${onlyVersions}`);
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
        if (!confirm(`Deseja renomear ${itemsToSync.length} imagem(ns) no ImageKit e atualizar na Planilha e no Banco de Dados?`)) return;

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
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 transition-colors duration-300">
            <div className="max-w-3xl mx-auto space-y-10">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 bg-[var(--card-bg)] border border-[var(--card-border)] hover:bg-[var(--input-bg)] rounded-xl transition-all shadow-sm text-[var(--text-muted)] hover:text-orange-500">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Configurações & Ferramentas</h1>
                        <p className="text-[var(--text-muted)] font-medium text-sm">Ajuste custos operacionais e faça manutenção do catálogo.</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-8">
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
                                        className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleAddResin}
                                        className="bg-zinc-900 border border-zinc-800 hover:border-orange-500 text-orange-500 p-3.5 rounded-xl transition-all shadow-sm active:scale-95"
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

                    <button
                        disabled={saving}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-5 rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-3 text-lg cursor-pointer"
                    >
                        {saving ? <Loader2 className="animate-spin" /> : <><Save size={24} /> SALVAR PREÇOS E TAXAS</>}
                    </button>
                </form>

                {/* Card: Manutenção e Sincronização de Imagens (ImageKit & Planilha) */}
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 shadow-[var(--shadow-md)] space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--card-border)]">
                        <div>
                            <h2 className="text-xl font-black flex items-center gap-3 tracking-tight">
                                <ImageIcon className="text-orange-500" size={24} /> Sincronização de Imagens (ImageKit)
                            </h2>
                            <p className="text-[var(--text-muted)] text-xs mt-1 font-medium">
                                Detecte e corrija descasamentos de nomes de figuras e arquivos no ImageKit após exclusões ou renomeações de versões.
                            </p>
                        </div>
                    </div>

                    {/* Seleção de Abas & Filtros */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-400 hover:text-zinc-200">
                            <input
                                type="checkbox"
                                checked={onlyVersions}
                                onChange={e => { setOnlyVersions(e.target.checked); setScanResult(null); setSyncResults(null); }}
                                className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                            />
                            Apenas versões divergentes (v1 vs v2)
                        </label>
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
                                    Analisando Planilha & ImageKit...
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
                                                <strong>{scanResult.totalMismatches}</strong> descasamento(s) encontrado(s) entre o nome da figura e o arquivo no ImageKit.
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
                                                    Renomeando no ImageKit & Atualizando Planilha... ({syncProgress?.current || 0}/{syncProgress?.total || selectedMismatchIndexes.length})
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
            </div>
        </div>
    );
}

