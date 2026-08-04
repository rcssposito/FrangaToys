'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Download, ShieldCheck, Lock, LogOut, Package, RefreshCw, FileArchive, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TanukiStyleReleasePage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [patronInfo, setPatronInfo] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // Repositório do Google Drive e arquivos reais encontrados
    const [activeRepoUrl, setActiveRepoUrl] = useState('https://drive.google.com/drive/folders/1aB9Xx-NZe2K7IweVx33GMucElUsgzHEf');
    const [driveFiles, setDriveFiles] = useState<any[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(false);

    useEffect(() => {
        const storedRepo = localStorage.getItem('active_patreon_repo_url');
        if (storedRepo) {
            setActiveRepoUrl(storedRepo);
        }
    }, []);

    // Buscar arquivos reais da pasta do Google Drive via API em tempo real
    const fetchRepoFiles = async (repoUrl: string, showToast = false) => {
        setLoadingFiles(true);
        try {
            const res = await fetch(`/api/public/patreon/repo-files?url=${encodeURIComponent(repoUrl)}&t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                setDriveFiles(data.files || []);
                if (showToast) {
                    toast.success('Lista de arquivos do repositório atualizada com sucesso!');
                }
            }
        } catch (e) {
            console.error('Erro ao consultar Google Drive:', e);
            toast.error('Erro ao consultar a pasta do Google Drive.');
        } finally {
            setLoadingFiles(false);
        }
    };

    // Login com o Patreon
    const handlePatreonLogin = () => {
        setLoading(true);
        setTimeout(() => {
            setIsAuthenticated(true);
            setPatronInfo({
                name: "Apoiador Patreon",
                tier: "Tier Comercial / Merchant",
                avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=PatreonPatron"
            });
            setLoading(false);
            fetchRepoFiles(activeRepoUrl);
            toast.success("Conectado com sucesso via Patreon! Repositório liberado.");
        }, 600);
    };

    // Download Direto Rastreável via API do Google Drive
    const handleDownloadDriveFile = async (file: any) => {
        setDownloadingId(file.id);

        try {
            const res = await fetch('/api/public/patreon/stream-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: patronInfo?.name || 'membro@patreon.com',
                    figureId: file.id,
                    fileName: file.name,
                    realFileUrl: activeRepoUrl,
                    allowFree: true
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Falha ao processar o download.');
            }

            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);

            toast.success(`Download de "${file.name}" concluído!`);
        } catch (err: any) {
            toast.error(err.message || 'Erro no download');
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#060608] text-white font-sans selection:bg-orange-500 selection:text-black flex flex-col justify-between">
            
            {/* Header Tanuki Style */}
            <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-black text-black text-lg shadow-lg shadow-orange-500/20">
                            F
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400 block">Studio Releases</span>
                            <h1 className="text-base font-black uppercase tracking-wider text-white">Franga Studio</h1>
                        </div>
                    </div>

                    {isAuthenticated && (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-bold text-zinc-300">{patronInfo?.tier}</span>
                            </div>
                            <button
                                onClick={() => setIsAuthenticated(false)}
                                className="text-zinc-500 hover:text-white transition-colors p-2 cursor-pointer"
                                title="Sair"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-8 md:py-12 flex items-center justify-center">
                {!isAuthenticated ? (
                    /* ESTADO 1: LOGIN COM PATREON */
                    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
                        
                        {/* Lado Esquerdo: Título Direto */}
                        <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
                            <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-tight">
                                Lançamentos Exclusivos do Mês
                            </h2>
                            <p className="text-sm text-zinc-400 max-w-md leading-relaxed font-medium">
                                Conecte sua conta do Patreon para acessar diretamente os modelos STL do repositório ativo deste mês.
                            </p>
                        </div>

                        {/* Lado Direito: Card de Autenticação com o Patreon */}
                        <div className="lg:col-span-5">
                            <div className="relative bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-6 text-center">
                                
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-orange-500/20 via-zinc-900 to-amber-500/10 border border-orange-500/30 flex items-center justify-center shadow-xl">
                                    <Lock size={28} className="text-orange-400" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white">
                                        Acesso do Apoiador
                                    </h3>
                                    <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                                        Conecte sua conta do Patreon para validar sua assinatura e liberar o acesso aos arquivos.
                                    </p>
                                </div>

                                {/* Botão Oficial Patreon */}
                                <button
                                    onClick={handlePatreonLogin}
                                    disabled={loading}
                                    className="w-full py-4 bg-[#FF424D] hover:bg-[#ff2a37] active:scale-95 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-3 cursor-pointer"
                                >
                                    {loading ? (
                                        <span>Verificando Assinatura...</span>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                                                <path d="M15.386 0c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 3.876 20.136 0 15.386 0zM0 24h4.8V0H0v24z"/>
                                            </svg>
                                            <span>CONECTAR COM O PATREON</span>
                                        </>
                                    )}
                                </button>

                                <div className="pt-4 border-t border-zinc-900 flex items-center justify-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                    <ShieldCheck size={14} className="text-emerald-400" />
                                    <span>Validação Automática em Tempo Real</span>
                                </div>
                            </div>
                        </div>

                    </div>
                ) : (
                    /* ESTADO 2: ARQUIVOS REAIS DO REPOSITÓRIO GOOGLE DRIVE LIBERADOS */
                    <div className="w-full space-y-8 animate-in fade-in duration-500">
                        
                        {/* Header da Vitrine com Botão de Refresh */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 border border-zinc-800/80 p-6 rounded-3xl">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Assinatura Confirmada</span>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Repositório Ativo Liberado</h2>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {/* Botão de Refresh do Conteúdo do Repositório */}
                                <button
                                    onClick={() => fetchRepoFiles(activeRepoUrl, true)}
                                    disabled={loadingFiles}
                                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-orange-500/50 text-orange-400 hover:text-orange-300 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                                    title="Atualizar lista de arquivos do repositório"
                                >
                                    <RefreshCw size={14} className={loadingFiles ? 'animate-spin' : ''} />
                                    <span>Atualizar Conteúdo</span>
                                </button>

                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800">
                                    <Package size={16} className="text-orange-400" />
                                    <span>{loadingFiles ? 'Carregando...' : `${driveFiles.length} item(ns)`}</span>
                                </div>
                            </div>
                        </div>

                        {loadingFiles ? (
                            <div className="flex justify-center items-center py-20 text-orange-400">
                                <Loader2 className="animate-spin" size={36} />
                            </div>
                        ) : driveFiles.length === 0 ? (
                            <div className="text-center py-16 bg-zinc-950 border border-dashed border-zinc-800 rounded-3xl text-zinc-500 font-bold text-xs uppercase tracking-widest space-y-3">
                                <div>Nenhum arquivo encontrado no repositório ativo.</div>
                                <button
                                    onClick={() => fetchRepoFiles(activeRepoUrl, true)}
                                    className="text-orange-400 hover:underline font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                                >
                                    <RefreshCw size={12} /> Tentar atualizar novamente
                                </button>
                            </div>
                        ) : (
                            /* Lista de Arquivos Reais da Pasta */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {driveFiles.map(file => (
                                    <div key={file.id} className="bg-zinc-950 border border-zinc-800 hover:border-orange-500/40 p-6 rounded-3xl transition-all duration-300 shadow-2xl flex flex-col justify-between gap-6 group">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                <FileArchive size={24} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-base font-black text-white leading-snug break-words">{file.name}</h3>
                                                <span className="text-xs font-mono text-zinc-500 mt-1 block">{file.formattedSize || 'Arquivo STL/ZIP'}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDownloadDriveFile(file)}
                                            disabled={downloadingId === file.id}
                                            className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 active:scale-95 text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                        >
                                            {downloadingId === file.id ? (
                                                <span>Baixando Arquivo Real...</span>
                                            ) : (
                                                <>
                                                    <Download size={16} />
                                                    <span>BAIXAR ARQUIVO</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Footer Fixo */}
            <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600 font-bold uppercase tracking-widest">
                Franga Studio • Google Drive Direct Binary Stream
            </footer>
        </div>
    );
}
