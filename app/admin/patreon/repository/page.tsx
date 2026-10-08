'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    FolderGit2, Save, Check, Terminal, RefreshCw, Lock, Copy, Sparkles, 
    UserCheck, ArrowLeft, ExternalLink, ShieldCheck, ShoppingBag, 
    Ticket, KeyRound, AlertTriangle, CheckCircle2, Clock, Package,
    Eye, EyeOff, Search, Filter, List, LayoutGrid, X, Trash2, CheckSquare, Tag,
    ChevronLeft, ChevronRight, ArrowUpDown, Layers, Zap, CheckCheck,
    ShieldAlert, UserX, Globe, FileText, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';

export default function AdminPatreonRepositoryPage() {
    const { user } = usePermission();
    const isAdmin = user?.roles?.includes('admin') ?? false;

    // Aba Ativa: 'gumroad' | 'auditoria' | 'drive'
    const [activeTab, setActiveTab] = useState<'gumroad' | 'auditoria' | 'drive'>('auditoria');

    // Filtros e busca da Tela de Auditoria
    const [auditSearch, setAuditSearch] = useState('');
    const [auditFilter, setAuditFilter] = useState<'all' | 'redeemed' | 'pending' | 'leak'>('all');

    // --- ESTADO GUMROAD & ANTI-LEAK ---
    const [gumroadUser, setGumroadUser] = useState<any>(null);
    const [gumroadProducts, setGumroadProducts] = useState<any[]>([]);
    const [claims, setClaims] = useState<any[]>([]);
    const [loadingGumroad, setLoadingGumroad] = useState(false);
    const [syncingSales, setSyncingSales] = useState(false);

    // Controle de produtos visíveis/liberados em /release
    const [enabledProducts, setEnabledProducts] = useState<string[]>([]);
    const [updatingEnabledProduct, setUpdatingEnabledProduct] = useState<string | null>(null);

    // Filtros inteligentes para catálogo escalável (dezenas e centenas de modelos)
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'hidden'>('all');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Multi-seleção, ordenação e paginação para centenas de modelos
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'enabled_first' | 'recent' | 'name_asc' | 'name_desc' | 'price_desc' | 'price_asc'>('enabled_first');
    const [pageSize, setPageSize] = useState<number>(24);
    const [currentPage, setCurrentPage] = useState<number>(1);

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

    // Desmarcar todos os produtos do /release (para virada de mês)
    const handleClearAllRelease = async () => {
        if (enabledProducts.length === 0) {
            toast.info('Nenhum modelo está marcado no momento.');
            return;
        }
        if (!confirm('Deseja desmarcar TODOS os modelos ativos em /release? O portal ficará vazio até você selecionar os novos modelos.')) {
            return;
        }

        const prev = [...enabledProducts];
        setEnabledProducts([]);
        try {
            const res = await fetch('/api/admin/franga-studio/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabledProducts: [] })
            });
            if (!res.ok) throw new Error('Falha ao desmarcar produtos');
            toast.success('Todos os modelos foram removidos do /release.');
        } catch (e: any) {
            toast.error('Erro ao limpar release.');
            setEnabledProducts(prev);
        }
    };

    // Marcar em massa múltiplos produtos selecionados
    const handleBulkEnable = async (idsToAdd: string[]) => {
        if (idsToAdd.length === 0) return;
        const newEnabled = Array.from(new Set([...enabledProducts, ...idsToAdd]));

        const prev = [...enabledProducts];
        setEnabledProducts(newEnabled);
        try {
            const res = await fetch('/api/admin/franga-studio/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabledProducts: newEnabled })
            });
            if (!res.ok) throw new Error('Falha ao salvar');
            toast.success(`${idsToAdd.length} modelo(s) liberados para o /release!`);
            setSelectedIds([]);
        } catch (e: any) {
            toast.error('Erro ao marcar em massa.');
            setEnabledProducts(prev);
        }
    };

    // Ocultar em massa múltiplos produtos selecionados
    const handleBulkDisable = async (idsToRemove: string[]) => {
        if (idsToRemove.length === 0) return;
        const removeSet = new Set(idsToRemove);
        const newEnabled = enabledProducts.filter(id => !removeSet.has(id));

        const prev = [...enabledProducts];
        setEnabledProducts(newEnabled);
        try {
            const res = await fetch('/api/admin/franga-studio/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabledProducts: newEnabled })
            });
            if (!res.ok) throw new Error('Falha ao salvar');
            toast.info(`${idsToRemove.length} modelo(s) ocultados do /release.`);
            setSelectedIds([]);
        } catch (e: any) {
            toast.error('Erro ao ocultar em massa.');
            setEnabledProducts(prev);
        }
    };

    // Definir EXCLUSIVAMENTE os selecionados como o Release do Mês (Virada de mês em 1 clique)
    const handleSetExclusiveRelease = async (targetIds: string[]) => {
        if (targetIds.length === 0) {
            toast.error('Selecione pelo menos um modelo para definir o release.');
            return;
        }
        if (!confirm(`Deseja definir APENAS estes ${targetIds.length} modelo(s) como o lançamento ativo em /release? Todos os outros modelos serão desmarcados.`)) {
            return;
        }

        const prev = [...enabledProducts];
        setEnabledProducts(targetIds);
        try {
            const res = await fetch('/api/admin/franga-studio/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabledProducts: targetIds })
            });
            if (!res.ok) throw new Error('Falha ao salvar');
            toast.success(`Release do Mês definido com sucesso com ${targetIds.length} modelo(s)!`);
            setSelectedIds([]);
        } catch (e: any) {
            toast.error('Erro ao definir release exclusivo.');
            setEnabledProducts(prev);
        }
    };

    const handleToggleSelectId = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllVisible = (visibleIds: string[]) => {
        const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
        if (allSelected) {
            const visibleSet = new Set(visibleIds);
            setSelectedIds(prev => prev.filter(id => !visibleSet.has(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
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

    // Sincronizar resgates via API de vendas e offer_codes do Gumroad
    const handleSyncSales = async () => {
        try {
            setSyncingSales(true);
            const res = await fetch('/api/admin/gumroad', { method: 'PUT' });
            if (res.ok) {
                const data = await res.json();
                if (data.claimsUpdated > 0) {
                    toast.success(`✓ ${data.claimsUpdated} cupom(ns) sincronizado(s) como resgatado(s)!`);
                } else {
                    toast.info(`Nenhum novo resgate identificado no Gumroad (times_used ainda está zerado).`);
                }
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

    // Alternar status do claim manualmente (ex: auditoria manual)
    const handleToggleClaimStatus = async (claimId: string, currentStatus: boolean) => {
        try {
            const res = await fetch('/api/admin/gumroad', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ claimId, isRedeemed: !currentStatus })
            });
            if (!res.ok) throw new Error('Falha ao atualizar');
            toast.success(currentStatus ? 'Status alterado para Pendente' : 'Marcado como Resgatado!');
            fetchGumroadData();
        } catch (e: any) {
            toast.error(e.message || 'Erro ao alterar status');
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
        if (!isAdmin) {
            toast.error('Alteração bloqueada: Apenas administradores gerais podem modificar o repositório do Google Drive.');
            return;
        }
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

    // Estatísticas e filtros forenses para a Tela de Auditoria
    const auditStats = {
        total: claims.length,
        redeemed: claims.filter((c: any) => c.is_redeemed).length,
        pending: claims.filter((c: any) => !c.is_redeemed).length,
        leaks: claims.filter((c: any) => 
            c.is_leak_detected || 
            (c.is_redeemed && c.redeemer_email && c.patron_email && c.redeemer_email.toLowerCase() !== c.patron_email.toLowerCase())
        ).length
    };

    const filteredAuditClaims = claims.filter((c: any) => {
        const pEmail = (c.patron_email || '').toLowerCase();
        const rEmail = (c.redeemer_email || '').toLowerCase();
        const code = (c.coupon_code || '').toLowerCase();
        const prod = (c.product_name || '').toLowerCase();
        const pName = (c.patron_name || '').toLowerCase();
        const term = auditSearch.trim().toLowerCase();

        const matchesSearch = !term || 
            pEmail.includes(term) || 
            rEmail.includes(term) || 
            code.includes(term) || 
            prod.includes(term) || 
            pName.includes(term);

        if (!matchesSearch) return false;

        const isLeak = Boolean(
            c.is_leak_detected || 
            (c.is_redeemed && rEmail && pEmail && rEmail !== pEmail)
        );

        if (auditFilter === 'redeemed') return c.is_redeemed;
        if (auditFilter === 'pending') return !c.is_redeemed;
        if (auditFilter === 'leak') return isLeak;
        return true;
    });

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
                <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-1 flex-wrap">
                    <button
                        onClick={() => setActiveTab('gumroad')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === 'gumroad'
                                ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/30 shadow-md'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                    >
                        <Package size={16} />
                        <span>Catálogo & Lançamentos</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('auditoria')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer relative ${
                            activeTab === 'auditoria'
                                ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/30 shadow-md'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                    >
                        <ShieldAlert size={16} className={auditStats.leaks > 0 ? 'text-red-400 animate-pulse' : 'text-orange-400'} />
                        <span>Auditoria Anti-Leak</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-300 font-mono font-bold px-2 py-0.5 rounded-full">
                            {claims.length}
                        </span>
                        {auditStats.leaks > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                                {auditStats.leaks} VAZAMENTO!
                            </span>
                        )}
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
                        <span>Google Drive & Terceirizados</span>
                        {!isAdmin && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1">
                                <Lock size={10} /> Somente Leitura
                            </span>
                        )}
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

                        {/* CONTROLE INTELIGENTE DE MODELOS LIBERADOS EM /release */}
                        {(() => {
                            // Mapeamento e lista de modelos atualmente habilitados
                            const enabledProductsMap = new Map(gumroadProducts.map((p: any) => [p.id, p]));
                            const activeReleaseModels = enabledProducts
                                .map(id => enabledProductsMap.get(id))
                                .filter(Boolean);

                            const allTags = Array.from(new Set(gumroadProducts.flatMap((p: any) => p.tags || []))).filter(Boolean);

                            // 1. Filtragem inteligente
                            const filteredProducts = gumroadProducts.filter((p: any) => {
                                if (searchTerm.trim()) {
                                    const term = searchTerm.toLowerCase();
                                    const matchesName = p.name?.toLowerCase().includes(term);
                                    const matchesTag = p.tags?.some((t: string) => t.toLowerCase().includes(term));
                                    const matchesPrice = p.formatted_price?.toLowerCase().includes(term);
                                    if (!matchesName && !matchesTag && !matchesPrice) return false;
                                }
                                if (selectedTag && (!p.tags || !p.tags.includes(selectedTag))) {
                                    return false;
                                }
                                const isEnabled = enabledProducts.includes(p.id);
                                if (filterStatus === 'enabled' && !isEnabled) return false;
                                if (filterStatus === 'hidden' && isEnabled) return false;
                                return true;
                            });

                            // 2. Ordenação
                            const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
                                if (sortBy === 'enabled_first') {
                                    const aEnabled = enabledProducts.includes(a.id) ? 1 : 0;
                                    const bEnabled = enabledProducts.includes(b.id) ? 1 : 0;
                                    if (aEnabled !== bEnabled) return bEnabled - aEnabled;
                                    return 0;
                                }
                                if (sortBy === 'name_asc') {
                                    return (a.name || '').localeCompare(b.name || '');
                                }
                                if (sortBy === 'name_desc') {
                                    return (b.name || '').localeCompare(a.name || '');
                                }
                                if (sortBy === 'price_desc') {
                                    return (b.price || 0) - (a.price || 0);
                                }
                                if (sortBy === 'price_asc') {
                                    return (a.price || 0) - (b.price || 0);
                                }
                                // 'recent' (ordem original da API Gumroad)
                                return 0;
                            });

                            // 3. Paginação
                            const totalItems = sortedProducts.length;
                            const effectivePageSize = pageSize >= 9999 ? totalItems || 1 : pageSize;
                            const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
                            const validCurrentPage = Math.min(currentPage, totalPages);
                            const startIndex = (validCurrentPage - 1) * effectivePageSize;
                            const paginatedProducts = pageSize >= 9999 
                                ? sortedProducts 
                                : sortedProducts.slice(startIndex, startIndex + effectivePageSize);

                            const visibleIds = paginatedProducts.map((p: any) => p.id);
                            const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
                            const someVisibleSelected = visibleIds.some(id => selectedIds.includes(id)) && !allVisibleSelected;

                            return (
                                <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
                                    
                                    {/* CABEÇALHO DO CATÁLOGO */}
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20">
                                                <Package size={22} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                    <h3 className="text-base font-black text-white uppercase tracking-wider">
                                                        Controle de Lançamentos em /release
                                                    </h3>
                                                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                                        {enabledProducts.length} ATIVO(S) NO RELEASE
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500 font-mono">
                                                        ({gumroadProducts.length} modelos no catálogo)
                                                    </span>
                                                </div>
                                                <p className="text-xs text-zinc-400 mt-0.5">
                                                    Gerenciamento de alta escala: selecione em lote, ordene, filtre e faça a virada de mês em 1 clique.
                                                </p>
                                            </div>
                                        </div>

                                        {/* AÇÕES GLOBAIS RÁPIDAS */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {enabledProducts.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleClearAllRelease}
                                                    className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                                    title="Limpar todos os produtos liberados para começar um mês limpo"
                                                >
                                                    <Trash2 size={14} />
                                                    <span>Limpar Release Atual ({enabledProducts.length})</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* BANDEJA / RESUMO VISUAL: O QUE ESTÁ LIBERADO AGORA NO /release */}
                                    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <Zap size={15} className="text-orange-400" />
                                                <span className="text-xs font-black text-white uppercase tracking-wider">
                                                    Lançamento do Mês Atual (Visível aos Membros)
                                                </span>
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                                                    {enabledProducts.length} modelo(s)
                                                </span>
                                            </div>
                                            {filterStatus !== 'enabled' && enabledProducts.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setFilterStatus('enabled'); setCurrentPage(1); }}
                                                    className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                                                >
                                                    <Eye size={12} />
                                                    <span>Filtrar apenas os ativos</span>
                                                </button>
                                            )}
                                        </div>

                                        {activeReleaseModels.length === 0 ? (
                                            <div className="p-3 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800 text-xs text-zinc-500 flex items-center gap-2">
                                                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                                                <span>Nenhum modelo liberado no momento. Marque os modelos abaixo que farão parte do release deste mês.</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {activeReleaseModels.map((p: any) => {
                                                    const cover = (p.covers && p.covers[0]?.url) || p.preview_url || p.thumbnail_url;
                                                    return (
                                                        <div 
                                                            key={p.id}
                                                            className="flex items-center gap-2 bg-zinc-900/90 border border-orange-500/30 hover:border-orange-500/60 rounded-xl py-1.5 px-3 text-xs text-zinc-200 shadow-sm transition-all group"
                                                        >
                                                            <div className="w-5 h-5 rounded-md bg-zinc-800 overflow-hidden shrink-0">
                                                                {cover ? (
                                                                    <img src={cover} alt={p.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Package size={12} className="text-zinc-600 m-auto" />
                                                                )}
                                                            </div>
                                                            <span className="font-bold text-[11px] truncate max-w-[140px] text-white">
                                                                {p.name}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleProductRelease(p.id, p.name)}
                                                                className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer p-0.5 rounded"
                                                                title={`Remover "${p.name}" do release`}
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* BARRA DE FERRAMENTAS: BUSCA, FILTROS, ORDENAÇÃO E DENSIDADE */}
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                            {/* Busca Rápida */}
                                            <div className="md:col-span-4 relative">
                                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar por nome, tag ou valor..."
                                                    value={searchTerm}
                                                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white outline-none transition-all placeholder:text-zinc-600"
                                                />
                                                {searchTerm && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Abas de Status */}
                                            <div className="md:col-span-5 flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs overflow-x-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => { setFilterStatus('all'); setCurrentPage(1); }}
                                                    className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                                                        filterStatus === 'all'
                                                            ? 'bg-zinc-800 text-white shadow-sm'
                                                            : 'text-zinc-500 hover:text-zinc-300'
                                                    }`}
                                                >
                                                    Todos ({gumroadProducts.length})
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setFilterStatus('enabled'); setCurrentPage(1); }}
                                                    className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                                        filterStatus === 'enabled'
                                                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                                            : 'text-orange-400 hover:text-orange-300'
                                                    }`}
                                                >
                                                    <Eye size={12} />
                                                    <span>Liberados ({enabledProducts.length})</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setFilterStatus('hidden'); setCurrentPage(1); }}
                                                    className={`flex-1 min-w-[75px] py-1.5 px-2 rounded-lg font-bold text-center transition-all cursor-pointer ${
                                                        filterStatus === 'hidden'
                                                            ? 'bg-zinc-800 text-white shadow-sm'
                                                            : 'text-zinc-500 hover:text-zinc-300'
                                                    }`}
                                                >
                                                    Ocultos ({Math.max(0, gumroadProducts.length - enabledProducts.length)})
                                                </button>
                                            </div>

                                            {/* Ordenação e Alternador de Modo */}
                                            <div className="md:col-span-3 flex items-center gap-2 justify-end">
                                                <div className="relative flex-1">
                                                    <select
                                                        value={sortBy}
                                                        onChange={e => { setSortBy(e.target.value as any); setCurrentPage(1); }}
                                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none cursor-pointer appearance-none font-bold"
                                                    >
                                                        <option value="enabled_first">★ Liberados no Topo</option>
                                                        <option value="recent">🕒 Mais Recentes (Gumroad)</option>
                                                        <option value="name_asc">🔤 Nome (A-Z)</option>
                                                        <option value="name_desc">🔤 Nome (Z-A)</option>
                                                        <option value="price_desc">💰 Maior Preço</option>
                                                        <option value="price_asc">🏷️ Menor Preço</option>
                                                    </select>
                                                </div>

                                                {/* Alternador Grid vs Tabela */}
                                                <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewMode('grid')}
                                                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                                            viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                                                        }`}
                                                        title="Visualização em Cards"
                                                    >
                                                        <LayoutGrid size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewMode('table')}
                                                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                                            viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                                                        }`}
                                                        title="Visualização em Tabela Compacta (Alta Densidade)"
                                                    >
                                                        <List size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Filtro por Tags */}
                                        {allTags.length > 0 && (
                                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                                                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider flex items-center gap-1">
                                                    <Tag size={11} /> Tags:
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => { setSelectedTag(null); setCurrentPage(1); }}
                                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                                                        selectedTag === null
                                                            ? 'bg-zinc-800 text-white'
                                                            : 'bg-zinc-950 text-zinc-500 hover:text-white border border-zinc-850'
                                                    }`}
                                                >
                                                    Todas
                                                </button>
                                                {allTags.map((t: any) => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => { setSelectedTag(selectedTag === t ? null : t); setCurrentPage(1); }}
                                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                                                            selectedTag === t
                                                                ? 'bg-orange-500 text-white shadow-sm'
                                                                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-850'
                                                        }`}
                                                    >
                                                        #{t}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* BARRA DE SELEÇÃO EM MASSA (QUANDO HOUVER ITENS VISÍVEIS) */}
                                    {paginatedProducts.length > 0 && (
                                        <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={allVisibleSelected}
                                                        ref={input => {
                                                            if (input) input.indeterminate = someVisibleSelected;
                                                        }}
                                                        onChange={() => handleSelectAllVisible(visibleIds)}
                                                        className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                                                    />
                                                    <span className="font-bold text-zinc-300">
                                                        {selectedIds.length > 0 
                                                            ? `${selectedIds.length} selecionado(s)` 
                                                            : 'Selecionar visíveis nesta página'}
                                                    </span>
                                                </label>

                                                {selectedIds.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedIds([])}
                                                        className="text-zinc-500 hover:text-zinc-300 underline text-[11px] cursor-pointer"
                                                    >
                                                        Limpar seleção
                                                    </button>
                                                )}
                                            </div>

                                            {/* Ações para a seleção atual */}
                                            {selectedIds.length > 0 ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleBulkEnable(selectedIds)}
                                                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                                                    >
                                                        <Eye size={13} />
                                                        <span>Liberar ({selectedIds.length})</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleBulkDisable(selectedIds)}
                                                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold flex items-center gap-1.5 border border-zinc-700 transition-all cursor-pointer"
                                                    >
                                                        <EyeOff size={13} />
                                                        <span>Ocultar ({selectedIds.length})</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetExclusiveRelease(selectedIds)}
                                                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                                                        title="Limpa todos os outros e deixa APENAS estes selecionados ativos no release"
                                                    >
                                                        <Sparkles size={13} />
                                                        <span>Definir como Release do Mês</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 text-zinc-500 text-[11px]">
                                                    <span>Dica: selecione os modelos desejados para liberar em lote ou trocar o mês em 1 clique.</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* LISTAGEM DOS PRODUTOS */}
                                    {gumroadProducts.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-500 text-xs italic">
                                            Nenhum produto cadastrado no Gumroad.
                                        </div>
                                    ) : filteredProducts.length === 0 ? (
                                        <div className="p-8 bg-zinc-950/60 rounded-2xl border border-dashed border-zinc-800 text-center space-y-2">
                                            <p className="text-xs text-zinc-400 font-bold">
                                                Nenhum modelo corresponde aos filtros selecionados.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => { setSearchTerm(''); setFilterStatus('all'); setSelectedTag(null); setCurrentPage(1); }}
                                                className="text-xs text-orange-400 hover:underline font-bold"
                                            >
                                                Limpar filtros de busca
                                            </button>
                                        </div>
                                    ) : viewMode === 'grid' ? (
                                        /* MODO 1: CARDS GRID (COM CHECKBOX E TOGGLE) */
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {paginatedProducts.map((p: any) => {
                                                const isEnabled = enabledProducts.includes(p.id);
                                                const isSelected = selectedIds.includes(p.id);
                                                const isUpdating = updatingEnabledProduct === p.id;
                                                const cover = (p.covers && p.covers[0]?.url) || p.preview_url || p.thumbnail_url;

                                                return (
                                                    <div 
                                                        key={p.id}
                                                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-4 relative ${
                                                            isSelected 
                                                                ? 'ring-2 ring-orange-500/80 bg-zinc-950/95 border-orange-500/60'
                                                                : isEnabled 
                                                                    ? 'bg-zinc-950/90 border-orange-500/40 shadow-lg shadow-orange-500/5' 
                                                                    : 'bg-zinc-950/40 border-zinc-800/80 opacity-75 hover:opacity-100'
                                                        }`}
                                                    >
                                                        {/* Checkbox de seleção em massa */}
                                                        <div className="absolute top-3 left-3 z-10">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => handleToggleSelectId(p.id)}
                                                                className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                                                                title="Selecionar para ações em massa"
                                                            />
                                                        </div>

                                                        <div className="flex items-start gap-3 pl-6">
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
                                                                {p.tags && p.tags.length > 0 && (
                                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                                        {p.tags.slice(0, 3).map((t: string) => (
                                                                            <span key={t} className="text-[9px] text-zinc-500 font-mono">#{t}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Botões de Ação do Card */}
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
                                                                        <Check size={14} />
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
                                                                    className="p-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition-all cursor-pointer"
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
                                    ) : (
                                        /* MODO 2: TABELA COMPACTA (ALTA DENSIDADE COM CHECKBOX) */
                                        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950">
                                            <table className="w-full text-left text-xs text-zinc-300">
                                                <thead className="bg-zinc-900/80 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800">
                                                    <tr>
                                                        <th className="py-3 px-3 w-10 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={allVisibleSelected}
                                                                ref={input => {
                                                                    if (input) input.indeterminate = someVisibleSelected;
                                                                }}
                                                                onChange={() => handleSelectAllVisible(visibleIds)}
                                                                className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                                                            />
                                                        </th>
                                                        <th className="py-3 px-3 w-12 text-center">Capa</th>
                                                        <th className="py-3 px-4">Modelo / Produto</th>
                                                        <th className="py-3 px-4">Preço</th>
                                                        <th className="py-3 px-4">Status Gumroad</th>
                                                        <th className="py-3 px-4 text-center">Liberação no /release</th>
                                                        <th className="py-3 px-4 text-right">Link</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-850">
                                                    {paginatedProducts.map((p: any) => {
                                                        const isEnabled = enabledProducts.includes(p.id);
                                                        const isSelected = selectedIds.includes(p.id);
                                                        const isUpdating = updatingEnabledProduct === p.id;
                                                        const cover = (p.covers && p.covers[0]?.url) || p.preview_url || p.thumbnail_url;

                                                        return (
                                                            <tr 
                                                                key={p.id} 
                                                                className={`transition-colors ${
                                                                    isSelected 
                                                                        ? 'bg-orange-500/10' 
                                                                        : isEnabled 
                                                                            ? 'bg-zinc-900/40 hover:bg-zinc-900/70' 
                                                                            : 'hover:bg-zinc-900/30'
                                                                }`}
                                                            >
                                                                <td className="py-2.5 px-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => handleToggleSelectId(p.id)}
                                                                        className="w-4 h-4 rounded accent-orange-500 cursor-pointer"
                                                                    />
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center">
                                                                    <div className="w-9 h-9 rounded-lg bg-zinc-900 overflow-hidden border border-zinc-800 mx-auto flex items-center justify-center">
                                                                        {cover ? (
                                                                            <img src={cover} alt={p.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <Package size={16} className="text-zinc-600" />
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="py-2.5 px-4">
                                                                    <div className="font-bold text-white leading-tight">{p.name}</div>
                                                                    {p.tags && p.tags.length > 0 && (
                                                                        <div className="flex gap-1 mt-0.5 flex-wrap">
                                                                            {p.tags.map((t: string) => (
                                                                                <span key={t} className="text-[9px] text-zinc-500 font-mono">#{t}</span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="py-2.5 px-4 font-mono font-bold text-zinc-400">
                                                                    {p.formatted_price}
                                                                </td>
                                                                <td className="py-2.5 px-4">
                                                                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                                                                        p.published 
                                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                                            : 'bg-zinc-800 text-zinc-400'
                                                                    }`}>
                                                                        {p.published ? 'Publicado' : 'Rascunho'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2.5 px-4 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleProductRelease(p.id, p.name)}
                                                                        disabled={isUpdating}
                                                                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                                                                            isEnabled
                                                                                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20'
                                                                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white border border-zinc-800'
                                                                        }`}
                                                                    >
                                                                        {isEnabled ? (
                                                                            <>
                                                                                <Check size={12} />
                                                                                <span>Liberado</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <EyeOff size={12} />
                                                                                <span>Oculto</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </td>
                                                                <td className="py-2.5 px-4 text-right">
                                                                    {p.short_url && (
                                                                        <a
                                                                            href={p.short_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 transition-all inline-block"
                                                                            title="Ver no Gumroad"
                                                                        >
                                                                            <ExternalLink size={13} />
                                                                        </a>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* CONTROLES DE PAGINAÇÃO & QUANTIDADE */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
                                        <div className="flex items-center gap-3">
                                            <span>
                                                Mostrando <strong className="text-white">{totalItems === 0 ? 0 : startIndex + 1}</strong> a <strong className="text-white">{Math.min(startIndex + effectivePageSize, totalItems)}</strong> de <strong className="text-white">{totalItems}</strong> modelos
                                            </span>

                                            {/* Seletor de tamanho de página */}
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] text-zinc-500">Exibir:</span>
                                                <select
                                                    value={pageSize}
                                                    onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 outline-none cursor-pointer"
                                                >
                                                    <option value={12}>12</option>
                                                    <option value={24}>24</option>
                                                    <option value={48}>48</option>
                                                    <option value={9999}>Todos</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Navegação de Páginas */}
                                        {totalPages > 1 && pageSize < 9999 && (
                                            <div className="flex items-center gap-1.5 self-center sm:self-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={validCurrentPage === 1}
                                                    className="p-1.5 bg-zinc-950 hover:bg-zinc-850 disabled:opacity-30 disabled:hover:bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 transition-all cursor-pointer"
                                                    title="Página anterior"
                                                >
                                                    <ChevronLeft size={15} />
                                                </button>

                                                <span className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-bold text-white">
                                                    {validCurrentPage} / {totalPages}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                    disabled={validCurrentPage === totalPages}
                                                    className="p-1.5 bg-zinc-950 hover:bg-zinc-850 disabled:opacity-30 disabled:hover:bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 transition-all cursor-pointer"
                                                    title="Próxima página"
                                                >
                                                    <ChevronRight size={15} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* BARRA FLUTUANTE STICKY NO RODAPÉ (QUANDO HÁ MODELOS SELECIONADOS) */}
                                    {selectedIds.length > 0 && (
                                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-950/95 border border-orange-500/50 shadow-2xl shadow-orange-500/20 backdrop-blur-md rounded-2xl px-5 py-3 flex items-center gap-3 flex-wrap max-w-2xl w-[92%] justify-between animate-in slide-in-from-bottom-5 duration-200">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
                                                    {selectedIds.length}
                                                </div>
                                                <span className="text-xs font-bold text-white">
                                                    {selectedIds.length} {selectedIds.length === 1 ? 'modelo selecionado' : 'modelos selecionados'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    onClick={() => handleBulkEnable(selectedIds)}
                                                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                                                >
                                                    <Eye size={13} />
                                                    <span>Liberar</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleBulkDisable(selectedIds)}
                                                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-zinc-700 transition-all cursor-pointer"
                                                >
                                                    <EyeOff size={13} />
                                                    <span>Ocultar</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetExclusiveRelease(selectedIds)}
                                                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                                                    title="Limpa os atuais e define APENAS os selecionados como o release do mês"
                                                >
                                                    <Sparkles size={13} />
                                                    <span>Release do Mês</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedIds([])}
                                                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
                                                    title="Fechar seleção"
                                                >
                                                    <X size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            );
                        })()}

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
                                        onClick={() => setActiveTab('auditoria')}
                                        className="px-3.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                                    >
                                        <ShieldAlert size={13} />
                                        <span>Abrir Painel Forense Completo</span>
                                    </button>

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
                                            <th className="py-3 px-4">Patrono Autorizado</th>
                                            <th className="py-3 px-4">Produto</th>
                                            <th className="py-3 px-4">Código do Cupom</th>
                                            <th className="py-3 px-4">Quem Resgatou no Gumroad</th>
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
                                            claims.map((c: any) => {
                                                const pEmail = (c.patron_email || '').toLowerCase();
                                                const rEmail = (c.redeemer_email || '').toLowerCase();
                                                const isLeak = Boolean(c.is_leak_detected || (c.is_redeemed && rEmail && pEmail && rEmail !== pEmail));

                                                return (
                                                    <tr key={c.id} className={`transition-colors ${isLeak ? 'bg-red-950/25 hover:bg-red-950/35 border-l-4 border-l-red-500' : 'hover:bg-zinc-800/40'}`}>
                                                        <td className="py-3.5 px-4">
                                                            <div className="font-sans font-bold text-white text-xs">{c.patron_email}</div>
                                                            {c.patron_name && (
                                                                <div className="text-[11px] text-zinc-400 font-sans mt-0.5">{c.patron_name}</div>
                                                            )}
                                                            <span className="inline-block mt-1 text-[9px] font-mono uppercase bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">
                                                                Apoiador Oficial
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 font-sans text-zinc-300">
                                                            <div className="font-bold text-white text-xs">{c.product_name || 'Produto Gumroad'}</div>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className="bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-orange-400 font-bold text-xs">
                                                                {c.coupon_code}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            {c.is_redeemed ? (
                                                                c.redeemer_email ? (
                                                                    isLeak ? (
                                                                        <div className="bg-red-500/15 border border-red-500/40 rounded-xl px-3 py-2 text-left space-y-1">
                                                                            <div className="flex items-center gap-1.5 text-red-400 font-black text-[11px] uppercase tracking-wider">
                                                                                <ShieldAlert size={14} className="shrink-0 animate-pulse" />
                                                                                <span>🚨 VAZAMENTO DETECTADO!</span>
                                                                            </div>
                                                                            <div className="font-mono text-xs font-bold text-white bg-red-950/80 px-2 py-1 rounded border border-red-500/30">
                                                                                {c.redeemer_email}
                                                                            </div>
                                                                            <p className="text-[10px] text-red-300 font-sans leading-tight">
                                                                                Resgatado por e-mail diferente do apoiador!
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-left space-y-0.5">
                                                                            <div className="flex items-center gap-1 text-emerald-400 font-black text-[10px] uppercase tracking-wider">
                                                                                <CheckCircle2 size={13} className="shrink-0" />
                                                                                <span>✓ Resgate Autêntico</span>
                                                                            </div>
                                                                            <div className="font-mono text-xs font-bold text-emerald-300">
                                                                                {c.redeemer_email}
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                ) : (
                                                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2.5 py-1 rounded-xl inline-flex items-center gap-1.5">
                                                                        <Check size={13} /> Resgatado no Gumroad
                                                                    </span>
                                                                )
                                                            ) : (
                                                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold px-2.5 py-1 rounded-xl inline-flex items-center gap-1.5">
                                                                    <Clock size={13} /> ⏳ Pendente
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-zinc-400 text-[11px] font-sans">
                                                            {new Date(c.created_at).toLocaleString('pt-BR')}
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleClaimStatus(c.id, c.is_redeemed)}
                                                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold font-sans cursor-pointer transition-all inline-flex items-center gap-1 ${
                                                                        c.is_redeemed
                                                                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                                                                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                                                    }`}
                                                                    title={c.is_redeemed ? 'Reverter para Pendente' : 'Marcar como Resgatado manualmente'}
                                                                >
                                                                    <Check size={11} />
                                                                    <span>{c.is_redeemed ? 'Desmarcar' : 'Validar'}</span>
                                                                </button>

                                                                {c.checkout_url && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(c.checkout_url);
                                                                            toast.success('Link copiado!');
                                                                        }}
                                                                        className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-bold font-sans cursor-pointer transition-all inline-flex items-center gap-1"
                                                                        title="Copiar link com cupom"
                                                                    >
                                                                        <Copy size={11} /> Copiar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}

                {/* ABA 2: AUDITORIA FORENSE & ANTI-LEAK */}
                {activeTab === 'auditoria' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        
                        {/* BANNER FORENSE COM BOTÃO DE SINCRONIZAÇÃO */}
                        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-orange-950/30 border border-orange-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400">
                                        <ShieldAlert size={20} />
                                    </div>
                                    <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider">
                                        Auditoria Forense & Rastreamento Anti-Leak
                                    </h2>
                                </div>
                                <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                                    Cruza em tempo real o e-mail do apoiador que recebeu o cupom com o e-mail que concluiu o pedido no Gumroad.
                                    Se um assinante repassar o link para um terceiro, o sistema aponta imediatamente a divergência como <strong className="text-red-400 font-bold">Vazamento Detectado</strong>.
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleSyncSales}
                                    disabled={syncingSales}
                                    className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer transition-all"
                                >
                                    <RefreshCw size={14} className={syncingSales ? 'animate-spin' : ''} />
                                    <span>{syncingSales ? 'Sincronizando...' : 'Verificar Resgates no Gumroad'}</span>
                                </button>
                            </div>
                        </div>

                        {/* CARDS DE METRICAS FORENSES (KPIS) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* TOTAL EMITIDOS */}
                            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-2">
                                <div className="flex items-center justify-between text-zinc-400">
                                    <span className="text-[11px] font-black uppercase tracking-wider">Cupons Emitidos</span>
                                    <Ticket size={16} className="text-zinc-500" />
                                </div>
                                <div className="text-2xl font-black text-white font-mono">{auditStats.total}</div>
                                <p className="text-[10px] text-zinc-500">Total de códigos gerados pela API</p>
                            </div>

                            {/* RESGATADOS */}
                            <div className="bg-zinc-900/70 border border-emerald-500/20 rounded-2xl p-5 space-y-2">
                                <div className="flex items-center justify-between text-emerald-400">
                                    <span className="text-[11px] font-black uppercase tracking-wider">Resgatados</span>
                                    <CheckCircle2 size={16} />
                                </div>
                                <div className="text-2xl font-black text-emerald-400 font-mono">{auditStats.redeemed}</div>
                                <p className="text-[10px] text-zinc-500">Concluídos com sucesso no Gumroad</p>
                            </div>

                            {/* PENDENTES */}
                            <div className="bg-zinc-900/70 border border-amber-500/20 rounded-2xl p-5 space-y-2">
                                <div className="flex items-center justify-between text-amber-400">
                                    <span className="text-[11px] font-black uppercase tracking-wider">Pendentes</span>
                                    <Clock size={16} />
                                </div>
                                <div className="text-2xl font-black text-amber-400 font-mono">{auditStats.pending}</div>
                                <p className="text-[10px] text-zinc-500">Ainda não utilizados no checkout</p>
                            </div>

                            {/* VAZAMENTOS DETECTADOS */}
                            <div className={`rounded-2xl p-5 space-y-2 border transition-all ${
                                auditStats.leaks > 0
                                    ? 'bg-red-950/40 border-red-500 shadow-xl shadow-red-500/10 animate-pulse'
                                    : 'bg-zinc-900/70 border-zinc-800'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <span className={`text-[11px] font-black uppercase tracking-wider ${
                                        auditStats.leaks > 0 ? 'text-red-400 font-bold' : 'text-zinc-400'
                                    }`}>
                                        Vazamentos Detectados
                                    </span>
                                    <ShieldAlert size={16} className={auditStats.leaks > 0 ? 'text-red-400' : 'text-zinc-500'} />
                                </div>
                                <div className={`text-2xl font-black font-mono ${
                                    auditStats.leaks > 0 ? 'text-red-400' : 'text-zinc-400'
                                }`}>
                                    {auditStats.leaks}
                                </div>
                                <p className="text-[10px] text-zinc-500">
                                    {auditStats.leaks > 0 ? 'E-mails divergentes do apoiador original!' : 'Nenhuma violação identificada'}
                                </p>
                            </div>
                        </div>

                        {/* BARRA DE BUSCA E FILTROS */}
                        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Busca */}
                                <div className="relative flex-1">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por e-mail do patrono, e-mail de quem comprou, cupom ou modelo..."
                                        value={auditSearch}
                                        onChange={e => setAuditSearch(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white outline-none transition-all placeholder:text-zinc-600"
                                    />
                                    {auditSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setAuditSearch('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>

                                {/* Abas de Filtro */}
                                <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs overflow-x-auto shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setAuditFilter('all')}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                            auditFilter === 'all'
                                                ? 'bg-zinc-800 text-white shadow-sm'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        Todos ({auditStats.total})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAuditFilter('redeemed')}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                            auditFilter === 'redeemed'
                                                ? 'bg-emerald-500 text-white shadow-md'
                                                : 'text-emerald-400 hover:text-emerald-300'
                                        }`}
                                    >
                                        Resgatados ({auditStats.redeemed})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAuditFilter('pending')}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                            auditFilter === 'pending'
                                                ? 'bg-amber-500 text-white shadow-md'
                                                : 'text-amber-400 hover:text-amber-300'
                                        }`}
                                    >
                                        Pendentes ({auditStats.pending})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAuditFilter('leak')}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                                            auditFilter === 'leak'
                                                ? 'bg-red-500 text-white shadow-md'
                                                : 'text-red-400 hover:text-red-300'
                                        }`}
                                    >
                                        🚨 Vazamentos ({auditStats.leaks})
                                    </button>
                                </div>
                            </div>

                            {/* TABELA FORENSE COMPLETA */}
                            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950">
                                <table className="w-full text-left text-xs text-zinc-300">
                                    <thead className="bg-zinc-900/90 text-[10px] uppercase font-black tracking-widest text-zinc-500 border-b border-zinc-800">
                                        <tr>
                                            <th className="py-3 px-4">Patrono Autorizado</th>
                                            <th className="py-3 px-4">Quem Resgatou no Gumroad</th>
                                            <th className="py-3 px-4">Modelo / Cupom</th>
                                            <th className="py-3 px-4">Pedido / Origem</th>
                                            <th className="py-3 px-4">Data Emissão / Resgate</th>
                                            <th className="py-3 px-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-850">
                                        {filteredAuditClaims.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-zinc-500 italic">
                                                    Nenhum registro encontrado para este filtro de auditoria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAuditClaims.map((c: any) => {
                                                const pEmail = (c.patron_email || '').toLowerCase();
                                                const rEmail = (c.redeemer_email || '').toLowerCase();
                                                const isLeak = Boolean(c.is_leak_detected || (c.is_redeemed && rEmail && pEmail && rEmail !== pEmail));

                                                return (
                                                    <tr 
                                                        key={c.id} 
                                                        className={`transition-colors ${
                                                            isLeak 
                                                                ? 'bg-red-950/20 hover:bg-red-950/30 border-l-4 border-l-red-500' 
                                                                : 'hover:bg-zinc-900/40'
                                                        }`}
                                                    >
                                                        {/* COLUNA 1: PATRONO AUTORIZADO */}
                                                        <td className="py-3.5 px-4">
                                                            <div className="font-bold text-white text-xs flex items-center gap-1.5">
                                                                <span>{c.patron_email}</span>
                                                            </div>
                                                            {c.patron_name && (
                                                                <div className="text-[11px] text-zinc-400 mt-0.5">
                                                                    {c.patron_name}
                                                                </div>
                                                            )}
                                                            <span className="inline-block mt-1 text-[9px] font-mono uppercase bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">
                                                                Destinatário Oficial
                                                            </span>
                                                        </td>

                                                        {/* COLUNA 2: QUEM RESGATOU NO GUMROAD */}
                                                        <td className="py-3.5 px-4">
                                                            {c.is_redeemed ? (
                                                                c.redeemer_email ? (
                                                                    isLeak ? (
                                                                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2.5 space-y-1">
                                                                            <div className="flex items-center gap-1.5 text-red-400 font-black text-[11px]">
                                                                                <ShieldAlert size={14} className="shrink-0" />
                                                                                <span>VAZAMENTO DETECTADO!</span>
                                                                            </div>
                                                                            <div className="font-mono text-xs font-bold text-red-300">
                                                                                {c.redeemer_email}
                                                                            </div>
                                                                            <p className="text-[10px] text-red-400/80">
                                                                                Diferente do patrono oficial ({c.patron_email})
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 space-y-0.5">
                                                                            <div className="flex items-center gap-1 text-emerald-400 font-bold text-[10px]">
                                                                                <CheckCircle2 size={13} className="shrink-0" />
                                                                                <span>Mesmo Comprador (Autêntico)</span>
                                                                            </div>
                                                                            <div className="font-mono text-xs font-bold text-emerald-300">
                                                                                {c.redeemer_email}
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                ) : (
                                                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-emerald-400 text-xs flex items-center gap-1.5">
                                                                        <Check size={14} />
                                                                        <span>Resgatado no Gumroad</span>
                                                                    </div>
                                                                )
                                                            ) : (
                                                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-amber-400 text-xs flex items-center gap-1.5">
                                                                    <Clock size={13} />
                                                                    <span>Aguardando resgate no Gumroad</span>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* COLUNA 3: MODELO / CUPOM */}
                                                        <td className="py-3.5 px-4">
                                                            <div className="font-bold text-white text-xs">{c.product_name}</div>
                                                            <div className="mt-1 flex items-center gap-1.5">
                                                                <span className="bg-zinc-900 border border-zinc-800 text-orange-400 font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                                                                    {c.coupon_code}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* COLUNA 4: PEDIDO / ORIGEM */}
                                                        <td className="py-3.5 px-4 font-mono text-[11px]">
                                                            {c.gumroad_order_number ? (
                                                                <div className="text-zinc-200">
                                                                    Pedido #{c.gumroad_order_number}
                                                                </div>
                                                            ) : (
                                                                <div className="text-zinc-500">-</div>
                                                            )}
                                                            {c.buyer_country && (
                                                                <div className="text-zinc-400 text-[10px] mt-0.5 flex items-center gap-1">
                                                                    <Globe size={11} className="text-zinc-500" />
                                                                    <span>{c.buyer_country}</span>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* COLUNA 5: DATAS */}
                                                        <td className="py-3.5 px-4 text-[11px] text-zinc-400 space-y-1">
                                                            <div>
                                                                <span className="text-zinc-500 text-[10px] block">Emissão:</span>
                                                                <span>{new Date(c.created_at).toLocaleString('pt-BR')}</span>
                                                            </div>
                                                            {c.redeemed_at && (
                                                                <div>
                                                                    <span className="text-emerald-500 text-[10px] block">Resgate:</span>
                                                                    <span className="text-zinc-200">{new Date(c.redeemed_at).toLocaleString('pt-BR')}</span>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* COLUNA 6: AÇÕES */}
                                                        <td className="py-3.5 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleClaimStatus(c.id, c.is_redeemed)}
                                                                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all inline-flex items-center gap-1.5 ${
                                                                        c.is_redeemed
                                                                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                                                                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                                                    }`}
                                                                    title={c.is_redeemed ? 'Reverter para Pendente' : 'Marcar como Resgatado'}
                                                                >
                                                                    <Check size={12} />
                                                                    <span>{c.is_redeemed ? 'Desmarcar' : 'Validar'}</span>
                                                                </button>

                                                                {c.checkout_url && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(c.checkout_url);
                                                                            toast.success('Link de resgate copiado!');
                                                                        }}
                                                                        className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
                                                                        title="Copiar link com cupom 100% OFF"
                                                                    >
                                                                        <Copy size={12} />
                                                                        <span>Copiar Link</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
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
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base font-black text-white uppercase tracking-wider">
                                                1. Repositório Ativo dos Membros (Google Drive)
                                            </h2>
                                            {!isAdmin && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-500/30 flex items-center gap-1">
                                                    <Lock size={10} /> Protegido
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            Informe a URL da pasta do mês. Todos os membros ativos baixarão desta pasta até você alterá-la.
                                        </p>
                                    </div>
                                </div>

                                {!isAdmin && (
                                    <div className="p-3.5 bg-red-950/20 border border-red-500/30 rounded-2xl flex items-center gap-3 text-xs text-red-300">
                                        <div className="p-2 bg-red-500/10 text-red-400 rounded-xl shrink-0">
                                            <Lock size={16} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white uppercase text-[11px] tracking-wider">
                                                Alteração Bloqueada para Operadores do Franga Studio
                                            </div>
                                            <p className="text-[11px] text-zinc-400 mt-0.5">
                                                O repositório do Google Drive está em modo somente leitura. Apenas administradores gerais possuem permissão para salvar novas pastas.
                                            </p>
                                        </div>
                                    </div>
                                )}

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
                                            disabled={!isAdmin || loadingConfig}
                                            className={`w-full border rounded-xl px-4 py-3 text-xs font-mono outline-none transition-all ${
                                                !isAdmin 
                                                    ? 'bg-zinc-950/50 border-zinc-850 text-zinc-500 cursor-not-allowed' 
                                                    : 'bg-zinc-950 border-zinc-800 focus:border-amber-500 text-amber-300 disabled:opacity-50'
                                            }`}
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!isAdmin || savingPatreonRepo || loadingConfig}
                                        className={`w-full py-3 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
                                            !isAdmin
                                                ? 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 text-white shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50'
                                        }`}
                                    >
                                        {!isAdmin ? (
                                            <>
                                                <Lock size={15} />
                                                <span>Alteração Bloqueada (Somente Leitura)</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                {savingPatreonRepo ? 'Salvando no Banco...' : 'Salvar Repositório do Drive'}
                                            </>
                                        )}
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
