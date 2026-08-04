'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, ShieldCheck, Lock, LogOut, FolderGit2, CheckCircle2, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

function ReleaseContent() {
    const searchParams = useSearchParams();
    const accessQuery = searchParams.get('access');
    const emailQuery = searchParams.get('email');
    const nameQuery = searchParams.get('name');
    const errorQuery = searchParams.get('error');

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [patronEmail, setPatronEmail] = useState('');
    const [patronName, setPatronName] = useState('');
    const [activeRepoUrl, setActiveRepoUrl] = useState('https://drive.google.com/drive/folders/1aB9Xx-NZe2K7IweVx33GMucElUsgzHEf');

    useEffect(() => {
        const storedRepo = localStorage.getItem('active_patreon_repo_url');
        if (storedRepo) {
            setActiveRepoUrl(storedRepo);
        }

        // Se retornou da autenticação do Patreon com acesso liberado
        if (accessQuery === 'granted' && emailQuery) {
            setIsAuthenticated(true);
            setPatronEmail(emailQuery);
            setPatronName(nameQuery || 'Apoiador');
            toast.success(`Acesso liberado para ${emailQuery}!`);
        } else if (errorQuery) {
            if (errorQuery === 'not_active_patron') {
                toast.error('Assinatura no Patreon não encontrada ou inativa.');
            } else if (errorQuery === 'login_cancelled') {
                toast.error('Login cancelado.');
            } else {
                toast.error('Não foi possível verificar a assinatura no momento.');
            }
        }
    }, [accessQuery, emailQuery, nameQuery, errorQuery]);

    // Redirecionamento para o Patreon
    const handlePatreonLogin = () => {
        toast.loading('Entrando no Patreon...');
        window.location.href = '/api/auth/patreon/login';
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
                                <span className="text-xs font-bold text-zinc-300">{patronName}</span>
                            </div>
                            <button
                                onClick={() => {
                                    setIsAuthenticated(false);
                                    window.location.href = '/release';
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

            {/* Conteúdo Principal */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-8 md:py-12 flex items-center justify-center">
                {!isAuthenticated ? (
                    /* ESTADO 1: TELA DE LOGIN HUMANA E DIRETA */
                    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
                        
                        {/* Lado Esquerdo: Título Direto */}
                        <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-[0.25em]">
                                <Sparkles size={12} className="text-amber-400" />
                                Exclusivo para Apoiadores
                            </div>
                            <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-tight">
                                Lançamentos Exclusivos do Mês
                            </h2>
                            <p className="text-sm text-zinc-400 max-w-md leading-relaxed font-medium">
                                Conecte sua conta do Patreon para liberar o acesso aos arquivos e colecionáveis 3D deste mês no Google Drive.
                            </p>
                        </div>

                        {/* Lado Direito: Card de Acesso */}
                        <div className="lg:col-span-5">
                            <div className="relative bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-6 text-center">
                                
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-orange-500/20 via-zinc-900 to-amber-500/10 border border-orange-500/30 flex items-center justify-center shadow-xl">
                                    <Lock size={28} className="text-orange-400" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white">
                                        Área do Membro
                                    </h3>
                                    <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                                        Entre com seu perfil do Patreon para confirmar sua assinatura.
                                    </p>
                                </div>

                                {errorQuery && (
                                    <div className="p-3.5 bg-red-950/30 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center gap-2 text-left font-medium">
                                        <AlertCircle size={16} className="shrink-0" />
                                        <span>Sua assinatura no Patreon precisa estar ativa para acessar.</span>
                                    </div>
                                )}

                                {/* Botão Oficial do Patreon */}
                                <button
                                    onClick={handlePatreonLogin}
                                    className="w-full py-4 bg-[#FF424D] hover:bg-[#ff2a37] active:scale-95 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-3 cursor-pointer"
                                >
                                    <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                                        <path d="M15.386 0c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 3.876 20.136 0 15.386 0zM0 24h4.8V0H0v24z"/>
                                    </svg>
                                    <span>ENTRAR COM O PATREON</span>
                                </button>

                                <div className="pt-4 border-t border-zinc-900 flex items-center justify-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                    <ShieldCheck size={14} className="text-emerald-400" />
                                    <span>Validação automática de membros</span>
                                </div>
                            </div>
                        </div>

                    </div>
                ) : (
                    /* ESTADO 2: MEMBRO COM ACESSO LIBERADO (HUMANIZADO & ELEGANTE) */
                    <div className="max-w-md mx-auto w-full text-center space-y-8 animate-in fade-in zoom-in duration-500 my-auto">
                        <div className="w-20 h-20 bg-emerald-500/15 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-2xl shadow-emerald-500/10">
                            <CheckCircle2 size={40} />
                        </div>

                        <div className="space-y-4">
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.25em] px-4 py-2 rounded-full inline-block">
                                Membro Confirmado
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white pt-3">
                                Olá, {patronName}!
                            </h2>
                            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto font-medium pt-1">
                                Sua conta <strong className="text-white">{patronEmail}</strong> já está autorizada a acessar a pasta do Google Drive.
                            </p>
                        </div>

                        <div className="p-6 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl space-y-5 shadow-2xl">
                            <div className="flex items-center justify-center gap-2.5 text-xs font-bold text-zinc-300">
                                <FolderGit2 size={18} className="text-orange-400" />
                                <span>Lançamento de Fevereiro</span>
                            </div>

                            <a
                                href={activeRepoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 active:scale-95 text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>ACESSAR PASTA NO GOOGLE DRIVE</span>
                                <ExternalLink size={16} />
                            </a>
                        </div>

                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-400" />
                            <span>Disponível para sua conta do Google</span>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer Fixo */}
            <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600 font-bold uppercase tracking-widest">
                Franga Studio Releases
            </footer>
        </div>
    );
}

export default function ReleasePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#060608] flex items-center justify-center text-white font-bold text-xs uppercase tracking-widest">
                Carregando...
            </div>
        }>
            <ReleaseContent />
        </Suspense>
    );
}
