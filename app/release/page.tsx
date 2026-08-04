'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Lock, LogOut, FolderGit2, CheckCircle2, ArrowRight, ExternalLink, UserCheck, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function RestrictedFolderReleasePage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [patronEmail, setPatronEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [granting, setGranting] = useState(false);
    const [accessGranted, setAccessGranted] = useState(false);

    // Pasta Restrita do Google Drive (Configuração do Criador)
    const [activeRepoUrl, setActiveRepoUrl] = useState('https://drive.google.com/drive/folders/1aB9Xx-NZe2K7IweVx33GMucElUsgzHEf');

    useEffect(() => {
        const storedRepo = localStorage.getItem('active_patreon_repo_url');
        if (storedRepo) {
            setActiveRepoUrl(storedRepo);
        }
    }, []);

    // Login com o Patreon e Concessão Automática de Permissão no Google Drive
    const handlePatreonLoginAndGrant = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!patronEmail.trim()) {
            toast.error('Informe seu e-mail do Patreon para liberar a pasta.');
            return;
        }

        setLoading(true);
        setGranting(true);

        try {
            // Dispara a concessão de permissão de leitura na pasta restrita do Google Drive via API
            const res = await fetch('/api/public/patreon/grant-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: patronEmail.trim(),
                    folderUrl: activeRepoUrl,
                    allowFree: true
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Assinatura no Patreon não encontrada.');
            }

            setIsAuthenticated(true);
            setAccessGranted(true);
            toast.success(`Permissão concedida! Sua conta (${patronEmail}) agora pode acessar a pasta restrita.`);

        } catch (err: any) {
            toast.error(err.message || 'Erro ao liberar permissão no Google Drive.');
        } finally {
            setLoading(false);
            setGranting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#060608] text-white font-sans selection:bg-orange-500 selection:text-black flex flex-col justify-between">
            
            {/* Header Studio */}
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
                                <span className="text-xs font-bold text-zinc-300">Permissão Concedida ({patronEmail})</span>
                            </div>
                            <button
                                onClick={() => {
                                    setIsAuthenticated(false);
                                    setAccessGranted(false);
                                }}
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
                    /* ESTADO 1: AUTENTICAÇÃO E INCLUSÃO DO MEMBRO NA PASTA RESTRITA */
                    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
                        
                        {/* Lado Esquerdo: Título Direto */}
                        <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-[0.25em]">
                                <KeyRound size={12} className="text-amber-400" />
                                Acesso Restrito a Convidados Autorizados
                            </div>
                            <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-tight">
                                Lançamentos Exclusivos do Mês
                            </h2>
                            <p className="text-sm text-zinc-400 max-w-md leading-relaxed font-medium">
                                A pasta do repositório é 100% restrita no Google Drive. Informe seu e-mail do Patreon para ser incluído na lista de permissões da pasta.
                            </p>
                        </div>

                        {/* Lado Direito: Formulário de Conexão com o Patreon */}
                        <div className="lg:col-span-5">
                            <form onSubmit={handlePatreonLoginAndGrant} className="relative bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-6 text-center">
                                
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-orange-500/20 via-zinc-900 to-amber-500/10 border border-orange-500/30 flex items-center justify-center shadow-xl">
                                    <Lock size={28} className="text-orange-400" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white">
                                        Liberar Acesso no Google Drive
                                    </h3>
                                    <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                                        Sua conta será adicionada dinamicamente à pasta restrita ao confirmar sua assinatura.
                                    </p>
                                </div>

                                <div className="space-y-1.5 text-left">
                                    <label className="block text-[10px] uppercase font-black tracking-widest text-zinc-500">
                                        E-mail do Patreon / Google
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="seu-email@gmail.com"
                                        value={patronEmail}
                                        onChange={e => setPatronEmail(e.target.value)}
                                        disabled={loading}
                                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-orange-500 rounded-2xl px-4 py-3.5 text-sm font-medium text-white outline-none transition-all"
                                        required
                                    />
                                </div>

                                {/* Botão Oficial Patreon */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-[#FF424D] hover:bg-[#ff2a37] active:scale-95 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? (
                                        <span>Liberando Permissão...</span>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                                                <path d="M15.386 0c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 3.876 20.136 0 15.386 0zM0 24h4.8V0H0v24z"/>
                                            </svg>
                                            <span>CONECTAR & LIBERAR PASTA</span>
                                        </>
                                    )}
                                </button>

                                <div className="pt-4 border-t border-zinc-900 flex items-center justify-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                    <ShieldCheck size={14} className="text-emerald-400" />
                                    <span>Inclusão Automática via Google Drive API</span>
                                </div>
                            </form>
                        </div>

                    </div>
                ) : (
                    /* ESTADO 2: MEMBRO AUTORIZADO NA PASTA RESTRITA */
                    <div className="max-w-xl mx-auto w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-2xl shadow-emerald-500/10">
                            <CheckCircle2 size={44} />
                        </div>

                        <div className="space-y-3">
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full">
                                Permissão Concedida com Sucesso
                            </span>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-white">
                                Sua Conta Foi Autorizada!
                            </h2>
                            <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
                                O e-mail <strong className="text-white">{patronEmail}</strong> foi adicionado à lista de permissões da pasta do Google Drive. Somente contas autorizadas conseguem abrir o repositório.
                            </p>
                        </div>

                        <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-4">
                            <div className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-300">
                                <FolderGit2 size={18} className="text-orange-400" />
                                <span>Repositório Restrito de Lançamentos</span>
                            </div>

                            <a
                                href={activeRepoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 active:scale-95 text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>ABRIR PASTA RESTRITA NO GOOGLE DRIVE</span>
                                <ExternalLink size={16} />
                            </a>
                        </div>

                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                            <UserCheck size={14} className="text-emerald-400" />
                            <span>Proteção Anti-Vazamento Ativa • Apenas E-mails Autorizados Acessam</span>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer Fixo */}
            <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600 font-bold uppercase tracking-widest">
                Franga Studio • Restricted Google Drive Identity Permissions
            </footer>
        </div>
    );
}
