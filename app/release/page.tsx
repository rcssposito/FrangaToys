'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Sparkles, ShieldCheck, Lock, LogOut, FolderGit2, CheckCircle2, 
    ExternalLink, AlertCircle, ShoppingBag, Ticket, KeyRound, Clock, 
    ArrowRight, Package
} from 'lucide-react';
import { toast } from 'sonner';

function ReleaseContent() {
    const searchParams = useSearchParams();
    const accessQuery = searchParams.get('access');
    const emailQuery = searchParams.get('email');
    const nameQuery = searchParams.get('name');
    const folderQuery = searchParams.get('folder');
    const errorQuery = searchParams.get('error');
    const contractorQuery = searchParams.get('contractor');

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [patronEmail, setPatronEmail] = useState('');
    const [patronName, setPatronName] = useState('');
    const [activeRepoUrl, setActiveRepoUrl] = useState('');

    // Estado dos lançamentos do Gumroad
    const [gumroadProducts, setGumroadProducts] = useState<any[]>([]);
    const [deliveryMode, setDeliveryMode] = useState<'gumroad' | 'drive' | 'both'>('gumroad');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [claimingId, setClaimingId] = useState<string | null>(null);

    // Carregar produtos do Gumroad e status de claim
    const fetchGumroadStatus = async (email?: string) => {
        try {
            setLoadingProducts(true);
            const queryParam = email ? `?email=${encodeURIComponent(email)}` : '';
            const res = await fetch(`/api/release/gumroad${queryParam}`);
            if (res.ok) {
                const data = await res.json();
                setGumroadProducts(data.products || []);
                if (data.deliveryMode) {
                    setDeliveryMode(data.deliveryMode);
                }
            }
        } catch (e) {
            console.error('Erro ao buscar produtos do Gumroad:', e);
        } finally {
            setLoadingProducts(false);
        }
    };

    // Ação do Membro: Resgatar Cupom de 100% OFF no Gumroad
    const handleClaimCoupon = async (productId: string) => {
        if (!patronEmail) return;
        setClaimingId(productId);
        try {
            const res = await fetch('/api/release/gumroad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    patronEmail,
                    patronName
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao resgatar modelo');

            if (data.alreadyClaimed) {
                toast.info('Você já possui um cupom exclusivo para este modelo.');
            } else {
                toast.success('Cupom de 100% OFF gerado com sucesso para sua conta!');
            }

            // Atualiza status local
            setGumroadProducts(prev => prev.map(p => {
                if (p.id !== productId) return p;
                return {
                    ...p,
                    claim: {
                        coupon_code: data.couponCode,
                        checkout_url: data.checkoutUrl,
                        is_redeemed: false,
                        created_at: new Date().toISOString()
                    }
                };
            }));

            // Abre o checkout do Gumroad zerado ($0,00) em uma nova aba
            if (data.checkoutUrl) {
                window.open(data.checkoutUrl, '_blank');
            }

        } catch (err: any) {
            toast.error(err.message || 'Erro ao processar resgate');
        } finally {
            setClaimingId(null);
        }
    };

    // Carregar a URL ativa do repositório enviada pelo banco de dados
    useEffect(() => {
        const fetchLiveRepoUrl = async () => {
            if (folderQuery) {
                setActiveRepoUrl(folderQuery);
                return;
            }
            try {
                const res = await fetch('/api/admin/integrations/patreon/repository');
                if (res.ok) {
                    const data = await res.json();
                    if (data.repoUrl) {
                        setActiveRepoUrl(data.repoUrl);
                    }
                }
            } catch (e) {
                console.error('Erro ao buscar repositório ativo:', e);
            }
        };

        fetchLiveRepoUrl();

        if (contractorQuery) {
            setIsAuthenticated(true);
            setPatronEmail(contractorQuery);
            setPatronName('Terceirizado Autorizado');
            toast.success(`Acesso autorizado: ${contractorQuery}`);
            fetchGumroadStatus(contractorQuery);
        } else if (accessQuery === 'granted' && emailQuery) {
            // Se retornou da autenticação do Patreon com acesso liberado
            setIsAuthenticated(true);
            setPatronEmail(emailQuery);
            setPatronName(nameQuery || 'Apoiador');
            toast.success(`Acesso liberado para ${emailQuery}!`);
            fetchGumroadStatus(emailQuery);
        } else {
            // Carrega modo de entrega e produtos mesmo antes do login
            fetchGumroadStatus();
        }

        if (errorQuery) {
            if (errorQuery === 'not_active_patron') {
                toast.error('Assinatura no Patreon não encontrada ou inativa.');
            } else if (errorQuery === 'login_cancelled') {
                toast.error('Login cancelado.');
            } else {
                toast.error('Não foi possível verificar a assinatura no momento.');
            }
        }
    }, [accessQuery, emailQuery, nameQuery, folderQuery, errorQuery, contractorQuery]);

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
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 flex items-center justify-center font-black text-black text-xl shadow-lg shadow-orange-500/20">
                            F
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500 block">Studio Releases</span>
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
                    /* ESTADO 1: TELA DE LOGIN */
                    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
                        
                        {/* Lado Esquerdo */}
                        <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-[0.25em]">
                                <Sparkles size={12} className="text-orange-400" />
                                Exclusivo para Apoiadores
                            </div>
                            <h2 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-tight">
                                Lançamentos Exclusivos do Mês
                            </h2>
                            <p className="text-sm text-zinc-400 max-w-md leading-relaxed font-medium">
                                {deliveryMode === 'gumroad'
                                    ? 'Conecte sua conta do Patreon para liberar seus cupons exclusivos de download no Gumroad e acesso aos arquivos 3D.'
                                    : deliveryMode === 'drive'
                                    ? 'Conecte sua conta do Patreon para acessar a pasta exclusiva do mês no Google Drive.'
                                    : 'Conecte sua conta do Patreon para liberar o acesso aos lançamentos no Gumroad e no Google Drive.'}
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
                    /* ESTADO 2: MEMBRO AUTENTICADO COM CARDS DOS PRODUTOS LIBERADOS */
                    <div className="w-full space-y-10 animate-in fade-in zoom-in duration-500 my-auto">
                        
                        <div className="text-center space-y-3">
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-full inline-block">
                                Assinatura Confirmada
                            </span>
                            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                                Olá, {patronName}!
                            </h2>
                            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-lg mx-auto font-medium">
                                Como apoiador ativo (<strong className="text-orange-400">{patronEmail}</strong>), seus modelos deste mês estão disponíveis abaixo.
                            </p>
                        </div>

                        {/* SEÇÃO 1: RESGATE GUMROAD EM CARDS (SE HABILITADO) */}
                        {(deliveryMode === 'gumroad' || deliveryMode === 'both') && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                            <Package size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-wider text-white">
                                                Lançamentos do Mês (100% Grátis)
                                            </h3>
                                            <p className="text-[11px] text-zinc-400">
                                                Resgate seu cupom pessoal de uso único para adicionar à sua conta do Gumroad
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-auto bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                                        <ShieldCheck size={13} className="text-emerald-400" /> Licença Pessoal Anti-Leak
                                    </span>
                                </div>

                                {gumroadProducts.length === 0 ? (
                                    <div className="p-12 bg-zinc-950/80 border border-dashed border-zinc-800 rounded-3xl text-center space-y-3">
                                        <Package size={36} className="mx-auto text-zinc-600" />
                                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                                            Nenhum lançamento liberado no momento.
                                        </p>
                                        <p className="text-[11px] text-zinc-600">
                                            Os novos arquivos do mês serão ativados em breve pelo Franga Studio.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {gumroadProducts.map((prod) => {
                                            const hasClaim = !!prod.claim;
                                            const isClaiming = claimingId === prod.id;

                                            return (
                                                <div 
                                                    key={prod.id} 
                                                    className="bg-zinc-950/90 border border-zinc-800/80 hover:border-orange-500/40 rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.12)] group relative"
                                                >
                                                    {/* Top Cover / Thumbnail */}
                                                    <div className="relative aspect-[16/10] w-full bg-zinc-900/80 overflow-hidden border-b border-zinc-800/80">
                                                        {prod.cover_url ? (
                                                            <img 
                                                                src={prod.cover_url} 
                                                                alt={prod.name}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black">
                                                                <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 mb-2 group-hover:scale-110 transition-transform">
                                                                    <Package size={28} />
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Franga Studio STL</span>
                                                            </div>
                                                        )}

                                                        <div className="absolute top-3 right-3">
                                                            <span className="bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1">
                                                                <CheckCircle2 size={11} /> Incluso ($0,00)
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Card Body */}
                                                    <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                                                        <div className="space-y-2">
                                                            <h3 className="text-base font-black text-white group-hover:text-orange-400 transition-colors leading-snug line-clamp-2">
                                                                {prod.name}
                                                            </h3>
                                                            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                                                {prod.description || 'Arquivo STL oficial preparado e testado para impressão 3D.'}
                                                            </p>
                                                        </div>

                                                        {/* Action Section */}
                                                        <div className="space-y-3 pt-2">
                                                            {hasClaim ? (
                                                                <div className="space-y-2.5">
                                                                    <div className="p-3 bg-zinc-900/90 rounded-2xl border border-zinc-800 flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <KeyRound size={14} className="text-orange-400 shrink-0" />
                                                                            <span className="text-xs font-mono font-bold text-orange-300">
                                                                                {prod.claim.coupon_code}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                                            <CheckCircle2 size={10} /> Cupom Emitido
                                                                        </span>
                                                                    </div>

                                                                    <a
                                                                        href={prod.claim.checkout_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
                                                                    >
                                                                        <span>Abrir no Gumroad ($0,00)</span>
                                                                        <ExternalLink size={14} />
                                                                    </a>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleClaimCoupon(prod.id)}
                                                                    disabled={isClaiming}
                                                                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-black text-xs uppercase tracking-[0.15em] rounded-xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                                                >
                                                                    <Ticket size={16} />
                                                                    <span>{isClaiming ? 'Gerando Cupom...' : 'Resgatar Grátis ($0,00)'}</span>
                                                                    <ArrowRight size={15} />
                                                                </button>
                                                            )}

                                                            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider pt-2 border-t border-zinc-900">
                                                                <span>1 resgate por membro</span>
                                                                <span>Gumroad Library</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SEÇÃO 2: GOOGLE DRIVE (SE HABILITADO) */}
                        {(deliveryMode === 'drive' || deliveryMode === 'both') && activeRepoUrl && (
                            <div className="p-6 sm:p-8 bg-zinc-950/80 border border-zinc-800/80 rounded-3xl space-y-4">
                                <div className="flex items-center justify-between text-xs text-zinc-400 font-bold uppercase tracking-wider">
                                    <div className="flex items-center gap-2">
                                        <FolderGit2 size={16} className="text-orange-400" />
                                        <span>
                                            {deliveryMode === 'both' ? 'Acesso Alternativo via Google Drive' : 'Lançamentos do Mês (Google Drive)'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                        <ShieldCheck size={12} className="text-emerald-400" /> Pasta Restrita
                                    </span>
                                </div>

                                <a
                                    href={activeRepoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20 active:scale-98"
                                >
                                    <span>Abrir Pasta do Mês no Google Drive</span>
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        )}

                    </div>
                )}
            </main>

            {/* Footer Fixo */}
            <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600 font-bold uppercase tracking-widest">
                {deliveryMode === 'gumroad'
                    ? 'Franga Studio Releases • Proteção Anti-Leak Gumroad'
                    : deliveryMode === 'drive'
                    ? 'Franga Studio Releases • Repositório Google Drive'
                    : 'Franga Studio Releases • Gumroad & Google Drive'}
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
