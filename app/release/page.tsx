'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Sparkles, ShieldCheck, Lock, LogOut, FolderGit2, CheckCircle2, 
    ExternalLink, AlertCircle, ShoppingBag, Ticket, KeyRound, Clock, 
    ArrowRight, Package, UserCheck, AlertTriangle, RefreshCw
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
    const testPatronQuery = searchParams.get('test_patron');

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [patronEmail, setPatronEmail] = useState('');
    const [patronName, setPatronName] = useState('');
    const [activeRepoUrl, setActiveRepoUrl] = useState('');

    // Estado dos lançamentos do Gumroad
    const [gumroadProducts, setGumroadProducts] = useState<any[]>([]);
    const [deliveryMode, setDeliveryMode] = useState<'gumroad' | 'drive' | 'both'>('gumroad');
    const [patreonAccessRule, setPatreonAccessRule] = useState<'paid_only' | 'all'>('paid_only');
    const [testMode, setTestMode] = useState<'paid' | 'free' | null>(null);
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
                if (data.patreonAccessRule) {
                    setPatreonAccessRule(data.patreonAccessRule);
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

        if (testPatronQuery === 'paid') {
            setTestMode('paid');
            setIsAuthenticated(true);
            setPatronEmail('apoiador.pagante@teste.com');
            setPatronName('Apoiador Pagante (Teste)');
            toast.success('🧪 Simulação Ativa: Apoiador Pagante');
            fetchGumroadStatus('apoiador.pagante@teste.com');
        } else if (testPatronQuery === 'free') {
            setTestMode('free');
            setPatronEmail('membro.free@teste.com');
            setPatronName('Membro Free (Teste)');
            fetchGumroadStatus('membro.free@teste.com');
            toast.info('🧪 Simulação Ativa: Membro Gratuito (Free)');
        } else if (contractorQuery) {
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
            if (errorQuery === 'free_patron_upgrade_needed') {
                toast.error('Conta gratuita no Patreon detectada. Assinatura paga necessária.');
            } else if (errorQuery === 'not_active_patron') {
                toast.error('Assinatura no Patreon não encontrada ou inativa.');
            } else if (errorQuery === 'login_cancelled') {
                toast.error('Login cancelado.');
            } else {
                toast.error('Não foi possível verificar a assinatura no momento.');
            }
        }
    }, [accessQuery, emailQuery, nameQuery, folderQuery, errorQuery, contractorQuery, testPatronQuery]);

    // Redirecionamento para o Patreon
    const handlePatreonLogin = () => {
        toast.loading('Entrando no Patreon...');
        window.location.href = '/api/auth/patreon/login';
    };

    return (
        <div className="min-h-screen bg-[#060608] text-white font-sans selection:bg-orange-500 selection:text-black flex flex-col justify-between">
            
            {/* Top Banner de Simulação / Teste */}
            {testMode && (
                <div className="bg-orange-500/10 border-b border-orange-500/25 px-4 py-2.5 sticky top-0 z-50 backdrop-blur-xl">
                    <div className="max-w-6xl mx-auto w-full flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded-md bg-orange-500 text-black font-black text-[10px] uppercase tracking-wider">
                                Simulador de Teste
                            </span>
                            <span className="text-zinc-200 font-medium">
                                {testMode === 'paid' ? (
                                    <>Simulando: <strong className="text-emerald-400 font-bold">Apoiador Pagante (Assinatura Ativa)</strong></>
                                ) : (
                                    <>Simulando: <strong className="text-amber-400 font-bold">Membro Gratuito (Free)</strong> &bull; Regra Ativa: <span className="underline decoration-orange-500/50">{patreonAccessRule === 'paid_only' ? 'Somente Pagantes' : 'Aberto para Free + Pagantes'}</span></>
                                )}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            {testMode === 'free' ? (
                                <a 
                                    href="/release?test_patron=paid" 
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/30 transition-colors"
                                >
                                    Alternar p/ Pagante
                                </a>
                            ) : (
                                <a 
                                    href="/release?test_patron=free" 
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30 transition-colors"
                                >
                                    Alternar p/ Free
                                </a>
                            )}
                            <a 
                                href="/release" 
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-700 text-xs transition-colors"
                            >
                                Encerrar Teste
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Studio */}
            <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center font-black text-orange-400 text-sm shadow-sm">
                            F
                        </div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-wider text-white">Franga Studio</h1>
                            <span className="text-[10px] text-zinc-500 font-medium block leading-none">Releases</span>
                        </div>
                    </div>

                    {(isAuthenticated || (testMode === 'free' && patreonAccessRule === 'all')) && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/80 px-3 py-1.5 rounded-xl">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span className="text-xs font-medium text-zinc-300">{patronName || patronEmail}</span>
                            </div>
                            <button
                                onClick={() => {
                                    setIsAuthenticated(false);
                                    window.location.href = '/release';
                                }}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors p-2 cursor-pointer rounded-lg hover:bg-zinc-900"
                                title="Encerrar sessão"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-8 md:py-12 flex items-center justify-center">
                {testMode === 'free' && patreonAccessRule === 'paid_only' ? (
                    /* ESTADO SIMULADO: MEMBRO FREE BLOQUEADO (REGRA PAID ONLY) */
                    <div className="w-full max-w-md mx-auto my-auto space-y-6 animate-in fade-in duration-300">
                        <div className="text-center space-y-1">
                            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                                Lançamentos
                            </h2>
                        </div>

                        <div className="relative bg-zinc-950/90 border border-amber-500/30 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-6 text-center">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-xl">
                                <Lock size={28} className="text-amber-400" />
                            </div>

                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full inline-block">
                                    Simulação: Membro Free Bloqueado
                                </span>
                                <h3 className="text-xl font-black uppercase tracking-tight text-white">
                                    Assinatura Paga Necessária
                                </h3>
                                <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                                    A regra do estúdio está configurada para <strong>Somente Pagantes</strong>. Membros com contas gratuitas veem este bloqueio informando a necessidade de assinar um plano pago.
                                </p>
                            </div>

                            <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-xs space-y-1.5 text-left font-mono">
                                <div className="flex justify-between items-center text-zinc-400">
                                    <span>Status Simulado:</span>
                                    <span className="text-amber-400 font-bold">Free Follower (R$ 0,00)</span>
                                </div>
                                <div className="flex justify-between items-center text-zinc-400">
                                    <span>Regra Ativa:</span>
                                    <span className="text-white font-bold">paid_only (Somente Pagantes)</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <a
                                    href="/release?test_patron=paid"
                                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <UserCheck size={15} />
                                    <span>Simular com Assinatura Paga</span>
                                </a>
                                <a
                                    href="/admin/franga-studio"
                                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs rounded-xl transition-all border border-zinc-800 text-center"
                                >
                                    Ajustar Regras no Franga Studio
                                </a>
                            </div>
                        </div>
                    </div>
                ) : !isAuthenticated && !(testMode === 'free' && patreonAccessRule === 'all') ? (
                    /* ESTADO 1: TELA DE LOGIN */
                    <div className="w-full max-w-md mx-auto my-auto space-y-6">
                        <div className="text-center space-y-1">
                            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                                Lançamentos
                            </h2>
                        </div>

                        {/* Card de Acesso */}
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

                            {errorQuery === 'free_patron_upgrade_needed' ? (
                                <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-2xl text-amber-300 text-xs flex flex-col gap-1.5 text-left font-medium">
                                    <div className="flex items-center gap-2 font-bold text-amber-400">
                                        <AlertTriangle size={15} className="shrink-0" />
                                        <span>Assinatura Paga Necessária</span>
                                    </div>
                                    <span>Identificamos sua conta no Patreon, porém ela está no nível gratuito (Free). Faça upgrade para um plano ativo para liberar os arquivos.</span>
                                </div>
                            ) : errorQuery && (
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
                ) : (
                    /* ESTADO 2: MEMBRO AUTENTICADO COM CARDS DOS PRODUTOS LIBERADOS */
                    <div className="w-full space-y-8 animate-in fade-in duration-300">
                        
                        {/* Header da Página de Membro */}
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-zinc-800/80 pb-5">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                                    Lançamentos
                                </h2>
                                <p className="text-xs text-zinc-400 mt-1">
                                    Modelos e arquivos preparados para impressão 3D
                                </p>
                            </div>
                            <span className="text-[11px] text-zinc-500 font-mono self-start sm:self-auto bg-zinc-900/60 border border-zinc-800/80 px-3 py-1.5 rounded-xl">
                                {patronEmail}
                            </span>
                        </div>

                        {/* SEÇÃO 1: RESGATE GUMROAD EM CARDS (SE HABILITADO) */}
                        {(deliveryMode === 'gumroad' || deliveryMode === 'both') && (
                            <div className="space-y-6">
                                {gumroadProducts.length === 0 ? (
                                    <div className="py-16 px-6 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl text-center space-y-2">
                                        <Package size={28} className="mx-auto text-zinc-600 mb-1" />
                                        <h3 className="text-sm font-bold text-zinc-300">Nenhum lançamento liberado no momento</h3>
                                        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                                            Os novos arquivos deste ciclo serão disponibilizados em breve pelo Franga Studio.
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
                                                    className="bg-zinc-950/90 border border-zinc-800/80 hover:border-orange-500/40 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.1)] group relative"
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
                                                                    <Package size={26} />
                                                                </div>
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Franga Studio STL</span>
                                                            </div>
                                                        )}

                                                        <div className="absolute top-3 right-3">
                                                            <span className="bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-1">
                                                                <CheckCircle2 size={11} /> Liberado
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Card Body */}
                                                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                                        <div className="space-y-1.5">
                                                            <h3 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors leading-snug line-clamp-2">
                                                                {prod.name}
                                                            </h3>
                                                            <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                                                {prod.description || 'Arquivo STL oficial preparado e testado para impressão 3D.'}
                                                            </p>
                                                        </div>

                                                        {/* Action Section */}
                                                        <div className="space-y-2.5 pt-2">
                                                            {hasClaim ? (
                                                                <div className="space-y-2">
                                                                    <div className="p-2.5 bg-zinc-900/90 rounded-xl border border-zinc-800 flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <KeyRound size={13} className="text-orange-400 shrink-0" />
                                                                            <span className="text-xs font-mono font-bold text-orange-300">
                                                                                {prod.claim.coupon_code}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                                            <CheckCircle2 size={10} /> Cupom Ativo
                                                                        </span>
                                                                    </div>

                                                                    <a
                                                                        href={prod.claim.checkout_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
                                                                    >
                                                                        <span>Baixar no Gumroad</span>
                                                                        <ExternalLink size={13} />
                                                                    </a>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleClaimCoupon(prod.id)}
                                                                    disabled={isClaiming}
                                                                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                                                >
                                                                    <Ticket size={15} />
                                                                    <span>{isClaiming ? 'Gerando Cupom...' : 'Resgatar Modelo'}</span>
                                                                    <ArrowRight size={14} />
                                                                </button>
                                                            )}

                                                            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium pt-2 border-t border-zinc-900">
                                                                <span>1 resgate por apoiador</span>
                                                                <span>Gumroad</span>
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
                            <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                                        <FolderGit2 size={18} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white flex items-center gap-2">
                                            <span>Google Drive</span>
                                            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                                                {deliveryMode === 'both' ? 'Acesso Alternativo' : 'Repositório Oficial'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            Pasta com arquivos STL e versões completas para download direto
                                        </p>
                                    </div>
                                </div>

                                <a
                                    href={activeRepoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-500/20 shrink-0"
                                >
                                    <span>Acessar Pasta</span>
                                    <ExternalLink size={13} />
                                </a>
                            </div>
                        )}

                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-zinc-900/80 py-6 text-center text-xs text-zinc-600">
                Franga Studio • Modelos & Colecionáveis para Impressão 3D
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
