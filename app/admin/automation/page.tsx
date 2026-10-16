'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
    ArrowLeft,
    Sparkles, 
    FolderSearch, 
    CheckCircle2, 
    RefreshCw, 
    ArrowRight, 
    Terminal, 
    Trash2, 
    Copy, 
    FileArchive, 
    Check, 
    Eye,
    Wand2,
    UploadCloud,
    Search,
    Play,
    Box,
    Layers,
    HardDrive
} from 'lucide-react';
import { toast } from 'sonner';
import ArchivePreviewModal from '@/components/Admin/ArchivePreviewModal';

interface ScannedFile {
    name: string;
    size: number;
    sizeFormatted: string;
    extension: string;
    path: string;
}

interface AnalyzedItem {
    originalFile: string;
    proposedName: string;
    targetFolder: string;
    confidence: number;
    rationale: string;
    selected: boolean;
}

export default function AutomationPage() {
    const [baseFolder, setBaseFolder] = useState('D:\\rcssp\\Downloads\\3d\\3 - Com suporte\\04 - Random');
    const [loadingScan, setLoadingScan] = useState(false);
    const [loadingAnalyze, setLoadingAnalyze] = useState(false);
    const [loadingExecute, setLoadingExecute] = useState(false);
    
    const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
    const [categoryFolders, setCategoryFolders] = useState<string[]>([]);
    const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([]);
    const [moveToCategory, setMoveToCategory] = useState(true);

    // Modal de Preview de Compactados (50ms Stream RAM)
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewArchive, setPreviewArchive] = useState<{ path: string; name: string; category?: string } | null>(null);
    const [organizedArchives, setOrganizedArchives] = useState<any[]>([]);
    const [loadingOrganized, setLoadingOrganized] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
    const [showOnlyPending, setShowOnlyPending] = useState(true);

    const fetchOrganizedArchives = async () => {
        setLoadingOrganized(true);
        try {
            const res = await fetch('/api/admin/automation/list-organized-archives');
            const data = await res.json();
            if (data.archives) setOrganizedArchives(data.archives);
        } catch (e) {
            console.error('Erro ao buscar pacotes organizados:', e);
        } finally {
            setLoadingOrganized(false);
        }
    };

    // Terminal de logs
    const [logs, setLogs] = useState<string[]>([]);
    const [runningScript, setRunningScript] = useState<string | null>(null);
    const terminalEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchOrganizedArchives();
    }, []);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // 1. Escanear pasta local
    const handleScan = async () => {
        setLoadingScan(true);
        setAnalyzedItems([]);
        addLog(`Varredura iniciada em: ${baseFolder}`);
        try {
            const res = await fetch(`/api/admin/automation/scan?folderPath=${encodeURIComponent(baseFolder)}`);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Erro ao escanear pasta');

            setScannedFiles(data.files || []);
            setCategoryFolders(data.categoryFolders || []);
            addLog(`Varredura concluída: ${data.totalFiles} arquivos encontrados.`);
            toast.success(`${data.totalFiles} arquivos encontrados.`);
        } catch (err: any) {
            addLog(`Erro: ${err.message}`);
            toast.error(err.message || 'Falha ao escanear');
        } finally {
            setLoadingScan(false);
        }
    };

    // 2. Analisar com IA
    const handleAnalyze = async () => {
        if (!scannedFiles.length) {
            toast.error('Escaneie a pasta primeiro.');
            return;
        }

        setLoadingAnalyze(true);
        addLog(`Analisando ${scannedFiles.length} arquivos com Gemini Flash...`);
        try {
            const res = await fetch('/api/admin/automation/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: scannedFiles.map(f => f.name) })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Erro na análise de IA');

            const items: AnalyzedItem[] = (data.results || []).map((r: any) => ({
                ...r,
                selected: true
            }));

            setAnalyzedItems(items);
            addLog(`Análise concluída para ${items.length} itens.`);
            toast.success('Propostas geradas!');
        } catch (err: any) {
            addLog(`Erro na análise: ${err.message}`);
            toast.error(err.message || 'Falha na análise');
        } finally {
            setLoadingAnalyze(false);
        }
    };

    // 3. Executar Renomeação
    const handleExecute = async () => {
        const selected = analyzedItems.filter(i => i.selected);
        if (!selected.length) {
            toast.error('Nenhum arquivo selecionado.');
            return;
        }

        setLoadingExecute(true);
        addLog(`Renomeando ${selected.length} arquivos...`);

        try {
            const res = await fetch('/api/admin/automation/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    baseFolder,
                    items: selected.map(i => ({
                        originalName: i.originalFile,
                        newName: i.proposedName,
                        targetFolder: i.targetFolder,
                        moveToCategory
                    }))
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro na execução');

            data.logs?.forEach((l: any) => {
                if (l.success) {
                    addLog(`[OK] ${l.original} ➔ ${l.final}`);
                } else {
                    addLog(`[FALHA] ${l.original}: ${l.error}`);
                }
            });

            toast.success(`${data.successCount} arquivos organizados com sucesso.`);
            await handleScan();
            await fetchOrganizedArchives();
        } catch (err: any) {
            addLog(`Erro: ${err.message}`);
            toast.error(err.message || 'Falha ao executar');
        } finally {
            setLoadingExecute(false);
        }
    };

    // 4. Executar script local
    const handleRunScript = async (scriptType: string, scriptLabel: string) => {
        setRunningScript(scriptType);
        addLog(`Executando: ${scriptLabel}...`);

        try {
            const response = await fetch('/api/admin/automation/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scriptType })
            });

            if (!response.body) throw new Error('Streaming não suportado.');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: streamDone } = await reader.read();
                done = streamDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.replace('data: ', '').trim();
                            if (!dataStr) continue;
                            try {
                                const parsed = JSON.parse(dataStr);
                                if (parsed.text) addLog(parsed.text);
                                if (parsed.done) {
                                    if (parsed.code === 0) {
                                        toast.success(`${scriptLabel} concluído!`);
                                        fetchOrganizedArchives();
                                    } else {
                                        toast.error(`${scriptLabel} finalizou com avisos.`);
                                    }
                                }
                            } catch {
                                addLog(dataStr);
                            }
                        }
                    }
                }
            }
        } catch (err: any) {
            addLog(`Erro: ${err.message}`);
            toast.error(err.message || 'Falha ao rodar script');
        } finally {
            setRunningScript(null);
        }
    };

    const toggleSelect = (idx: number) => {
        setAnalyzedItems(prev => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item));
    };

    const uniqueCategories = Array.from(new Set(organizedArchives.map(a => a.category))).filter(Boolean);
    const readyCoversCount = organizedArchives.filter(a => a.hasWebpCover).length;
    const pendingCoversCount = organizedArchives.length - readyCoversCount;

    // Filtro dos pacotes organizados
    const filteredOrganized = organizedArchives.filter(arc => {
        if (showOnlyPending && arc.hasWebpCover) return false;
        const matchesCategory = selectedCategoryFilter === 'all' || arc.category === selectedCategoryFilter;
        const matchesSearch = !searchFilter || 
            arc.figureName.toLowerCase().includes(searchFilter.toLowerCase()) ||
            arc.name.toLowerCase().includes(searchFilter.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="w-full text-zinc-100 relative overflow-x-hidden space-y-6 pb-12">
            {/* Background Effects nativos do painel Franga Toys */}
            <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-600/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Modal de Preview de Compactados (50ms Stream RAM) */}
            {previewArchive && (
                <ArchivePreviewModal
                    isOpen={previewModalOpen}
                    onClose={() => setPreviewArchive(null)}
                    archivePath={previewArchive.path}
                    figureName={previewArchive.name}
                    categoryName={previewArchive.category}
                    onSaved={() => fetchOrganizedArchives()}
                />
            )}

            {/* Cabeçalho no padrão oficial do Admin (igual a Estúdios e Catálogo) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5 flex-wrap">
                    <Link 
                        href="/admin" 
                        className="p-3 bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400 rounded-2xl transition-all shadow-lg text-zinc-500 group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
                            Automação de <span className="text-orange-500">Catálogo</span>
                        </h1>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">
                            Triagem local, prévia de compactados e sincronização.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-1.5 bg-zinc-950/80 border border-zinc-900 rounded-2xl w-fit">
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>3 - Com suporte</span>
                    </div>
                </div>
            </div>

            {/* SEÇÃO 1: TRIAGEM DE ARQUIVOS BRUTOS */}
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 shadow-sm space-y-4 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <FolderSearch className="w-4 h-4 text-orange-500" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                            1. Triagem de Downloads & Nomenclatura IA
                        </h3>
                    </div>

                    <label className="text-xs text-zinc-400 flex items-center gap-2 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={moveToCategory} 
                            onChange={(e) => setMoveToCategory(e.target.checked)}
                            className="rounded text-orange-500 focus:ring-orange-500 border-zinc-700 bg-zinc-900"
                        />
                        <span className="font-medium">Mover para pasta de categoria</span>
                    </label>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 focus-within:border-orange-500 transition-all">
                        <FolderSearch className="w-4 h-4 text-zinc-500 shrink-0" />
                        <input
                            type="text"
                            value={baseFolder}
                            onChange={(e) => setBaseFolder(e.target.value)}
                            placeholder="Caminho da pasta..."
                            className="bg-transparent border-none text-xs font-mono w-full focus:outline-none text-zinc-200 placeholder:text-zinc-600"
                        />
                    </div>

                    <button
                        onClick={handleScan}
                        disabled={loadingScan}
                        className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingScan ? 'animate-spin' : ''}`} />
                        {loadingScan ? 'Escaneando...' : 'Escanear'}
                    </button>

                    <button
                        onClick={handleAnalyze}
                        disabled={loadingAnalyze || scannedFiles.length === 0}
                        className="py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
                    >
                        <Sparkles className={`w-3.5 h-3.5 ${loadingAnalyze ? 'animate-spin' : ''}`} />
                        {loadingAnalyze ? 'Analisando...' : 'Analisar com IA'}
                    </button>
                </div>

                {/* Resultados da Varredura */}
                {scannedFiles.length > 0 && analyzedItems.length === 0 && (
                    <div className="space-y-2 pt-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                            {scannedFiles.length} arquivos soltos encontrados:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1 custom-scrollbar">
                            {scannedFiles.map((file, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-xs font-mono">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <FileArchive className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                        <span className="truncate text-zinc-300" title={file.name}>{file.name}</span>
                                    </div>
                                    <span className="text-zinc-500 text-[10px] font-bold ml-2 shrink-0">{file.sizeFormatted}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Propostas da IA */}
                {analyzedItems.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-orange-400">
                                Propostas ({analyzedItems.filter(i => i.selected).length}/{analyzedItems.length}):
                            </span>
                            <button
                                onClick={handleExecute}
                                disabled={loadingExecute}
                                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                            >
                                <Check className="w-3.5 h-3.5" />
                                {loadingExecute ? 'Executando...' : 'Aplicar Renomeação'}
                            </button>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                            {analyzedItems.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => toggleSelect(idx)}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                                        item.selected 
                                            ? 'bg-orange-500/10 border-orange-500/40 text-white' 
                                            : 'bg-zinc-900/20 border-zinc-800/50 text-zinc-500 opacity-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1 font-mono">
                                        <input 
                                            type="checkbox" 
                                            checked={item.selected} 
                                            onChange={() => {}} 
                                            className="rounded text-orange-500 focus:ring-orange-500 border-zinc-700 bg-zinc-900 shrink-0"
                                        />
                                        <span className="text-zinc-400 truncate">{item.originalFile}</span>
                                        <ArrowRight className="w-3 h-3 text-orange-400 shrink-0" />
                                        <span className="font-bold text-orange-300 truncate">{item.proposedName}</span>
                                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 shrink-0">
                                            ➔ {item.targetFolder}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-orange-400 shrink-0">
                                        {Math.round(item.confidence * 100)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* SEÇÃO 2: PACOTES ORGANIZADOS & CAPAS */}
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 shadow-sm space-y-5 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Box className="w-4 h-4 text-orange-500" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                            2. Capas dos Pacotes (Extração RAM 50ms)
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold">
                            {readyCoversCount}/{organizedArchives.length} prontas
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Tab Switcher no padrão oficial do Admin */}
                        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                            <button
                                onClick={() => setShowOnlyPending(true)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                    showOnlyPending 
                                        ? 'bg-orange-500 text-white shadow-sm' 
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                Sem Capa ({pendingCoversCount})
                            </button>
                            <button
                                onClick={() => setShowOnlyPending(false)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                    !showOnlyPending 
                                        ? 'bg-orange-500 text-white shadow-sm' 
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                Todas ({organizedArchives.length})
                            </button>
                        </div>

                        <button
                            onClick={fetchOrganizedArchives}
                            disabled={loadingOrganized}
                            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-all"
                            title="Atualizar lista"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingOrganized ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filtros de Categoria & Busca no padrão do Admin */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                        <button
                            onClick={() => setSelectedCategoryFilter('all')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                                selectedCategoryFilter === 'all'
                                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                    : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800'
                            }`}
                        >
                            Todas {showOnlyPending ? `(${pendingCoversCount})` : `(${organizedArchives.length})`}
                        </button>
                        {uniqueCategories.map(cat => {
                            const count = organizedArchives.filter(a => a.category === cat && (!showOnlyPending || !a.hasWebpCover)).length;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategoryFilter(cat)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                                        selectedCategoryFilter === cat
                                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                            : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800'
                                    }`}
                                >
                                    {cat} ({count})
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                        <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="Buscar figura..."
                            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 outline-none focus:border-orange-500 placeholder:text-zinc-600 transition-all"
                        />
                    </div>
                </div>

                {/* Grade de Cards das Figuras */}
                {loadingOrganized ? (
                    <div className="flex items-center justify-center p-12 text-zinc-500 text-xs gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
                        Carregando pacotes do HD...
                    </div>
                ) : filteredOrganized.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/80 text-xs flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="font-bold text-white text-sm">Tudo pronto!</span>
                            <p className="text-zinc-500 mt-1">
                                {showOnlyPending 
                                    ? 'Nenhum pacote pendente de capa nesta categoria.' 
                                    : 'Nenhum pacote encontrado com os filtros atuais.'}
                            </p>
                        </div>
                        {showOnlyPending && organizedArchives.length > 0 && (
                            <button 
                                onClick={() => setShowOnlyPending(false)}
                                className="text-orange-400 hover:text-orange-300 font-bold text-xs mt-1"
                            >
                                Exibir todas as {organizedArchives.length} figuras já com foto ➔
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {filteredOrganized.map((arc, i) => (
                            <div 
                                key={i}
                                className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-orange-500/40 transition-all flex flex-col justify-between gap-3 group"
                            >
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold truncate">
                                            {arc.category}
                                        </span>
                                        {arc.hasWebpCover ? (
                                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                                                <CheckCircle2 className="w-3 h-3" />
                                                OK
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-amber-400 font-bold shrink-0">
                                                Sem Foto
                                            </span>
                                        )}
                                    </div>

                                    <h4 className="text-sm font-bold text-white truncate" title={arc.figureName}>
                                        {arc.figureName}
                                    </h4>
                                    <p className="text-[10px] text-zinc-500 truncate font-mono" title={arc.name}>
                                        {arc.name}
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        setPreviewArchive({
                                            path: arc.fullPath,
                                            name: arc.figureName,
                                            category: arc.category
                                        });
                                        setPreviewModalOpen(true);
                                    }}
                                    className="w-full py-2 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    Inspecionar (50ms)
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SEÇÃO 3: AÇÕES DA ESTEIRA (SCRIPTS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                {/* Script 1: Otimizar Imagens & Ícones */}
                <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                            <Wand2 className="w-4 h-4 text-emerald-400" />
                            Otimizar WebP & Ícones
                        </div>
                        <p className="text-xs text-zinc-500 truncate mt-1">
                            Gera WebP e .ico de pasta para o Windows Explorer (Script.ps1)
                        </p>
                    </div>

                    <button
                        onClick={() => handleRunScript('powershell_imagens', 'Script.ps1 - Passo 2')}
                        disabled={runningScript !== null}
                        className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                    >
                        <Play className={`w-3.5 h-3.5 ${runningScript === 'powershell_imagens' ? 'animate-spin' : ''}`} />
                        {runningScript === 'powershell_imagens' ? 'Rodando...' : 'Executar'}
                    </button>
                </div>

                {/* Script 2: Publicar Nuvem */}
                <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-900 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                            <UploadCloud className="w-4 h-4 text-orange-500" />
                            Publicar na Nuvem & Sync
                        </div>
                        <p className="text-xs text-zinc-500 truncate mt-1">
                            Upload CDN ImageKit e sincronização Supabase (lojinha3d.bat)
                        </p>
                    </div>

                    <button
                        onClick={() => handleRunScript('lojinha3d', 'lojinha3d.bat')}
                        disabled={runningScript !== null}
                        className="py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wider text-xs flex items-center gap-1.5 transition-all shrink-0 shadow-md shadow-orange-500/20 disabled:opacity-50"
                    >
                        <Play className={`w-3.5 h-3.5 ${runningScript === 'lojinha3d' ? 'animate-spin' : ''}`} />
                        {runningScript === 'lojinha3d' ? 'Rodando...' : 'Sincronizar'}
                    </button>
                </div>
            </div>

            {/* CONSOLE TERMINAL DE LOGS */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 shadow-sm space-y-3 relative z-10">
                <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-xs font-mono font-bold text-zinc-300">
                            Terminal
                        </span>
                        {runningScript && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                {runningScript}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(logs.join('\n'));
                                toast.success('Copiado!');
                            }}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors"
                            title="Copiar"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => setLogs([])}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors"
                            title="Limpar"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="h-44 overflow-y-auto font-mono text-[11px] text-zinc-300 space-y-1 custom-scrollbar pr-1 select-text bg-black/40 rounded-xl p-3 border border-zinc-900">
                    {logs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
                            Aguardando comandos da esteira...
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="leading-relaxed break-all">
                                {log}
                            </div>
                        ))
                    )}
                    <div ref={terminalEndRef} />
                </div>
            </div>
        </div>
    );
}
