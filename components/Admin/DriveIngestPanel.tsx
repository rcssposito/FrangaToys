'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
    HardDrive, 
    Download, 
    RefreshCw, 
    ExternalLink, 
    Search, 
    CheckCircle2, 
    Folder, 
    FileArchive, 
    Loader2, 
    Clock, 
    AlertCircle, 
    X, 
    Eye,
    FolderCheck,
    Check,
    ChevronDown,
    ChevronRight,
    Layers,
    Sparkles,
    Copy,
    Mail
} from 'lucide-react';
import { toast } from 'sonner';

interface DriveFolder {
    id: string;
    name: string;
    parentFolderName?: string;
    isPackSubfolder?: boolean;
    isArchiveFile?: boolean;
    archiveExtension?: string;
    studioName: string;
    studioEmail: string;
    studioKey: string;
    studioId?: number;
    sharedWithMeTime?: string;
    webViewLink?: string;
    isDownloadedLocally?: boolean;
    inCatalog?: boolean;
    matchedFigureName?: string;
    matchedFigureId?: number;
    localPath?: string;
}

interface StudioStat {
    key: string;
    name: string;
    emails: string[];
    count: number;
    studioId?: number;
}

interface FileItem {
    id: string;
    name: string;
    size?: number;
    formattedSize: string;
    mimeType: string;
    relativePath: string;
}

interface SubFolder {
    id: string;
    name: string;
    fileCount: number;
    totalBytes: number;
    formattedTotalSize: string;
    files: FileItem[];
    isDownloadedLocally?: boolean;
}

interface DownloadProgress {
    currentFile: string;
    fileIndex: number;
    totalFiles: number;
    bytesDownloadedInFile: number;
    fileTotalBytes: number;
    totalFolderBytes: number;
    folderBytesDownloaded: number;
    status: 'downloading' | 'skipped' | 'completed' | 'error';
    error?: string;
}

// Auxiliar para cálculo de recência do compartilhamento (ex: últimos 15 dias)
function getFolderRecency(sharedTime?: string): { isRecent: boolean; daysAgo: number; label: string } {
    if (!sharedTime) return { isRecent: false, daysAgo: 999, label: '' };
    const itemDate = new Date(sharedTime).getTime();
    const now = Date.now();
    const diffMs = now - itemDate;
    const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysAgo <= 0) return { isRecent: true, daysAgo: 0, label: 'Hoje' };
    if (daysAgo === 1) return { isRecent: true, daysAgo: 1, label: 'Ontem' };
    if (daysAgo <= 15) return { isRecent: true, daysAgo, label: `Há ${daysAgo} dias` };
    return { isRecent: false, daysAgo, label: `Há ${daysAgo} dias` };
}

export default function DriveIngestPanel() {
    const [destFolder, setDestFolder] = useState('D:\\rcssp\\Downloads\\3d\\3 - Com suporte');
    const [includeStudioFolder, setIncludeStudioFolder] = useState(false);
    const [folders, setFolders] = useState<DriveFolder[]>([]);
    const [studios, setStudios] = useState<StudioStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // Filtros
    const [selectedStudio, setSelectedStudio] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'downloaded'>('all');
    const [limitPerStudio, setLimitPerStudio] = useState<number | null>(10);

    // Modal de Inspeção de Arquivos
    const [inspectingFolder, setInspectingFolder] = useState<DriveFolder | null>(null);
    const [inspectLoading, setInspectLoading] = useState(false);
    const [inspectHasSubfolders, setInspectHasSubfolders] = useState(false);
    const [inspectSubfolders, setInspectSubfolders] = useState<SubFolder[]>([]);
    const [inspectDirectFiles, setInspectDirectFiles] = useState<FileItem[]>([]);
    const [inspectFiles, setInspectFiles] = useState<FileItem[]>([]);
    const [inspectTotalSize, setInspectTotalSize] = useState<string>('');
    const [expandedSubfolderId, setExpandedSubfolderId] = useState<string | null>(null);

    // Estado do Download Ativo
    const [downloadingTarget, setDownloadingTarget] = useState<{ id: string; name: string; studioName: string } | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

    // Carrega dados iniciais
    const loadFolders = async (folderPath: string = destFolder) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/automation/drive-ingest?destFolder=${encodeURIComponent(folderPath)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao carregar pastas');
            setFolders(data.folders || []);
            setStudios(data.studios || []);
            if (data.defaultDestFolder) setDestFolder(data.defaultDestFolder);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFolders();
    }, []);

    const copyToClipboard = (text: string, label: string = 'Texto') => {
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text);
            toast.success(`${label} copiado!`);
        }
    };

    // Re-sincronizar live com a API do Google Drive
    const handleSyncDrive = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/admin/automation/drive-ingest', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar');
            toast.success(data.message || 'Sincronização com o Google Drive concluída!');
            await loadFolders();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSyncing(false);
        }
    };

    // Inspecionar arquivos e subpastas de uma pasta
    const handleInspect = async (folder: DriveFolder) => {
        setInspectingFolder(folder);
        setInspectLoading(true);
        setInspectHasSubfolders(false);
        setInspectSubfolders([]);
        setInspectDirectFiles([]);
        setInspectFiles([]);
        setInspectTotalSize('');
        setExpandedSubfolderId(null);

        try {
            const res = await fetch(
                `/api/admin/automation/drive-ingest/inspect?folderId=${folder.id}&destFolder=${encodeURIComponent(destFolder)}&studioName=${encodeURIComponent(folder.studioName)}&isArchiveFile=${folder.isArchiveFile ? 'true' : 'false'}`
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao inspecionar');
            setInspectHasSubfolders(Boolean(data.hasSubfolders));
            setInspectSubfolders(data.subfolders || []);
            setInspectDirectFiles(data.directFiles || []);
            setInspectFiles(data.files || []);
            setInspectTotalSize(data.formattedTotalSize || '');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setInspectLoading(false);
        }
    };

    // Iniciar download de uma pasta, subpasta ou arquivo avulso
    const handleDownload = async (target: { 
        id: string; 
        name: string; 
        studioName: string; 
        isSubfolder?: boolean;
        isArchiveFile?: boolean;
        archiveExtension?: string;
    }) => {
        setDownloadingTarget(target);
        setDownloadProgress(null);

        try {
            const res = await fetch('/api/admin/automation/drive-ingest/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folderId: target.id,
                    destinationFolder: destFolder,
                    studioName: target.studioName,
                    folderName: target.name,
                    includeStudioFolder,
                    isArchiveFile: Boolean(target.isArchiveFile),
                    archiveExtension: target.archiveExtension || '.zip'
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao iniciar download');
            }

            if (!res.body) throw new Error('Streaming não suportado.');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.type === 'progress') {
                                setDownloadProgress(data.progress);
                            } else if (data.type === 'done') {
                                toast.success(data.message || `Download de "${target.name}" concluído!`);
                                // Se for subpasta, marca a subpasta como baixada localmente
                                if (target.isSubfolder) {
                                    setInspectSubfolders(prev => prev.map(s => s.id === target.id ? { ...s, isDownloadedLocally: true } : s));
                                } else {
                                    setFolders(prev => prev.map(f => f.id === target.id ? { ...f, isDownloadedLocally: true } : f));
                                }
                            } else if (data.type === 'error') {
                                toast.error(data.error);
                            }
                        } catch (e) {
                            // ignora chunks quebrados
                        }
                    }
                }
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDownloadingTarget(null);
            setDownloadProgress(null);
        }
    };

    // Filtros calculados
    const filteredFolders = useMemo(() => {
        const base = folders.filter(f => {
            // Filtro por estúdio unificado
            if (selectedStudio !== 'all' && f.studioKey !== selectedStudio) return false;

            // Filtro por status
            if (statusFilter === 'pending' && f.isDownloadedLocally) return false;
            if (statusFilter === 'downloaded' && !f.isDownloadedLocally) return false;

            // Filtro por busca de texto
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = f.name.toLowerCase().includes(q);
                const matchStudio = f.studioName.toLowerCase().includes(q);
                if (!matchName && !matchStudio) return false;
            }

            return true;
        });

        // Se limite por estúdio estiver ativado (padrão: 10 mais recentes por estúdio)
        // Se uma busca por texto estiver ativa, não limita para não ocultar resultados
        if (limitPerStudio && !searchQuery.trim()) {
            const counts: Record<string, number> = {};
            return base.filter(f => {
                const key = f.studioKey;
                counts[key] = (counts[key] || 0) + 1;
                return counts[key] <= limitPerStudio;
            });
        }

        return base;
    }, [folders, selectedStudio, statusFilter, searchQuery, limitPerStudio]);

    const downloadedCount = useMemo(() => folders.filter(f => f.isDownloadedLocally).length, [folders]);
    const pendingCount = useMemo(() => folders.filter(f => !f.isDownloadedLocally).length, [folders]);

    const studioNewCountMap = useMemo(() => {
        const map: Record<string, number> = {};
        for (const f of folders) {
            const rec = getFolderRecency(f.sharedWithMeTime);
            if (rec.isRecent && !f.isDownloadedLocally) {
                map[f.studioKey] = (map[f.studioKey] || 0) + 1;
            }
        }
        return map;
    }, [folders]);

    const recentNewCount = useMemo(() => {
        return folders.filter(f => getFolderRecency(f.sharedWithMeTime).isRecent && !f.isDownloadedLocally).length;
    }, [folders]);

    return (
        <div className="space-y-6">
            {/* Top Bar: Status da Conexão e KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Conexão Google Drive</span>
                        <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-xl font-black text-white flex items-center gap-2">
                            Conectado
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">Token pessoal ativo</div>
                    </div>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Total Mapeado</span>
                        <div className="p-1.5 bg-zinc-800 text-zinc-300 rounded-lg">
                            <Folder size={16} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black text-white font-mono">{folders.length}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">Modelos dos 4 estúdios</div>
                    </div>
                </div>

                <div className="bg-zinc-900/40 border border-amber-500/30 bg-amber-500/[0.03] rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between text-amber-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles size={13} />
                            Novos Lançamentos
                        </span>
                        <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg">
                            <Sparkles size={16} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black text-amber-300 font-mono flex items-center gap-2">
                            {recentNewCount}
                            {recentNewCount > 0 && (
                                <span className="text-[10px] font-sans font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-tight">
                                    Últimos 15 dias
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{pendingCount} pendentes no total para baixar</div>
                    </div>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-400">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Salvos no Disco (HD)</span>
                        <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
                            <FolderCheck size={16} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black text-cyan-300 font-mono">{downloadedCount}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">Disponíveis na pasta local</div>
                    </div>
                </div>
            </div>

            {/* Painel Principal de Controles */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
                {/* Cabeçalho da Seção com Diretório e Re-sincronizar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                                <HardDrive className="text-orange-400" size={20} />
                                Ingestão Direta de Modelos 3D (Google Drive)
                            </h2>
                            <span className="text-[10px] font-mono font-bold bg-zinc-800 border border-zinc-700/60 text-zinc-300 px-2 py-0.5 rounded-md">
                                Stream Local
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                            Baixe arquivos STL, ZIPs e renders diretamente das pastas compartilhadas dos estúdios para seu disco de fatiamento.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            disabled={syncing || loading}
                            onClick={handleSyncDrive}
                            className="px-4 py-2 bg-zinc-950 border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-900 text-zinc-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {syncing ? <Loader2 size={14} className="animate-spin text-orange-400" /> : <RefreshCw size={14} className="text-orange-400" />}
                            Re-sincronizar Pastas do Drive
                        </button>
                    </div>
                </div>

                {/* Diretório Local de Destino */}
                <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-zinc-300 flex-wrap">
                        <HardDrive size={16} className="text-orange-400 shrink-0" />
                        <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Destino:</span>
                        <span className="font-mono text-zinc-200 font-bold bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">
                            {destFolder}
                        </span>
                        <span className="text-amber-400 font-mono text-[11px] font-bold">
                            📦 Salvo diretamente em arquivo .ZIP
                        </span>
                    </div>
                    <label className="flex items-center gap-2 text-zinc-400 text-xs cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={includeStudioFolder}
                            onChange={(e) => setIncludeStudioFolder(e.target.checked)}
                            className="rounded accent-orange-500"
                        />
                        <span>Criar pasta do estúdio (padrão: desativado, salva direto como {`{Nome_da_Figura}.zip`})</span>
                    </label>
                </div>

                {/* Filtro por Estúdios (Pills) */}
                <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Filtrar por Estúdio Autorizado:</div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                        <button
                            type="button"
                            onClick={() => setSelectedStudio('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                selectedStudio === 'all'
                                    ? 'bg-orange-500 text-white font-black shadow-sm'
                                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                        >
                            <span>Todos ({folders.length})</span>
                            {recentNewCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-zinc-950 animate-pulse">
                                    +{recentNewCount}
                                </span>
                            )}
                        </button>
                        {studios.map(s => {
                            const newCount = studioNewCountMap[s.key] || 0;
                            return (
                                <button
                                    key={s.key}
                                    type="button"
                                    title={`E-mails: ${s.emails.join(', ')}`}
                                    onClick={() => setSelectedStudio(s.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        selectedStudio === s.key
                                            ? 'bg-orange-500 text-white font-black shadow-sm'
                                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                                    }`}
                                >
                                    <span>{s.name} ({s.count})</span>
                                    {newCount > 0 && (
                                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-zinc-950 animate-pulse">
                                            +{newCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Detalhes do Estúdio Ativo com E-mails */}
                    {selectedStudio !== 'all' && (() => {
                        const activeStudio = studios.find(s => s.key === selectedStudio);
                        if (!activeStudio) return null;
                        return (
                            <div className="p-3 bg-zinc-950/80 border border-zinc-800/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-white text-xs">{activeStudio.name}</span>
                                    {activeStudio.studioId && (
                                        <span className="bg-orange-500/10 text-orange-400 border border-orange-500/30 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                                            ID #{activeStudio.studioId}
                                        </span>
                                    )}
                                    <span className="text-zinc-600 font-mono text-[11px]">•</span>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <Mail size={12} className="text-orange-400 shrink-0" />
                                        {activeStudio.emails.map(email => (
                                            <span
                                                key={email}
                                                onClick={() => copyToClipboard(email, 'E-mail do estúdio')}
                                                className="bg-zinc-900 border border-zinc-850 hover:border-orange-500/50 hover:text-orange-300 px-2 py-0.5 rounded text-[11px] font-mono text-zinc-300 cursor-pointer flex items-center gap-1 transition-colors"
                                                title="Clique para copiar este e-mail"
                                            >
                                                {email}
                                                <Copy size={10} className="text-zinc-500" />
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-[11px] text-zinc-400 font-mono">
                                    {activeStudio.count} modelo(s) cadastrados
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Busca e Filtro de Status */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="relative w-full sm:w-80">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nome da figura ou estúdio..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto self-end flex-wrap">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                statusFilter === 'all'
                                    ? 'bg-zinc-800 text-white'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            Todos ({folders.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('pending')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                statusFilter === 'pending'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                                    : 'text-zinc-400 hover:text-amber-300'
                            }`}
                        >
                            <Download size={12} className="text-amber-400" />
                            Pendentes ({pendingCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('downloaded')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                statusFilter === 'downloaded'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : 'text-zinc-400 hover:text-cyan-300'
                            }`}
                        >
                            <FolderCheck size={12} />
                            Salvos no PC ({downloadedCount})
                        </button>

                        <div className="w-[1px] h-4 bg-zinc-800 mx-1 hidden sm:block" />

                        <button
                            type="button"
                            onClick={() => setLimitPerStudio(limitPerStudio ? null : 10)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                limitPerStudio
                                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/40 shadow-sm'
                                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                            title={limitPerStudio ? 'Clique para desativar e ver todos os itens' : 'Clique para ver apenas os 10 mais recentes de cada estúdio'}
                        >
                            <Clock size={12} className={limitPerStudio ? 'text-orange-400' : 'text-zinc-500'} />
                            {limitPerStudio ? 'Últimos 10/estúdio' : 'Ver Todos'}
                        </button>
                    </div>
                </div>

                {/* Banner Informativo quando o limite dos 10 mais recentes está ativo */}
                {limitPerStudio && folders.length > filteredFolders.length && !searchQuery.trim() && (
                    <div className="px-4 py-2.5 bg-orange-500/5 border border-orange-500/20 rounded-xl flex items-center justify-between text-xs text-zinc-400">
                        <div className="flex items-center gap-2">
                            <Clock size={13} className="text-orange-400 shrink-0" />
                            <span>
                                Exibindo os <strong>10 modelos mais recentes</strong> de cada estúdio ({filteredFolders.length} de {folders.length} itens).
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setLimitPerStudio(null)}
                            className="text-orange-400 hover:text-orange-300 font-bold hover:underline cursor-pointer ml-3 shrink-0"
                        >
                            Ver histórico completo ({folders.length})
                        </button>
                    </div>
                )}

                {/* Lista de Pastas */}
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
                        <Loader2 className="animate-spin text-orange-500" size={32} />
                        <span className="text-xs font-bold uppercase tracking-wider">Carregando catálogo de pastas...</span>
                    </div>
                ) : filteredFolders.length === 0 ? (
                    <div className="p-12 text-center bg-zinc-950/40 border border-zinc-800/80 rounded-2xl text-zinc-500 text-xs">
                        Nenhuma pasta encontrada com os filtros selecionados.
                    </div>
                ) : (
                    <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                        {filteredFolders.map(folder => {
                            const isDownloading = downloadingTarget?.id === folder.id;
                            const rec = getFolderRecency(folder.sharedWithMeTime);
                            const isBrandNew = rec.isRecent && !folder.isDownloadedLocally;
                            const dateStr = folder.sharedWithMeTime 
                                ? new Date(folder.sharedWithMeTime).toLocaleDateString('pt-BR') 
                                : '';

                            return (
                                <div
                                    key={folder.id}
                                    className={`p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                                        isBrandNew
                                            ? 'bg-gradient-to-r from-amber-500/[0.08] via-zinc-950/90 to-zinc-950 border border-amber-500/40 hover:border-amber-500/70 shadow-sm shadow-amber-500/5'
                                            : 'bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700/80'
                                    }`}
                                >
                                    <div className="flex items-start gap-3.5 min-w-0">
                                        <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                                            isBrandNew 
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                                                : 'bg-zinc-900 border-zinc-800 text-orange-400'
                                        }`}>
                                            {folder.isArchiveFile ? <FileArchive size={18} /> : <Folder size={18} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-zinc-100 text-sm truncate">{folder.name}</h3>
                                                
                                                {folder.isArchiveFile && (
                                                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-black uppercase rounded bg-purple-500/15 border border-purple-500/30 text-purple-300">
                                                        {folder.archiveExtension || '.zip'}
                                                    </span>
                                                )}

                                                {folder.parentFolderName && (
                                                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center gap-1">
                                                        <Layers size={10} className="text-zinc-500" />
                                                        {folder.parentFolderName}
                                                    </span>
                                                )}

                                                {isBrandNew ? (
                                                    <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-amber-500/20 border border-amber-500/50 text-amber-300 flex items-center gap-1.5 shadow-sm animate-pulse">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                                        <Sparkles size={11} className="text-amber-400" />
                                                        NOVO ({rec.label})
                                                    </span>
                                                ) : folder.isDownloadedLocally ? (
                                                    <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center gap-1">
                                                        <HardDrive size={10} /> Salvo no PC
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center gap-1">
                                                        <Download size={10} className="text-zinc-500" /> Pendente
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-1.5 flex-wrap font-mono">
                                                <span className="text-zinc-300 font-sans font-bold">{folder.studioName}</span>
                                                <span className="text-zinc-500 text-[10px]">({folder.studioEmail})</span>
                                                <span>•</span>
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(folder.id, 'ID do Google Drive')}
                                                    className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 hover:text-orange-300 hover:border-orange-500/40 cursor-pointer flex items-center gap-1 transition-colors"
                                                    title="Clique para copiar o ID do Google Drive"
                                                >
                                                    ID: <span className="text-zinc-300">{folder.id.slice(0, 8)}...</span>
                                                    <Copy size={9} className="text-zinc-500" />
                                                </button>
                                                <span>•</span>
                                                <span className={`flex items-center gap-1 font-mono text-[11px] ${isBrandNew ? 'text-amber-400 font-bold' : 'text-zinc-500'}`}>
                                                    <Clock size={11} className={isBrandNew ? 'text-amber-400' : 'text-zinc-600'} />
                                                    {isBrandNew ? `${rec.label} (${dateStr})` : dateStr}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ações da Pasta */}
                                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                        {folder.webViewLink && (
                                            <a
                                                href={folder.webViewLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                title="Abrir no Google Drive"
                                                className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleInspect(folder)}
                                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Eye size={13} className="text-zinc-400" />
                                            Ver Arquivos
                                        </button>

                                        <button
                                            type="button"
                                            disabled={isDownloading}
                                            onClick={() => handleDownload(folder)}
                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                                folder.isDownloadedLocally
                                                    ? 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                                                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20'
                                            } disabled:opacity-50`}
                                        >
                                            {isDownloading ? (
                                                <>
                                                    <Loader2 size={13} className="animate-spin" />
                                                    {folder.isArchiveFile ? 'Baixando...' : 'Compactando...'}
                                                </>
                                            ) : (
                                                <>
                                                    <Download size={13} />
                                                    {folder.isDownloadedLocally 
                                                        ? `Re-baixar ${folder.archiveExtension?.toUpperCase() || '.ZIP'}` 
                                                        : `Baixar ${folder.archiveExtension?.toUpperCase() || '.ZIP'}`}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de Inspeção de Arquivos */}
            {inspectingFolder && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
                        {/* Header do Modal */}
                        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
                            <div>
                                <div className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider">
                                    {inspectingFolder.studioName}
                                </div>
                                <h3 className="text-base font-bold text-white mt-0.5">{inspectingFolder.name}</h3>
                                <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] font-mono text-zinc-400">
                                    <span>{inspectingFolder.studioEmail}</span>
                                    <span>•</span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(inspectingFolder.id, 'ID do Google Drive')}
                                        className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 hover:text-orange-400 hover:border-orange-500/40 cursor-pointer flex items-center gap-1 transition-colors"
                                        title="Copiar ID do Google Drive"
                                    >
                                        ID: {inspectingFolder.id}
                                        <Copy size={9} className="text-zinc-500" />
                                    </button>
                                </div>
                                {inspectTotalSize && (
                                    <div className="text-xs text-zinc-400 mt-1">
                                        Total: <span className="font-mono text-emerald-400 font-bold">{inspectTotalSize}</span> • {inspectFiles.length} arquivo(s)
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectingFolder(null)}
                                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="p-5 overflow-y-auto flex-1 space-y-3 text-xs">
                            {inspectLoading ? (
                                <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-500 font-sans">
                                    <Loader2 className="animate-spin text-orange-500" size={28} />
                                    <span>Consultando arquivos e modelos no Google Drive...</span>
                                </div>
                            ) : inspectHasSubfolders ? (
                                <div className="space-y-4">
                                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="text-orange-300">
                                            📦 <strong>{inspectSubfolders.length} modelos/peças</strong> identificadas neste pacote.
                                        </div>
                                        <div className="text-[11px] text-zinc-400">
                                            Você pode baixar cada modelo individualmente abaixo!
                                        </div>
                                    </div>

                                    {/* Lista de Modelos (Subpastas) */}
                                    <div className="space-y-2.5">
                                        {inspectSubfolders.map((sub) => {
                                            const isSubExpanded = expandedSubfolderId === sub.id;
                                            const isDownloadingThis = downloadingTarget?.id === sub.id;

                                            return (
                                                <div
                                                    key={sub.id}
                                                    className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden transition-all"
                                                >
                                                    <div className="p-3.5 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-orange-400 shrink-0">
                                                                <Layers size={15} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-bold text-zinc-100 text-xs truncate">
                                                                        {sub.name}
                                                                    </span>
                                                                    {sub.isDownloadedLocally ? (
                                                                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                                                            Salvo no PC
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
                                                                            Pendente
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                                                                    {sub.formattedTotalSize} • {sub.fileCount} arquivo(s)
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Ações da Subpasta */}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedSubfolderId(isSubExpanded ? null : sub.id)}
                                                                className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-[11px] font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                                                            >
                                                                {isSubExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                                Arquivos
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={isDownloadingThis}
                                                                onClick={() => handleDownload({
                                                                    id: sub.id,
                                                                    name: sub.name,
                                                                    studioName: inspectingFolder.studioName,
                                                                    isSubfolder: true
                                                                })}
                                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                                                                    sub.isDownloadedLocally
                                                                        ? 'bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                                                                        : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                                                                } disabled:opacity-50`}
                                                            >
                                                                {isDownloadingThis ? (
                                                                    <>
                                                                        <Loader2 size={12} className="animate-spin" />
                                                                        Compactando...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Download size={12} />
                                                                        {sub.isDownloadedLocally ? 'Re-baixar .ZIP' : 'Baixar Peça .ZIP'}
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Arquivos internos da subpasta */}
                                                    {isSubExpanded && (
                                                        <div className="border-t border-zinc-800/80 bg-black/40 p-3 space-y-1.5 font-mono text-[11px]">
                                                            {sub.files.map((f, fIdx) => (
                                                                <div
                                                                    key={f.id || fIdx}
                                                                    className="flex items-center justify-between gap-3 text-zinc-400 py-1 border-b border-zinc-900/60 last:border-0"
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <FileArchive size={13} className="text-zinc-500 shrink-0" />
                                                                        <span className="truncate">{f.name}</span>
                                                                    </div>
                                                                    <span className="text-zinc-500 shrink-0">{f.formattedSize}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Arquivos soltos da raiz (se houver) */}
                                    {inspectDirectFiles.length > 0 && (
                                        <div className="pt-3 border-t border-zinc-800 space-y-2">
                                            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                                                Arquivos Gerais / Renders da Raiz:
                                            </div>
                                            <div className="space-y-1.5 font-mono text-[11px]">
                                                {inspectDirectFiles.map((file, idx) => (
                                                    <div
                                                        key={file.id || idx}
                                                        className="p-2.5 bg-zinc-900/40 border border-zinc-800/60 rounded-lg flex items-center justify-between gap-3 text-zinc-300"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <FileArchive size={14} className="text-orange-400 shrink-0" />
                                                            <span className="truncate">{file.name}</span>
                                                        </div>
                                                        <span className="text-zinc-500 shrink-0">{file.formattedSize}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : inspectFiles.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500 font-sans">
                                    Nenhum arquivo encontrado dentro desta pasta.
                                </div>
                            ) : (
                                <div className="space-y-1.5 font-mono text-xs">
                                    {inspectFiles.map((file, idx) => (
                                        <div
                                            key={file.id || idx}
                                            className="p-3 bg-zinc-900/60 border border-zinc-800/60 rounded-xl flex items-center justify-between gap-3 text-zinc-300"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <FileArchive size={15} className="text-orange-400 shrink-0" />
                                                <span className="truncate">{file.relativePath || file.name}</span>
                                            </div>
                                            <span className="text-zinc-500 shrink-0 text-[11px] font-bold">
                                                {file.formattedSize}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer do Modal */}
                        <div className="p-4 border-t border-zinc-800/80 flex items-center justify-between gap-3 font-sans">
                            <button
                                type="button"
                                onClick={() => setInspectingFolder(null)}
                                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                                Fechar
                            </button>
                            {inspectHasSubfolders ? (
                                <span className="text-[11px] text-zinc-400 font-medium">
                                    💡 As peças deste pacote são baixadas individualmente em .ZIP nos cards acima.
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    disabled={inspectLoading || inspectFiles.length === 0}
                                    onClick={() => {
                                        const target = inspectingFolder;
                                        setInspectingFolder(null);
                                        handleDownload(target);
                                    }}
                                    className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
                                >
                                    <Download size={14} />
                                    Baixar Peça em .ZIP ({inspectTotalSize || 'Arquivo'})
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Progresso em Tempo Real de Download */}
            {downloadingTarget && (
                <div className="fixed bottom-6 right-6 z-50 w-96 bg-zinc-950 border border-orange-500/40 rounded-2xl p-5 shadow-2xl shadow-orange-500/10 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-orange-400" />
                            <span className="text-xs font-black uppercase text-white tracking-wider">Compactando & Baixando .ZIP</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">
                            {downloadingTarget.studioName}
                        </span>
                    </div>

                    <div className="mt-3 space-y-3 text-xs">
                        <div>
                            <div className="font-bold text-zinc-200 truncate">{downloadingTarget.name}</div>
                            {downloadProgress && (
                                <div className="text-[11px] text-zinc-400 truncate font-mono mt-0.5">
                                    Arquivo {downloadProgress.fileIndex} de {downloadProgress.totalFiles}: <span className="text-zinc-200">{downloadProgress.currentFile}</span>
                                </div>
                            )}
                        </div>

                        {/* Barra de Progresso do Arquivo */}
                        {downloadProgress && (
                            <div className="space-y-1.5">
                                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                                    <div
                                        className="bg-orange-500 h-full transition-all duration-200"
                                        style={{
                                            width: `${downloadProgress.totalFolderBytes > 0 
                                                ? Math.min(100, Math.round((downloadProgress.folderBytesDownloaded / downloadProgress.totalFolderBytes) * 100)) 
                                                : 0}%`
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                                    <span>
                                        {downloadProgress.totalFolderBytes > 0 
                                            ? `${Math.round((downloadProgress.folderBytesDownloaded / downloadProgress.totalFolderBytes) * 100)}%` 
                                            : 'Calculando...'}
                                    </span>
                                    <span>
                                        {downloadProgress.status === 'skipped' ? 'Arquivo já existe (pulado)' : 'Gravando no disco local'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

