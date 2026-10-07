'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    FolderGit2, Save, Check, Terminal, RefreshCw, Lock, Copy, Sparkles, 
    UserCheck, ArrowLeft, ExternalLink, ShieldCheck, ShoppingBag, 
    Ticket, KeyRound, AlertTriangle, CheckCircle2, Clock, Package,
    Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPatreonRepositoryPage() {
    // Aba Ativa: 'gumroad' | 'drive'
    const [activeTab, setActiveTab] = useState<'gumroad' | 'drive'>('gumroad');

    // --- ESTADO GUMROAD & ANTI-LEAK ---
    const [gumroadUser, setGumroadUser] = useState<any>(null);
    const [gumroadProducts, setGumroadProducts] = useState<any[]>([]);
    const [claims, setClaims] = useState<any[]>([]);
    const [loadingGumroad, setLoadingGumroad] = useState(false);
    const [syncingSales, setSyncingSales] = useState(false);

    // Controle de produtos visíveis/liberados em /release
    const [enabledProducts, setEnabledProducts] = useState<string[]>([]);
    const [updatingEnabledProduct, setUpdatingEnabledProduct] = useState<string | null>(null);

    // Form de emissão de cupom Gumroad
    const [selectedProductId, setSelectedProductId] = useState('');
    const [patronEmail, setPatronEmail] = useState('');
    const [patronName, setPatronName] = useState('');
    const [generatingCoupon, setGeneratingCoupon] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');
    const [generatedCouponCode, setGeneratedCouponCode] = useState('');
    const [copiedCouponLink, setCopiedCouponLink] = useState(false);

    // --- ESTADO REPOSITÓRIO DRIVE (Legado/Alternativo) ---
    const [patreonRepoUrl, setPatreonRepoUrl] = useState('');
    const [savedPatreonRepoUrl, setSavedPatreonRepoUrl] = useState('');
    const [savingPatreonRepo, setSavingPatreonRepo] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(true);

    const [contractorEmail, setContractorEmail] = useState('');
    const [contractorRepoUrl, setContractorRepoUrl] = useState('');
    const [contractorLink, setContractorLink] = useState('');
    const [copiedContractorLink, setCopiedContractorLink] = useState(false);

    // --- MODO DE ENTREGA VISÍVEL EM /release ---
    const [deliveryMode, setDeliveryMode] = useState<'gumroad' | 'drive' | 'both'>('gumroad');
    const [updatingDeliveryMode, setUpdatingDeliveryMode] = useState(false);

    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Carregar configurações (modo de entrega e produtos habilitados)
    const fetchDeliveryMode = async () => {
        try {
            const res = await fetch('/api/admin/franga-studio/config');
            if (res.ok) {
                const data = await res.json();
                if (data.deliveryMode) setDeliveryMode(data.deliveryMode);
                if (Array.isArray(data.enabledProducts)) setEnabledProducts(data.enabledProducts);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateDeliveryMode = async (mode: 'gumroad' | 'drive' | 'both') => {
        setUpdatingDeliveryMode(true);
        setDeliveryMode(mode);
        try {
            const res = await fetch('/api/admin/franga-studio/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deliveryMode: mode })
            });
            if (!res.ok) throw new Error('Falha ao atualizar modo');
            toast.success(`Modo ativo em /release: ${mode === 'gumroad' ? 'Exclusivo Gumroad' : mode === 'drive' ? 'Exclusivo Google Drive' : 'Ambos Habilitados'}`);
        } catch (e: any) {
            toast.error('Erro ao atualizar modo de entrega');
        } finally {
            setUpdatingDeliveryMode(false);
        }
    };

    // Alternar visibilidade de um produto no /release
    const handleToggleProductRelease = async (productId: string, productName: string) => {
        const isCurrentlyEnabled = enabledProducts.includes(productId);
        const newEnabled = isCurrentlyEnabled
            ? enabledProducts.filter(id => id !== productId)
            : [...enabledProducts, productId];

        setEnabledProducts(newEnabled);
        setUpdatingEnabledProduct(productId);
        try {
            const res = await fetch('/api/admin/franga-studio/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabledProducts: newEnabled })
            });
            if (!res.ok) throw new Error('Falha ao atualizar produtos liberados');
            if (isCurrentlyEnabled) {
                toast.info(`"${productName}" foi ocultado do /release.`);
            } else {
                toast.success(`"${productName}" liberado para membros no /release!`);
            }
        } catch (e: any) {
            toast.error('Erro ao atualizar produto liberado.');
            setEnabledProducts(enabledProducts);
        } finally {
            setUpdatingEnabledProduct(null);
        }
    };

    // Carregar dados do Gumroad
    const fetchGumroadData = async () => {
        try {
            setLoadingGumroad(true);
            const res = await fetch('/api/admin/gumroad');
            if (res.ok) {
                const data = await res.json();
                setGumroadUser(data.user);
                setGumroadProducts(data.products || []);
                setClaims(data.claims || []);
                if (Array.isArray(data.enabledProducts)) setEnabledProducts(data.enabledProducts);
                if (data.products && data.products.length > 0 && !selectedProductId) {
                    setSelectedProductId(data.products[0].id);
                }
            }
        } catch (e) {
            console.error('Erro ao carregar dados do Gumroad:', e);
            toast.error('Erro ao conectar na API do Gumroad');
        } finally {
            setLoadingGumroad(false);
        }
    };

    // Sincronizar resgates via API de vendas do Gumroad
    const handleSyncSales = async () => {
        try {
            setSyncingSales(true);
            const res = await fetch('/api/admin/gumroad', { method: 'PUT' });
            if (res.ok) {
                const data = await res.json();
                toast.success(`Sincronização concluída: ${data.claimsUpdated || 0} resgate(s) atualizados.`);
                fetchGumroadData();
            } else {
                throw new Error('Falha na sincronização');
            }
        } catch (e: any) {
            toast.error(e.message || 'Erro ao sincronizar resgates');
        } finally {
            setSyncingSales(false);
        }
    };

    // Gerar Cupom Único no Gumroad
    const handleGenerateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductId) {
            toast.error('Selecione um produto do Gumroad');
            return;
        }
        if (!patronEmail.trim()) {
            toast.error('Informe o e-mail do assinante');
            return;
        }

        setGeneratingCoupon(true);
        try {
            const res = await fetch('/api/admin/gumroad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProductId,
                    patronEmail: patronEmail.trim(),
                    patronName: patronName.trim() || undefined
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao gerar cupom');

            setGeneratedLink(data.checkoutUrl);
            setGeneratedCouponCode(data.couponCode);
            toast.success(`Cupom de uso único gerado com sucesso: ${data.couponCode}`);
            fetchGumroadData();
        } catch (e: any) {
            toast.error(e.message || 'Erro ao gerar cupom no Gumroad');
        } finally {
            setGeneratingCoupon(false);
        }
    };

    const copyGeneratedLink = async () => {
        if (!generatedLink) return;
        try {
            await navigator.clipboard.writeText(generatedLink);
            setCopiedCouponLink(true);
            toast.success('Link de resgate 100% OFF copiado!');
            setTimeout(() => setCopiedCouponLink(false), 2000);
        } catch (e) {
            toast.error('Erro ao copiar link');
        }
    };

    // Carregar configurações de Drive
    const fetchActiveRepoConfig = async () => {
        try {
            setLoadingConfig(true);
            const res = await fetch('/api/admin/integrations/patreon/repository');
            if (res.ok) {
                const data = await res.json();
                if (data.repoUrl) {
                    setPatreonRepoUrl(data.repoUrl);
                    setSavedPatreonRepoUrl(data.repoUrl);
                }
            }
        } catch (e) {
            console.error('Erro ao carregar repositório do banco:', e);
        } finally {
            setLoadingConfig(false);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            setLoadingLogs(true);
            const res = await fetch('/api/admin/integrations/patreon/tokens');
            if (res.ok) {
                const data = await res.json();
                setRecentLogs(data || []);
            }
        } catch (e) {
            console.error('Erro ao carregar logs:', e);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        fetchDeliveryMode();
        fetchGumroadData();
        fetchActiveRepoConfig();
        fetchAuditLogs();
    }, []);

    const handleSavePatreonRepo = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingPatreonRepo(true);
        try {
            const res = await fetch('/api/admin/integrations/patreon/repository', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl: patreonRepoUrl.trim() })
            });
            if (!res.ok) throw new Error('Erro ao salvar repositório no servidor.');
            const data = await res.json();
            setSavedPatreonRepoUrl(data.repoUrl);
            toast.success('Repositório do Google Drive salvo com sucesso!');
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar repositório.');
        } finally {
            setSavingPatreonRepo(false);
        }
    };

    const handleCreateContractorAccess = (e: React.FormEvent) => {
        e.preventDefault();
        if (!contractorEmail.trim() || !contractorRepoUrl.trim()) {
            toast.error('Informe o e-mail do terceirizado e a URL do repositório.');
            return;
        }
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://frangatoys.com.br';
        const link = `${origin}/release?contractor=${encodeURIComponent(contractorEmail.trim())}`;
        setContractorLink(link);
        toast.success(`Link gerado para: ${contractorEmail}`);
    };

    const copyContractorLink = async () => {
        if (!contractorLink) return;
        try {
            await navigator.clipboard.writeText(contractorLink);
            setCopiedContractorLink(true);
            toast.success('Link do terceirizado copiado!');
            setTimeout(() => setCopiedContractorLink(false), 2000);
        } catch (e) {
            toast.error('Erro ao copiar');
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-8 space-y-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">
                
                {/* Header Admin */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
                    <div className="flex items-center gap-4">
                        <Link 
                            href="/admin" 
                            className="p-3 bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400 rounded-2xl transition-all text-zinc-400 group cursor-pointer"
                            title="Voltar ao Painel Admin"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div className="p-3.5 bg-gradient-to-br from-orange-500/20 via-amber-500/20 to-orange-600/20 border border-orange-500/30 rounded-2xl text-orange-400 shadow-lg">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                                    Franga Studio • Anti-Leak System
                                </span>
                                {gumroadUser && (
                                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        Gumroad Conectado
                                    </span>
                                )}
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
                                Franga Studio
                            </h1>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Distribuição de STL com Cupons Únicos Anti-Leak via Gumroad e Auditoria
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {gumroadUser?.url && (
                            <a
                                href={gumroadUser.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-orange-500/40 text-orange-300 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm group cursor-pointer"
                            >
                                <ShoppingBag size={14} className="text-orange-400" />
                                <span>Ver Loja ({gumroadUser.url.replace('https://', '')})</span>
                                <ExternalLink size={12} className="group-hover:translate-x-0.5 transition-transform opacity-70" />
                            </a>
                        )}
                        <Link
                            href="/release"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-orange-500/40 text-orange-300 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm group cursor-pointer"
                        >
                            <span>Página do Membro (/release)</span>
                            <ExternalLink size={12} className="group-hover:translate-x-0.5 transition-transform text-orange-400" />
                        </Link>
                    </div>
                </div>

                {/* CONTROLE MESTRE DE ACESSO PARA MEMBROS (/release) */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-orange-400" />
                                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                                    Modo de Entrega Visível para os Membros (/release)
                                </h2>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1">
                                Defina qual tela os apoiadores verão ao logar no portal. Você tem controle total para isolar métodos.
                            </p>
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-wider bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 self-start sm:self-auto flex items-center gap-1.5 text-zinc-400">
                            Modo Ativo: <strong className="text-orange-400 font-bold">{deliveryMode === 'gumroad' ? 'GUMROAD ANTI-LEAK' : deliveryMode === 'drive' ? 'GOOGLE DRIVE' : 'AMBOS'}</strong>
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                        {/* OPÇÃO 1: GUMROAD */}
                        <button
                            type="button"
                            onClick={() => handleUpdateDeliveryMode('gumroad')}
                            disabled={updatingDeliveryMode}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                                deliveryMode === 'gumroad'
                                    ? 'bg-orange-950/30 border-orange-500/60 shadow-lg shadow-orange-500/10'
                                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-white">
                                    <ShoppingBag size={15} className="text-orange-400" />
                                    Exclusivo Gumroad
                                </span>
                                {deliveryMode === 'gumroad' && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
                                )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                                Membros só veem e resgatam cupons únicos do Gumroad. <strong className="text-orange-300">Google Drive 100% oculto</strong>.
                            </p>
                        </button>

                        {/* OPÇÃO 2: DRIVE */}
                        <button
                            type="button"
                            onClick={() => handleUpdateDeliveryMode('drive')}
                            disabled={updatingDeliveryMode}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                                deliveryMode === 'drive'
                                    ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-500/10'
                                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-white">
                                    <FolderGit2 size={15} className="text-amber-400" />
                                    Exclusivo Google Drive
                                </span>
                                {deliveryMode === 'drive' && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                                )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                                Membros só veem a pasta do Google Drive. <strong className="text-amber-300">Gumroad 100% oculto</strong>.
                            </p>
                        </button>

                        {/* OPÇÃO 3: BOTH */}
                        <button
                            type="button"
                            onClick={() => handleUpdateDeliveryMode('both')}
                            disabled={updatingDeliveryMode}
                            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                                deliveryMode === 'both'
                                    ? 'bg-zinc-900 border-zinc-700 shadow-lg'
                                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-white">
                                    <Sparkles size={15} className="text-orange-400" />
                                    Ambos Habilitados
                                </span>
                                {deliveryMode === 'both' && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
                                )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                                Exibe tanto o resgate de cupom do Gumroad quanto o link da pasta do Google Drive.
                            </p>
                        </button>
                    </div>
                </div>

                {/* NAVEGAÇÃO DE ABAS */}
                <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-1">
                    <button
                        onClick={() => setActiveTab('gumroad')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === 'gumroad'
                                ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/30 shadow-md'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                    >
                        <ShieldCheck size={16} />
                        Distribuição Gumroad (Anti-Leak)
                    </button>
                    <button
                        onClick={() => setActiveTab('drive')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === 'drive'
                                ? 'bg-zinc-900 text-amber-400 border border-amber-500/30 shadow-md'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                    >
                        <FolderGit2 size={16} />
                        Google Drive & Terceirizados
                    </button>
                </div>

                {/* ABA 1: GUMROAD ANTI-LEAK */}
                {activeTab === 'gumroad' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        
                        {/* BANNER STATUS DA LOJA */}
                        <div className="bg-gradient-to-r from-orange-950/30 via-zinc-900/60 to-amber-950/30 border border-orange-500/20 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                {gumroadUser?.profile_picture_url ? (
                                    <img 
                                        src={gumroadUser.profile_picture_url} 
                                        alt="Avatar Gumroad" 
                                        className="w-16 h-16 rounded-2xl border-2 border-orange-500/40 object-cover shadow-lg"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                                        <ShoppingBag size={28} />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-black text-white">
                                            {gumroadUser?.name || 'Franga Toys'}
                                        </h2>
                                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                                            Loja Ativa
                                        </span>
                                    </div>
                                    <p className="text-xs text-orange-300 font-mono mt-0.5">
                                        {gumroadUser?.url || 'https://frangatoys.gumroad.com'}
                                    </p>
                                    <p className="text-[11px] text-zinc-400 mt-1">
                                        E-mail da Conta: <span className="text-zinc-300 font-medium">{gumroadUser?.email || '-'}</span> • Moeda: <span className="uppercase text-zinc-300 font-bold">{gumroadUser?.currency_type || 'USD'}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Produtos no Gumroad</div>
                                    <div className="text-2xl font-black text-white mt-0.5">{gumroadProducts.length}</div>
                                </div>
                                <div className="h-10 w-[1px] bg-zinc-800"></div>
                                <div className="text-right">
                                    <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Cupons Emitidos</div>
                                    <div className="text-2xl font-black text-orange-400 mt-0.5">{claims.length}</div>
                                </div>
                                <div className="h-10 w-[1px] bg-zinc-800"></div>
                                <button
                                    onClick={fetchGumroadData}
                                    disabled={loadingGumroad}
                                    className="p-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
                                    title="Atualizar dados do Gumroad"
                                >
                                    <RefreshCw size={16} className={loadingGumroad ? 'animate-spin text-orange-400' : ''} />
                                </button>
                            </div>
                        </div>

                        {/* CONTROLE DE MODELOS LIBERADOS EM /release */}
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20">
                                        <Package size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                                            <span>Modelos Liberados para os Membros no /release</span>
                                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">
                                                {enabledProducts.length} de {gumroadProducts.length} liberados
                                            </span>
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            Defina quais produtos aparecem como cards em /release. Apoiadores só veem os modelos marcados como Liberado.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {gumroadProducts.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500 text-xs italic">
                                    Nenhum produto cadastrado no Gumroad.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {gumroadProducts.map((p) => {
                                        const isEnabled = enabledProducts.includes(p.id);
                                        const isUpdating = updatingEnabledProduct === p.id;
                                        const cover = (p.covers && p.covers[0]?.url) || p.preview_url || p.thumbnail_url;

                                        return (
                                            <div 
                                                key={p.id}
                                                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                                                    isEnabled 
                                                        ? 'bg-zinc-950/90 border-orange-500/50 shadow-lg shadow-orange-500/5' 
                                                        : 'bg-zinc-950/40 border-zinc-800/80 opacity-70 hover:opacity-100'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-14 h-14 rounded-xl bg-zinc-900 overflow-hidden border border-zinc-800 shrink-0 flex items-center justify-center">
                                                        {cover ? (
                                                            <img src={cover} alt={p.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package size={22} className="text-zinc-600" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="text-xs font-black text-white truncate block">
                                                            {p.name}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-zinc-400 font-mono font-bold">
                                                                {p.formatted_price}
                                                            </span>
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                                                p.published 
                                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                                    : 'bg-zinc-800 text-zinc-400'
                                                            }`}>
                                                                {p.published ? 'Publicado' : 'Rascunho'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-zinc-850 flex items-center justify-between gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleProductRelease(p.id, p.name)}
                                                        disabled={isUpdating}
                                                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                                            isEnabled
                                                                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20'
                                                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
                                                        }`}
                                                    >
                                                        {isEnabled ? (
                                                            <>
                                                                <Eye size={14} />
                                                                <span>Liberado no /release</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <EyeOff size={14} />
                                                                <span>Oculto no /release</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    {p.short_url && (
                                                        <a
                                                            href={p.short_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition-all cursor-pointer"
                                                            title="Ver produto no Gumroad"
                                                        >
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* GRID: EMISSOR DE CUPOM & EXPLICATIVO */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            
                            {/* FORM: GERADOR DE CUPOM ÚNICO */}
                            <div className="lg:col-span-7 bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20">
                                        <Ticket size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-white uppercase tracking-wider">
                                            Gerador de Cupom Anti-Leak (100% OFF)
                                        </h3>
                                        <p className="text-xs text-zinc-400">
                                            Gera um código de uso único (max 1 uso) na API do Gumroad vinculado ao e-mail do assinante.
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={handleGenerateCoupon} className="space-y-4 pt-1">
                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">
                                            1. Selecione o Produto / Modelo no Gumroad
                                        </label>
                                        <select
                                            value={selectedProductId}
                                            onChange={e => setSelectedProductId(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl px-4 py-3 text-xs text-white outline-none transition-all cursor-pointer"
                                            required
                                        >
                                            {gumroadProducts.length === 0 ? (
                                                <option value="">Nenhum produto cadastrado no Gumroad</option>
                                            ) : (
                                                gumroadProducts.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} — {p.formatted_price} {p.published ? '(Publicado)' : '(Rascunho)'}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">
                                                2. E-mail do Patrono / Assinante
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="patrono@email.com"
                                                value={patronEmail}
                                                onChange={e => setPatronEmail(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">
                                                Nome do Assinante (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Nome do apoiador"
                                                value={patronName}
                                                onChange={e => setPatronName(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={generatingCoupon || gumroadProducts.length === 0}
                                        className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-98 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        <Sparkles size={16} />
                                        {generatingCoupon ? 'Gerando no Gumroad...' : 'Gerar Cupom Único (100% OFF)'}
                                    </button>
                                </form>

                                {/* RESULTADO DO CUPOM GERADO */}
                                {generatedLink && (
                                    <div className="p-4 bg-zinc-950 rounded-2xl border border-orange-500/30 space-y-3 animate-in fade-in duration-200 shadow-xl">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <KeyRound size={16} className="text-orange-400" />
                                                <span className="text-xs font-black uppercase tracking-wider text-orange-400">
                                                    Cupom Gerado: <span className="font-mono text-white bg-orange-500/20 px-2 py-0.5 rounded-lg border border-orange-500/30">{generatedCouponCode}</span>
                                                </span>
                                            </div>
                                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                                                <CheckCircle2 size={12} /> Limite: 1 Uso
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={generatedLink}
                                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-orange-300 outline-none truncate"
                                            />
                                            <button
                                                onClick={copyGeneratedLink}
                                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs shrink-0 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-orange-500/20"
                                            >
                                                {copiedCouponLink ? <Check size={14} /> : <Copy size={14} />}
                                                {copiedCouponLink ? 'Copiado!' : 'Copiar Link'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* CARD INFORMATIVO: POR QUE É ANTI-LEAK */}
                            <div className="lg:col-span-5 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between space-y-4">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-orange-400">
                                        <ShieldCheck size={22} />
                                        <h3 className="text-sm font-black uppercase tracking-wider text-white">
                                            Como o Mecanismo Protege seus STLs
                                        </h3>
                                    </div>

                                    <ul className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                                        <li className="flex items-start gap-2.5">
                                            <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">1</div>
                                            <div>
                                                <strong className="text-white">Uso Estritamente Único:</strong> O cupom é criado na API com <code className="text-orange-300 bg-orange-500/10 px-1 py-0.5 rounded">max_purchase_count: 1</code>. Assim que o assinante resgata, o código queima e se torna inválido.
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">2</div>
                                            <div>
                                                <strong className="text-white">Identificação Pessoal:</strong> Para baixar por $0 no Gumroad, o usuário precisa vincular sua conta do Gumroad. O Gumroad emite um recibo oficial com data, hora e e-mail.
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">3</div>
                                            <div>
                                                <strong className="text-white">Rastreamento de Vazamentos:</strong> Se um arquivo aparecer vazado, a API do Gumroad revela exatamente qual cupom foi usado e o e-mail do comprador que fez o resgate.
                                            </div>
                                        </li>
                                    </ul>
                                </div>

                                <div className="p-3 bg-zinc-950/80 rounded-2xl border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                                    <span>Se o patrono tentar repassar o link para amigos ou em grupos, ninguém conseguirá usar após o primeiro download.</span>
                                </div>
                            </div>
                        </div>

                        {/* TABELA DE AUDITORIA & CUPONS EMITIDOS */}
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <Terminal size={18} className="text-orange-400" />
                                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                                        Auditoria de Cupons Emitidos & Resgates
                                    </h3>
                                    <span className="text-[10px] bg-zinc-800 text-zinc-400 font-bold px-2 py-0.5 rounded-full">
                                        {claims.length} registros
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={handleSyncSales} 
                                        disabled={syncingSales}
                                        className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-orange-300 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                                        title="Cruzar cupons emitidos com o extrato de vendas do Gumroad"
                                    >
                                        <RefreshCw size={13} className={syncingSales ? 'animate-spin text-orange-400' : ''} />
                                        {syncingSales ? 'Sincronizando...' : 'Verificar Resgates no Gumroad'}
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-zinc-300">
                                    <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800">
                                        <tr>
                                            <th className="py-3 px-4">Patrono / E-mail</th>
                                            <th className="py-3 px-4">Produto</th>
                                            <th className="py-3 px-4">Código do Cupom</th>
                                            <th className="py-3 px-4 text-center">Status</th>
                                            <th className="py-3 px-4">Data Emissão</th>
                                            <th className="py-3 px-4 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50 font-mono">
                                        {claims.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-zinc-600 italic">
                                                    Nenhum cupom gerado ainda. Gere o primeiro cupom acima!
                                                </td>
                                            </tr>
                                        ) : (
                                            claims.map((c: any) => (
                                                <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="font-sans font-bold text-white">{c.patron_email}</div>
                                                        {c.patron_name && (
                                                            <div className="text-[10px] text-zinc-500 font-sans">{c.patron_name}</div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 font-sans text-zinc-300">
                                                        {c.product_name || 'Produto Gumroad'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-orange-400 font-bold">
                                                            {c.coupon_code}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {c.is_redeemed ? (
                                                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                                                <Check size={11} /> Resgatado
                                                            </span>
                                                        ) : (
                                                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                                                <Clock size={11} /> Pendente (1 uso restante)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-zinc-500 text-[11px] font-sans">
                                                        {new Date(c.created_at).toLocaleString('pt-BR')}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        {c.checkout_url && (
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(c.checkout_url);
                                                                    toast.success('Link copiado!');
                                                                }}
                                                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-bold font-sans cursor-pointer transition-all inline-flex items-center gap-1"
                                                            >
                                                                <Copy size={11} /> Copiar Link
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}

                {/* ABA 2: GOOGLE DRIVE & TERCEIRIZADOS (LEGADO) */}
                {activeTab === 'drive' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* SEÇÃO 1: PASTA ATIVA DO PATREON */}
                            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                                        <FolderGit2 size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-white uppercase tracking-wider">
                                            1. Repositório Ativo dos Membros (Google Drive)
                                        </h2>
                                        <p className="text-xs text-zinc-400">
                                            Informe a URL da pasta do mês. Todos os membros ativos baixarão desta pasta até você alterá-la.
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={handleSavePatreonRepo} className="space-y-3 pt-2">
                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">
                                            URL da Pasta do Google Drive
                                        </label>
                                        <input
                                            type="url"
                                            placeholder="https://drive.google.com/drive/folders/..."
                                            value={patreonRepoUrl}
                                            onChange={e => setPatreonRepoUrl(e.target.value)}
                                            disabled={loadingConfig}
                                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-4 py-3 text-xs font-mono text-amber-300 outline-none transition-all disabled:opacity-50"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={savingPatreonRepo || loadingConfig}
                                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        <Save size={16} />
                                        {savingPatreonRepo ? 'Salvando no Banco...' : 'Salvar Repositório do Drive'}
                                    </button>
                                </form>

                                {savedPatreonRepoUrl && (
                                    <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono pt-1">
                                        <Check size={14} /> Salvo no Banco: <span className="underline truncate">{savedPatreonRepoUrl}</span>
                                    </div>
                                )}
                            </div>

                            {/* SEÇÃO 2: TERCEIRIZADOS */}
                            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20">
                                        <UserCheck size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-white uppercase tracking-wider">
                                            2. Enviar Arquivos para Terceirizados
                                        </h2>
                                        <p className="text-xs text-zinc-400">
                                            Disponibilize arquivos ou repositórios específicos para parceiros e prestadores de serviço com rastreamento de IP e e-mail.
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={handleCreateContractorAccess} className="space-y-3 pt-2">
                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">
                                            E-mail do Terceirizado / Freelancer
                                        </label>
                                        <input
                                            type="email"
                                            placeholder="prestador@terceirizado.com"
                                            value={contractorEmail}
                                            onChange={e => setContractorEmail(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">
                                            URL da Pasta do Projeto
                                        </label>
                                        <input
                                            type="url"
                                            placeholder="https://drive.google.com/..."
                                            value={contractorRepoUrl}
                                            onChange={e => setContractorRepoUrl(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl px-4 py-2.5 text-xs font-mono text-orange-300 outline-none transition-all"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-98 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Sparkles size={16} />
                                        Gerar Link de Acesso do Terceirizado
                                    </button>
                                </form>

                                {contractorLink && (
                                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2 animate-in fade-in duration-200">
                                        <span className="text-[10px] font-black uppercase text-orange-400">Link Protegido:</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={contractorLink}
                                                className="flex-1 bg-transparent text-[11px] font-mono text-zinc-300 outline-none truncate"
                                            />
                                            <button
                                                onClick={copyContractorLink}
                                                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                                            >
                                                {copiedContractorLink ? <Check size={12} /> : <Copy size={12} />}
                                                {copiedContractorLink ? 'Copiado' : 'Copiar'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* TABELA DE AUDITORIA DRIVE */}
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Terminal size={18} className="text-amber-400" />
                                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                                        Rastreamento de Downloads Drive em Tempo Real
                                    </h3>
                                </div>
                                <button onClick={fetchAuditLogs} className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer">
                                    <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} /> Atualizar Log
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-zinc-300">
                                    <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800">
                                        <tr>
                                            <th className="py-3 px-4">Usuário / Terceirizado</th>
                                            <th className="py-3 px-4">Repositório / Arquivo</th>
                                            <th className="py-3 px-4">IP Registrado</th>
                                            <th className="py-3 px-4">Data/Hora</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50 font-mono">
                                        {recentLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-6 text-center text-zinc-600 italic">
                                                    Nenhum download registrado ainda.
                                                </td>
                                            </tr>
                                        ) : (
                                            recentLogs.map((t: any) => (
                                                <tr key={t.id} className="hover:bg-zinc-800/40">
                                                    <td className="py-3 px-4 font-sans font-bold text-white">{t.patron_email}</td>
                                                    <td className="py-3 px-4 truncate max-w-xs text-purple-300">{t.real_file_url}</td>
                                                    <td className="py-3 px-4 text-zinc-400">{t.user_ip || '-'}</td>
                                                    <td className="py-3 px-4 text-zinc-500 text-[11px] font-sans">
                                                        {new Date(t.created_at).toLocaleString('pt-BR')}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}
