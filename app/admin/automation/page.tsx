'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
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
    HardDrive,
    Database,
    FileSpreadsheet,
    Brain,
    Rocket,
    Pencil,
    Disc,
    Cpu,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import ArchivePreviewModal from '@/components/Admin/ArchivePreviewModal';

const BaseArtGenerator = dynamic(
    () => import('@/components/Admin/BaseArtGenerator/BaseArtGenerator'),
    {
        ssr: false,
        loading: () => (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Carregando Gerador de Arte para Base...
                </p>
            </div>
        )
    }
);

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

function AutomationPageContent() {
    const searchParams = useSearchParams();
    const [currentTab, setCurrentTab] = useState<'automation' | 'base'>(() => {
        return searchParams?.get('tab') === 'base' ? 'base' : 'automation';
    });

    useEffect(() => {
        const tab = searchParams?.get('tab');
        if (tab === 'base') {
            setCurrentTab('base');
        } else if (tab === 'automation') {
            setCurrentTab('automation');
        }
    }, [searchParams]);

    const [baseFolder, setBaseFolder] = useState('D:\\rcssp\\Downloads\\3d\\3 - Com suporte');
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
    const terminalContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchOrganizedArchives();
    }, []);

    useEffect(() => {
        // Rola apenas dentro da caixinha do terminal, sem rolar a janela principal do usuário
        if (terminalContainerRef.current) {
            terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
        }
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

    const updateProposedName = (idx: number, newName: string) => {
        setAnalyzedItems(prev => prev.map((item, i) => i === idx ? { ...item, proposedName: newName } : item));
    };

    const updateTargetFolder = (idx: number, newFolder: string) => {
        setAnalyzedItems(prev => prev.map((item, i) => i === idx ? { ...item, targetFolder: newFolder } : item));
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

            {/* Cabeçalho no padrão oficial do Admin */}
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
                            {currentTab === 'base' ? (
                                <>Gerador de <span className="text-orange-500">Base</span></>
                            ) : (
                                <>Automação de <span className="text-orange-500">Catálogo</span></>
                            )}
                        </h1>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-80">
                            {currentTab === 'base'
                                ? 'Recorte milimétrico de arte e silhueta STL para adesivo de base 1:1.'
                                : 'Triagem local, prévia de compactados e sincronização do acervo.'}
                        </p>
                    </div>
                </div>

                {/* Abas Superiores */}
                <div className="flex items-center gap-1.5 p-1.5 bg-zinc-950/80 border border-zinc-800 rounded-2xl w-fit">
                    <button
                        onClick={() => setCurrentTab('automation')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            currentTab === 'automation'
                                ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                    >
                        <Cpu size={15} />
                        <span>Automação & IA</span>
                    </button>
                    <button
                        onClick={() => setCurrentTab('base')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            currentTab === 'base'
                                ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                    >
                        <Disc size={15} />
                        <span>Gerador de Base</span>
                    </button>
                </div>
            </div>

            {currentTab === 'base' ? (
                <div className="relative z-10 pt-2 animate-in fade-in duration-200">
                    <BaseArtGenerator />
                </div>
            ) : (
                <>

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
                        {loadingAnalyze ? 'Analisando...' : 'Analisar'}
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

                        <div className="space-y-2 max-h-80 overflow-y-auto p-1 custom-scrollbar">
                            {analyzedItems.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                                        item.selected 
                                            ? 'bg-orange-500/10 border-orange-500/40 text-white' 
                                            : 'bg-zinc-900/20 border-zinc-800/50 text-zinc-500 opacity-60'
                                    }`}
                                >
                                    {/* Arquivo Original + Checkbox */}
                                    <div 
                                        onClick={() => toggleSelect(idx)}
                                        className="flex items-center gap-2.5 min-w-0 md:w-1/3 cursor-pointer select-none group"
                                        title="Clique para selecionar / desmarcar"
                                    >
                                        <input 
                                            type="checkbox" 
                                            checked={item.selected} 
                                            onChange={() => toggleSelect(idx)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="rounded text-orange-500 focus:ring-orange-500 border-zinc-700 bg-zinc-900 shrink-0 cursor-pointer"
                                        />
                                        <span className="text-zinc-400 font-mono text-[11px] truncate group-hover:text-zinc-200 transition-colors" title={item.originalFile}>
                                            {item.originalFile}
                                        </span>
                                    </div>

                                    {/* Seta + Nome Proposto Editável */}
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <ArrowRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                        <div className="relative flex-1 group">
                                            <input
                                                type="text"
                                                value={item.proposedName}
                                                onChange={(e) => updateProposedName(idx, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                placeholder="Nome final (ex: Categoria - Franquia - Personagem.zip)"
                                                className="w-full bg-zinc-950/90 border border-orange-500/30 hover:border-orange-500/60 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 rounded-lg pl-8 pr-3 py-1.5 font-mono text-xs text-orange-300 font-bold transition-all outline-none"
                                                title="Edite o nome final do arquivo antes de aplicar a renomeação"
                                            />
                                            <Pencil className="w-3 h-3 text-orange-400/60 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-orange-400 transition-colors" />
                                        </div>
                                    </div>

                                    {/* Pasta de Destino + Confiança */}
                                    <div className="flex items-center gap-2 shrink-0 justify-end">
                                        {categoryFolders && categoryFolders.length > 0 ? (
                                            <select
                                                value={item.targetFolder}
                                                onChange={(e) => updateTargetFolder(idx, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 focus:border-orange-500 text-[11px] font-mono text-zinc-300 rounded-lg px-2.5 py-1.5 outline-none transition-colors cursor-pointer"
                                                title="Pasta de destino onde o arquivo será movido"
                                            >
                                                {categoryFolders.map(cf => (
                                                    <option key={cf} value={cf}>➔ {cf}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
                                                ➔ {item.targetFolder}
                                            </span>
                                        )}

                                        <span className="text-[10px] font-bold text-orange-400 shrink-0 px-1.5 py-0.5 rounded bg-orange-500/10">
                                            {Math.round(item.confidence * 100)}%
                                        </span>
                                    </div>
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

            {/* SEÇÃO 3: SCRIPTS E SINCRONIZAÇÃO (lojinha3d.bat & .py individuais) */}
            <div className="space-y-4 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-zinc-900">
                    <div>
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <Rocket className="w-4 h-4 text-orange-500" />
                            Ações da Esteira & Nuvem (Scripts Python)
                        </h2>
                        <p className="text-xs text-zinc-500">
                            Execute cada etapa individualmente ou rode o pipeline completo (lojinha3d.bat).
                        </p>
                    </div>

                    {/* Botão de Pipeline Completo */}
                    <button
                        onClick={() => handleRunScript('lojinha3d', 'Pipeline Completo (lojinha3d.bat)')}
                        disabled={runningScript !== null}
                        className="py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wider text-xs flex items-center gap-2 transition-all shrink-0 shadow-lg shadow-orange-500/20 disabled:opacity-50"
                    >
                        <Play className={`w-3.5 h-3.5 ${runningScript === 'lojinha3d' ? 'animate-spin' : ''}`} />
                        {runningScript === 'lojinha3d' ? 'Executando Pipeline...' : 'Executar Todos (lojinha3d.bat)'}
                    </button>
                </div>

                {/* Grade dos 6 passos ordenados rigorosamente de 1 a 6 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Passo 1: Criar Pastas */}
                    <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-900 flex items-center justify-between gap-3 hover:border-zinc-800 transition-colors">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-bold text-white">
                                <FolderSearch className="w-4 h-4 text-amber-500" />
                                1. Criar Pastas (Script.ps1 - Passo 1)
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                Cria uma pasta para cada RAR/ZIP solto e move para dentro
                            </p>
                        </div>
                        <button
                            onClick={() => handleRunScript('powershell_organizar', '1. Criar Pastas (Script.ps1)')}
                            disabled={runningScript !== null}
                            className="py-2 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-50"
                        >
                            <Play className={`w-3 h-3 ${runningScript === 'powershell_organizar' ? 'animate-spin' : ''}`} />
                            {runningScript === 'powershell_organizar' ? 'Rodando...' : 'Rodar'}
                        </button>
                    </div>

                    {/* Passo 2: WebP e GSheets */}
                    <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-900 flex items-center justify-between gap-3 hover:border-zinc-800 transition-colors">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-bold text-white">
                                <Wand2 className="w-4 h-4 text-violet-400" />
                                2. WebP e GSheets (Script.ps1 - Passo 2)
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                Otimiza para WebP, gera ícones do Windows e atualiza a Planilha
                            </p>
                        </div>
                        <button
                            onClick={() => handleRunScript('powershell_imagens', '2. WebP e GSheets (Script.ps1)')}
                            disabled={runningScript !== null}
                            className="py-2 px-3 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-50"
                        >
                            <Play className={`w-3 h-3 ${runningScript === 'powershell_imagens' ? 'animate-spin' : ''}`} />
                            {runningScript === 'powershell_imagens' ? 'Rodando...' : 'Rodar'}
                        </button>
                    </div>

                    {/* Passo 3: Upload de Imagens */}
                    <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-900 flex items-center justify-between gap-3 hover:border-zinc-800 transition-colors">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-bold text-white">
                                <UploadCloud className="w-4 h-4 text-cyan-400" />
                                3. Upload de Imagens (upload.py)
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                Envia fotos para o Cloudflare R2 / ImageKit e preenche coluna Imagem no Sheets
                            </p>
                        </div>
                        <button
                            onClick={() => handleRunScript('upload', '3. Upload de Imagens (upload.py)')}
                            disabled={runningScript !== null}
                            className="py-2 px-3 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-50"
                        >
                            <Play className={`w-3 h-3 ${runningScript === 'upload' ? 'animate-spin' : ''}`} />
                            {runningScript === 'upload' ? 'Rodando...' : 'Rodar'}
                        </button>
                    </div>

                    {/* Passo 4: Planilha ➔ Supabase */}
                    <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-900 flex items-center justify-between gap-3 hover:border-zinc-800 transition-colors">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-bold text-white">
                                <Database className="w-4 h-4 text-emerald-400" />
                                4. Planilha ➔ Supabase (importar.py)
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                Lê todas as abas da Planilha e sincroniza no banco Supabase
                            </p>
                        </div>
                        <button
                            onClick={() => handleRunScript('importar', '4. Planilha ➔ Supabase (importar.py)')}
                            disabled={runningScript !== null}
                            className="py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-50"
                        >
                            <Play className={`w-3 h-3 ${runningScript === 'importar' ? 'animate-spin' : ''}`} />
                            {runningScript === 'importar' ? 'Rodando...' : 'Rodar'}
                        </button>
                    </div>

                    {/* Passo 5: Supabase ➔ Planilha */}
                    <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-900 flex items-center justify-between gap-3 hover:border-zinc-800 transition-colors">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-bold text-white">
                                <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                                5. Supabase ➔ Planilha (atualizar.py)
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                Atualiza IDs do Supabase de volta na coluna ID do Google Sheets
                            </p>
                        </div>
                        <button
                            onClick={() => handleRunScript('atualizar', '5. Supabase ➔ Planilha (atualizar.py)')}
                            disabled={runningScript !== null}
                            className="py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-50"
                        >
                            <Play className={`w-3 h-3 ${runningScript === 'atualizar' ? 'animate-spin' : ''}`} />
                            {runningScript === 'atualizar' ? 'Rodando...' : 'Rodar'}
                        </button>
                    </div>

                    {/* Passo 6: Sinônimos IA */}
                    <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-900 flex items-center justify-between gap-3 hover:border-zinc-800 transition-colors">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-bold text-white">
                                <Brain className="w-4 h-4 text-purple-400" />
                                6. Sinônimos IA (gen_sinonimos.py)
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                                Gera sinônimos e palavras-chave de busca com IA no Supabase
                            </p>
                        </div>
                        <button
                            onClick={() => handleRunScript('gen_sinonimos', '6. Sinônimos IA (gen_sinonimos.py)')}
                            disabled={runningScript !== null}
                            className="py-2 px-3 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-50"
                        >
                            <Play className={`w-3 h-3 ${runningScript === 'gen_sinonimos' ? 'animate-spin' : ''}`} />
                            {runningScript === 'gen_sinonimos' ? 'Rodando...' : 'Rodar'}
                        </button>
                    </div>
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

                <div 
                    ref={terminalContainerRef}
                    className="h-96 md:h-[420px] overflow-y-auto font-mono text-[11px] text-zinc-300 space-y-1 custom-scrollbar pr-1 select-text bg-black/40 rounded-xl p-4 border border-zinc-900"
                >
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
                </div>
            </div>
            </>
            )}
        </div>
    );
}

export default function AutomationPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Carregando Automação...
                </p>
            </div>
        }>
            <AutomationPageContent />
        </Suspense>
    );
}
