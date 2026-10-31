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
    ShieldCheck,
    Loader2,
    Activity,
    Pause,
    RotateCcw
} from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import ArchivePreviewModal from '@/components/Admin/ArchivePreviewModal';
import HealthCheckPanel from '@/components/Admin/HealthCheckPanel';
import DriveIngestPanel from '@/components/Admin/DriveIngestPanel';

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
    const [currentTab, setCurrentTab] = useState<'automation' | 'base' | 'health' | 'ingest'>(() => {
        const t = searchParams?.get('tab');
        if (t === 'base') return 'base';
        if (t === 'health') return 'health';
        if (t === 'ingest') return 'ingest';
        return 'automation';
    });

    useEffect(() => {
        const tab = searchParams?.get('tab');
        if (tab === 'base') {
            setCurrentTab('base');
        } else if (tab === 'health') {
            setCurrentTab('health');
        } else if (tab === 'ingest') {
            setCurrentTab('ingest');
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
    const [autoScroll, setAutoScroll] = useState(true);
    const terminalContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchOrganizedArchives();
    }, []);

    useEffect(() => {
        // Rola apenas dentro da caixinha do terminal se autoScroll estiver ativado
        if (autoScroll && terminalContainerRef.current) {
            terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const renderLogLine = (log: string, index: number) => {
        const timeMatch = log.match(/^(\[\d{1,2}:\d{2}:\d{2}\s?(?:AM|PM)?\])\s*(.*)/i);
        let time = '';
        let body = log;
        if (timeMatch) {
            time = timeMatch[1];
            body = timeMatch[2];
        }

        const isOk = body.includes('[OK]') || body.includes('concluído') || body.includes('sucesso') || body.includes('prontas');
        const isError = body.includes('[FALHA]') || body.includes('Erro:') || body.includes('Error:') || body.includes('Falha');
        const isRunning = body.includes('Executando:') || body.includes('Iniciando') || body.includes('Analisando');

        return (
            <div key={index} className="leading-relaxed break-all flex items-start gap-2">
                {time && <span className="text-zinc-600 select-none shrink-0 font-mono text-[10px]">{time}</span>}
                <span className={clsx(
                    "font-mono text-[11px]",
                    isOk && "text-emerald-400 font-medium",
                    isError && "text-rose-400 font-medium",
                    isRunning && "text-orange-400 font-medium",
                    !isOk && !isError && !isRunning && "text-zinc-300"
                )}>
                    {body}
                </span>
            </div>
        );
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
            addLog(`Análise concluída para ${items.length} itens (Modelo: ${data.modelUsed || 'Gemini'}).`);
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
        <div className="w-full text-zinc-100 relative space-y-6 pb-12">
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

            {/* Cabeçalho no padrão Dark Matte Luxury */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3.5 flex-wrap">
                    <Link 
                        href="/admin" 
                        className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded-xl transition-all text-zinc-400 group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                            {currentTab === 'base' ? 'Gerador de Base 1:1' :
                             currentTab === 'health' ? 'Health Check & Diagnóstico' :
                             currentTab === 'ingest' ? 'Ingestão de Estúdios (Drive)' :
                             'Automação de Catálogo'}
                        </h1>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            {currentTab === 'base'
                                ? 'Recorte milimétrico de arte e silhueta STL para adesivo de base 1:1.'
                                : currentTab === 'health'
                                ? 'Radar de vulnerabilidades CVE, status ao vivo dos modelos de IA e diagnóstico da esteira.'
                                : currentTab === 'ingest'
                                ? 'Lançamentos dos 14 estúdios no Google Drive prontos para download local.'
                                : 'Triagem local, prévia de compactados e sincronização do acervo.'}
                        </p>
                    </div>
                </div>

                {/* Segmented Control Abas Superiores */}
                <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800/80 rounded-xl w-fit flex-wrap">
                    <button
                        type="button"
                        onClick={() => setCurrentTab('automation')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            currentTab === 'automation'
                                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                        }`}
                    >
                        <Cpu size={14} />
                        <span>Automação & IA</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentTab('ingest')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            currentTab === 'ingest'
                                ? 'bg-orange-500 text-white font-black shadow-md shadow-orange-500/20'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                        }`}
                    >
                        <HardDrive size={14} />
                        <span>Ingestão (Drive)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentTab('base')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            currentTab === 'base'
                                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                        }`}
                    >
                        <Disc size={14} />
                        <span>Gerador de Base</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentTab('health')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            currentTab === 'health'
                                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                        }`}
                    >
                        <ShieldCheck size={14} />
                        <span>Health Check</span>
                    </button>
                </div>
            </div>

            {/* 4 Cards Executivos de Status da Esteira */}
            {currentTab === 'automation' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Pacotes no HD */}
                    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Pacotes no HD Local</span>
                            <HardDrive size={16} className="text-zinc-500" />
                        </div>
                        <div>
                            <div className="text-xl font-bold font-mono tracking-tight text-zinc-100">
                                {organizedArchives.length} <span className="text-xs font-normal text-zinc-400 font-sans">pacotes</span>
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-1">
                                {uniqueCategories.length} categorias estruturadas
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Saúde das Capas */}
                    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Saúde das Capas WebP</span>
                            <Eye size={16} className="text-zinc-500" />
                        </div>
                        <div>
                            <div className="text-xl font-bold font-mono tracking-tight text-zinc-100">
                                {readyCoversCount} <span className="text-xs font-normal text-zinc-500 font-mono">/ {organizedArchives.length}</span>
                            </div>
                            <div className="text-[11px] font-mono mt-1">
                                {pendingCoversCount === 0 ? (
                                    <span className="text-emerald-400 font-semibold">100% com foto WebP</span>
                                ) : (
                                    <span className="text-amber-400">{pendingCoversCount} pendentes de foto</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Fila de Entrada */}
                    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Fila de Entrada</span>
                            <FolderSearch size={16} className="text-zinc-500" />
                        </div>
                        <div>
                            <div className="text-xl font-bold font-mono tracking-tight text-zinc-100">
                                {scannedFiles.length} <span className="text-xs font-normal text-zinc-400 font-sans">arquivos</span>
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-1">
                                {analyzedItems.length > 0 
                                    ? `${analyzedItems.filter(i => i.selected).length} propostas IA prontas` 
                                    : 'Aguardando varredura/análise'}
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Status da Esteira */}
                    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
                        <div className="flex items-center justify-between text-zinc-400 mb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Status da Esteira</span>
                            <Activity size={16} className={runningScript ? "text-emerald-400 animate-pulse" : "text-zinc-500"} />
                        </div>
                        <div>
                            <div className="text-base font-bold font-mono tracking-tight truncate text-zinc-100">
                                {runningScript ? (
                                    <span className="text-emerald-400 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                                        Rodando: {runningScript}
                                    </span>
                                ) : (
                                    <span className="text-zinc-300">Ociosa / Pronta</span>
                                )}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-1">
                                {runningScript ? 'Processando script em segundo plano' : 'Pipeline de 6 passos disponível'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {currentTab === 'base' ? (
                <div className="relative z-10 pt-2 animate-in fade-in duration-200">
                    <BaseArtGenerator />
                </div>
            ) : currentTab === 'health' ? (
                <div className="relative z-10 pt-2">
                    <HealthCheckPanel />
                </div>
            ) : currentTab === 'ingest' ? (
                <div className="relative z-10 pt-2 animate-in fade-in duration-200">
                    <DriveIngestPanel />
                </div>
            ) : (
                <>

            {/* SEÇÃO 1: TRIAGEM DE ARQUIVOS BRUTOS */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <FolderSearch className="w-4 h-4 text-zinc-400" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                            1. Triagem de Downloads & Nomenclatura IA
                        </h3>
                    </div>

                    <label className="text-xs text-zinc-400 flex items-center gap-2 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={moveToCategory} 
                            onChange={(e) => setMoveToCategory(e.target.checked)}
                            className="rounded text-zinc-100 focus:ring-zinc-500 border-zinc-700 bg-zinc-900"
                        />
                        <span className="font-medium">Mover para pasta de categoria</span>
                    </label>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus-within:border-zinc-600 transition-all">
                        <FolderSearch className="w-4 h-4 text-zinc-500 shrink-0" />
                        <input
                            type="text"
                            value={baseFolder}
                            onChange={(e) => setBaseFolder(e.target.value)}
                            placeholder="Caminho da pasta local..."
                            className="bg-transparent border-none text-xs font-mono w-full focus:outline-none text-zinc-200 placeholder:text-zinc-600"
                        />
                        {baseFolder !== 'D:\\rcssp\\Downloads\\3d\\3 - Com suporte' && (
                            <button
                                type="button"
                                onClick={() => setBaseFolder('D:\\rcssp\\Downloads\\3d\\3 - Com suporte')}
                                className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                                title="Restaurar pasta padrão"
                            >
                                <RotateCcw size={13} />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={handleScan}
                        disabled={loadingScan}
                        className="py-2 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingScan ? 'animate-spin' : ''}`} />
                        {loadingScan ? 'Escaneando...' : 'Escanear Pasta'}
                    </button>

                    <button
                        onClick={handleAnalyze}
                        disabled={loadingAnalyze || scannedFiles.length === 0}
                        className="py-2 px-3.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-40 cursor-pointer"
                    >
                        <Sparkles className={`w-3.5 h-3.5 ${loadingAnalyze ? 'animate-spin' : ''}`} />
                        {loadingAnalyze ? 'Analisando...' : 'Analisar com IA'}
                    </button>
                </div>

                {/* Resultados da Varredura */}
                {scannedFiles.length > 0 && analyzedItems.length === 0 && (
                    <div className="space-y-2 pt-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            {scannedFiles.length} arquivos soltos encontrados no diretório:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1 custom-scrollbar">
                            {scannedFiles.map((file, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-850 text-xs font-mono">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <FileArchive className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                        <span className="truncate text-zinc-300" title={file.name}>{file.name}</span>
                                    </div>
                                    <span className="text-zinc-500 text-[10px] ml-2 shrink-0">{file.sizeFormatted}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Propostas da IA */}
                {analyzedItems.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                                Propostas Geradas ({analyzedItems.filter(i => i.selected).length}/{analyzedItems.length}):
                            </span>
                            <button
                                onClick={handleExecute}
                                disabled={loadingExecute}
                                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
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
                                            ? 'bg-zinc-950/90 border-zinc-700/80 text-white' 
                                            : 'bg-zinc-950/40 border-zinc-900 text-zinc-500 opacity-50'
                                    }`}
                                >
                                    {/* Arquivo Original + Checkbox */}
                                    <div 
                                        onClick={() => toggleSelect(idx)}
                                        className="flex items-center gap-2.5 min-w-0 md:w-1/3 cursor-pointer select-none group"
                                        title="Clique para alternar seleção"
                                    >
                                        <input 
                                            type="checkbox" 
                                            checked={item.selected} 
                                            onChange={() => toggleSelect(idx)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="rounded text-zinc-100 focus:ring-zinc-600 border-zinc-700 bg-zinc-900 shrink-0 cursor-pointer"
                                        />
                                        <span className="text-zinc-400 font-mono text-[11px] truncate group-hover:text-zinc-200 transition-colors" title={item.originalFile}>
                                            {item.originalFile}
                                        </span>
                                    </div>

                                    {/* Seta + Nome Proposto Editável */}
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                        <div className="relative flex-1 group">
                                            <input
                                                type="text"
                                                value={item.proposedName}
                                                onChange={(e) => updateProposedName(idx, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                placeholder="Nome final (ex: Categoria - Franquia - Personagem.zip)"
                                                className="w-full bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-600 rounded-lg pl-7 pr-3 py-1 font-mono text-xs text-zinc-100 font-medium transition-all outline-none"
                                            />
                                            <Pencil className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Pasta de Destino + Confiança */}
                                    <div className="flex items-center gap-2 shrink-0 justify-end">
                                        {categoryFolders && categoryFolders.length > 0 ? (
                                            <select
                                                value={item.targetFolder}
                                                onChange={(e) => updateTargetFolder(idx, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 focus:border-zinc-600 text-[11px] font-mono text-zinc-300 rounded-lg px-2.5 py-1 outline-none transition-colors cursor-pointer"
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

                                        <span className="text-[10px] font-mono font-bold text-zinc-400 shrink-0 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
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
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-4 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <Box className="w-4 h-4 text-zinc-400" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                            2. Capas dos Pacotes (Extração RAM 50ms)
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400">
                            {readyCoversCount}/{organizedArchives.length} prontas
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Segmented Control Sem Capa / Todas */}
                        <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800/80 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setShowOnlyPending(true)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    showOnlyPending 
                                        ? 'bg-zinc-800 text-zinc-100 shadow-sm' 
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                Sem Capa ({pendingCoversCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowOnlyPending(false)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    !showOnlyPending 
                                        ? 'bg-zinc-800 text-zinc-100 shadow-sm' 
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                Todas ({organizedArchives.length})
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={fetchOrganizedArchives}
                            disabled={loadingOrganized}
                            className="p-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                            title="Atualizar lista"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingOrganized ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filtros de Categoria & Busca */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                        <button
                            type="button"
                            onClick={() => setSelectedCategoryFilter('all')}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                                selectedCategoryFilter === 'all'
                                    ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                            }`}
                        >
                            Todas {showOnlyPending ? `(${pendingCoversCount})` : `(${organizedArchives.length})`}
                        </button>
                        {uniqueCategories.map(cat => {
                            const count = organizedArchives.filter(a => a.category === cat && (!showOnlyPending || !a.hasWebpCover)).length;
                            return (
                                <button
                                    type="button"
                                    key={cat}
                                    onClick={() => setSelectedCategoryFilter(cat)}
                                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                                        selectedCategoryFilter === cat
                                            ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                                            : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
                                    }`}
                                >
                                    {cat} ({count})
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={13} />
                        <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="Buscar figura..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-600 placeholder:text-zinc-600 transition-all font-mono"
                        />
                    </div>
                </div>

                {/* Grade de Cards das Figuras */}
                {loadingOrganized ? (
                    <div className="flex items-center justify-center p-12 text-zinc-500 text-xs gap-2 font-mono">
                        <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
                        Carregando pacotes do HD...
                    </div>
                ) : filteredOrganized.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs flex flex-col items-center justify-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-sm">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="font-bold text-zinc-100 text-sm">Tudo pronto!</span>
                            <p className="text-zinc-500 mt-0.5">
                                {showOnlyPending 
                                    ? 'Nenhum pacote pendente de capa nesta categoria.' 
                                    : 'Nenhum pacote encontrado com os filtros atuais.'}
                            </p>
                        </div>
                        {showOnlyPending && organizedArchives.length > 0 && (
                            <button 
                                type="button"
                                onClick={() => setShowOnlyPending(false)}
                                className="text-zinc-400 hover:text-zinc-200 font-semibold text-xs mt-1 underline cursor-pointer"
                            >
                                Exibir todas as {organizedArchives.length} figuras já com foto ➔
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {filteredOrganized.map((arc, i) => (
                            <div 
                                key={i}
                                className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-850 hover:border-zinc-700 transition-all flex flex-col justify-between gap-3 group"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider font-semibold truncate">
                                            {arc.category}
                                        </span>
                                        {arc.hasWebpCover ? (
                                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 shrink-0 font-mono">
                                                <CheckCircle2 className="w-3 h-3" />
                                                OK
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-amber-400 font-medium shrink-0 font-mono">
                                                Sem Foto
                                            </span>
                                        )}
                                    </div>

                                    <h4 className="text-xs font-bold text-zinc-100 truncate" title={arc.figureName}>
                                        {arc.figureName}
                                    </h4>
                                    <p className="text-[10px] text-zinc-500 truncate font-mono" title={arc.name}>
                                        {arc.name}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setPreviewArchive({
                                            path: arc.fullPath,
                                            name: arc.figureName,
                                            category: arc.category
                                        });
                                        setPreviewModalOpen(true);
                                    }}
                                    className="w-full py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>Inspecionar (50ms)</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SEÇÃO 3: PIPELINE DE SINCRONIZAÇÃO & ESTEIRA */}
            <div className="space-y-4 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-900">
                    <div>
                        <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                            <Rocket className="w-4 h-4 text-zinc-400" />
                            <span>Pipeline de Sincronização & Esteira</span>
                        </h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Execute cada etapa sequencialmente de 1 a 6 ou dispare o pipeline completo.
                        </p>
                    </div>

                    {/* Botão de Pipeline Completo */}
                    <button
                        type="button"
                        onClick={() => handleRunScript('lojinha3d', 'Pipeline Completo (lojinha3d.bat)')}
                        disabled={runningScript !== null}
                        className="py-2 px-4 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all shrink-0 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                        <Play className={`w-3.5 h-3.5 ${runningScript === 'lojinha3d' ? 'animate-spin' : ''}`} />
                        <span>{runningScript === 'lojinha3d' ? 'Executando Pipeline...' : 'Executar Todos (lojinha3d.bat)'}</span>
                    </button>
                </div>

                {/* Stepper Visual Flow Bar */}
                <div className="hidden lg:flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-850 text-[11px] font-mono text-zinc-400 overflow-x-auto">
                    <span className="flex items-center gap-1.5"><strong className="text-zinc-200">1.</strong> Pastas Locais</span>
                    <ArrowRight size={12} className="text-zinc-600" />
                    <span className="flex items-center gap-1.5"><strong className="text-zinc-200">2.</strong> WebP & Ícones</span>
                    <ArrowRight size={12} className="text-zinc-600" />
                    <span className="flex items-center gap-1.5"><strong className="text-zinc-200">3.</strong> Cloudflare R2</span>
                    <ArrowRight size={12} className="text-zinc-600" />
                    <span className="flex items-center gap-1.5"><strong className="text-zinc-200">4.</strong> Ingestão Supabase</span>
                    <ArrowRight size={12} className="text-zinc-600" />
                    <span className="flex items-center gap-1.5"><strong className="text-zinc-200">5.</strong> Sync IDs Sheets</span>
                    <ArrowRight size={12} className="text-zinc-600" />
                    <span className="flex items-center gap-1.5"><strong className="text-zinc-200">6.</strong> IA Sinônimos</span>
                </div>

                {/* Grade dos 6 passos da esteira */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Passo 1: Criar Pastas */}
                    <div className={clsx(
                        "p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all",
                        runningScript === 'powershell_organizar' 
                            ? "bg-zinc-900 border-emerald-500/50 shadow-sm" 
                            : "bg-zinc-900/40 border-zinc-850 hover:border-zinc-700/80"
                    )}>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
                                    <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[11px] flex items-center justify-center font-bold">1</span>
                                    <span>Criar Pastas</span>
                                </div>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">PowerShell</span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                                Cria pasta para cada RAR/ZIP solto e move para o destino.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleRunScript('powershell_organizar', '1. Criar Pastas (Script.ps1)')}
                            disabled={runningScript !== null}
                            className="w-full py-1.5 px-3 rounded-lg bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <Play className={`w-3 h-3 ${runningScript === 'powershell_organizar' ? 'animate-spin' : ''}`} />
                            <span>{runningScript === 'powershell_organizar' ? 'Rodando...' : 'Rodar Passo 1'}</span>
                        </button>
                    </div>

                    {/* Passo 2: WebP e GSheets */}
                    <div className={clsx(
                        "p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all",
                        runningScript === 'powershell_imagens' 
                            ? "bg-zinc-900 border-emerald-500/50 shadow-sm" 
                            : "bg-zinc-900/40 border-zinc-850 hover:border-zinc-700/80"
                    )}>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
                                    <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[11px] flex items-center justify-center font-bold">2</span>
                                    <span>WebP e Planilha</span>
                                </div>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">PowerShell</span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                                Converte fotos para WebP, gera ícones e preenche o Sheets.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleRunScript('powershell_imagens', '2. WebP e GSheets (Script.ps1)')}
                            disabled={runningScript !== null}
                            className="w-full py-1.5 px-3 rounded-lg bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <Play className={`w-3 h-3 ${runningScript === 'powershell_imagens' ? 'animate-spin' : ''}`} />
                            <span>{runningScript === 'powershell_imagens' ? 'Rodando...' : 'Rodar Passo 2'}</span>
                        </button>
                    </div>

                    {/* Passo 3: Upload de Imagens */}
                    <div className={clsx(
                        "p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all",
                        runningScript === 'upload' 
                            ? "bg-zinc-900 border-emerald-500/50 shadow-sm" 
                            : "bg-zinc-900/40 border-zinc-850 hover:border-zinc-700/80"
                    )}>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
                                    <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[11px] flex items-center justify-center font-bold">3</span>
                                    <span>Upload Cloudflare</span>
                                </div>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">Python / R2</span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                                Envia fotos para Cloudflare R2 e preenche coluna Imagem.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleRunScript('upload', '3. Upload de Imagens (upload.py)')}
                            disabled={runningScript !== null}
                            className="w-full py-1.5 px-3 rounded-lg bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <Play className={`w-3 h-3 ${runningScript === 'upload' ? 'animate-spin' : ''}`} />
                            <span>{runningScript === 'upload' ? 'Rodando...' : 'Rodar Passo 3'}</span>
                        </button>
                    </div>

                    {/* Passo 4: Planilha ➔ Supabase */}
                    <div className={clsx(
                        "p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all",
                        runningScript === 'importar' 
                            ? "bg-zinc-900 border-emerald-500/50 shadow-sm" 
                            : "bg-zinc-900/40 border-zinc-850 hover:border-zinc-700/80"
                    )}>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
                                    <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[11px] flex items-center justify-center font-bold">4</span>
                                    <span>Planilha ➔ Supabase</span>
                                </div>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">Python / PostgREST</span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                                Lê todas as abas da Planilha e sincroniza no Supabase.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleRunScript('importar', '4. Planilha ➔ Supabase (importar.py)')}
                            disabled={runningScript !== null}
                            className="w-full py-1.5 px-3 rounded-lg bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <Play className={`w-3 h-3 ${runningScript === 'importar' ? 'animate-spin' : ''}`} />
                            <span>{runningScript === 'importar' ? 'Rodando...' : 'Rodar Passo 4'}</span>
                        </button>
                    </div>

                    {/* Passo 5: Supabase ➔ Planilha */}
                    <div className={clsx(
                        "p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all",
                        runningScript === 'atualizar' 
                            ? "bg-zinc-900 border-emerald-500/50 shadow-sm" 
                            : "bg-zinc-900/40 border-zinc-850 hover:border-zinc-700/80"
                    )}>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
                                    <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[11px] flex items-center justify-center font-bold">5</span>
                                    <span>Supabase ➔ Planilha</span>
                                </div>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">Python</span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                                Grava os IDs do Supabase de volta na coluna ID do Sheets.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleRunScript('atualizar', '5. Supabase ➔ Planilha (atualizar.py)')}
                            disabled={runningScript !== null}
                            className="w-full py-1.5 px-3 rounded-lg bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <Play className={`w-3 h-3 ${runningScript === 'atualizar' ? 'animate-spin' : ''}`} />
                            <span>{runningScript === 'atualizar' ? 'Rodando...' : 'Rodar Passo 5'}</span>
                        </button>
                    </div>

                    {/* Passo 6: Sinônimos IA */}
                    <div className={clsx(
                        "p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all",
                        runningScript === 'gen_sinonimos' 
                            ? "bg-zinc-900 border-emerald-500/50 shadow-sm" 
                            : "bg-zinc-900/40 border-zinc-850 hover:border-zinc-700/80"
                    )}>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
                                    <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[11px] flex items-center justify-center font-bold">6</span>
                                    <span>Sinônimos IA</span>
                                </div>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">Gemini Flash</span>
                            </div>
                            <p className="text-[11px] text-zinc-400">
                                Gera sinônimos e palavras-chave de busca com IA.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleRunScript('gen_sinonimos', '6. Sinônimos IA (gen_sinonimos.py)')}
                            disabled={runningScript !== null}
                            className="w-full py-1.5 px-3 rounded-lg bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <Play className={`w-3 h-3 ${runningScript === 'gen_sinonimos' ? 'animate-spin' : ''}`} />
                            <span>{runningScript === 'gen_sinonimos' ? 'Rodando...' : 'Rodar Passo 6'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* CONSOLE TERMINAL DE LOGS */}
            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 shadow-sm space-y-3 relative z-10">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-900">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-xs font-mono font-bold text-zinc-200">
                            Terminal de Execução
                        </span>
                        {runningScript && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                {runningScript}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setAutoScroll(!autoScroll)}
                            className={clsx(
                                "px-2 py-1 rounded-lg text-[10px] font-mono font-semibold transition-colors border",
                                autoScroll 
                                    ? "bg-zinc-900 border-zinc-800 text-zinc-300" 
                                    : "bg-zinc-950 border-zinc-850 text-zinc-500"
                            )}
                            title="Alternar rolagem automática para o final"
                        >
                            Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                navigator.clipboard.writeText(logs.join('\n'));
                                toast.success('Logs copiados para a área de transferência!');
                            }}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors cursor-pointer"
                            title="Copiar logs"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setLogs([])}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                            title="Limpar logs"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div 
                    ref={terminalContainerRef}
                    className="h-80 md:h-96 overflow-y-auto font-mono text-[11px] text-zinc-300 space-y-1 custom-scrollbar pr-1 select-text bg-black/60 rounded-xl p-3 border border-zinc-900"
                >
                    {logs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
                            Aguardando comandos da esteira...
                        </div>
                    ) : (
                        logs.map((log, i) => renderLogLine(log, i))
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
