'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
    Users, 
    Tag, 
    Flame, 
    TrendingUp, 
    Radio, 
    Send, 
    Loader2, 
    Sparkles,
    ArrowLeft,
    PackageOpen
} from 'lucide-react';
import { CustomersView } from '@/app/admin/customers/page';
import { CouponsView } from '@/app/admin/coupons/page';
import { AbandonedCartsView } from '@/app/admin/abandoned-carts/page';

type MarketingTab = 'clientes' | 'carrinhos' | 'cupons' | 'campanhas' | 'demanda';

function MarketingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const paramTab = searchParams.get('tab') as MarketingTab | null;
    const validTabs: MarketingTab[] = ['clientes', 'carrinhos', 'cupons', 'campanhas', 'demanda'];
    const initialTab: MarketingTab = paramTab && validTabs.includes(paramTab)
        ? paramTab
        : 'clientes';

    const [activeTab, setActiveTab] = useState<MarketingTab>(initialTab);

    // Resumo executivo consolidado para o topo do Hub
    const [summaryStats, setSummaryStats] = useState<{
        totalClientes: number;
        vipClientes: number;
        carrinhosValor: number;
        carrinhosQtd: number;
        cuponsAtivos: number;
        loaded: boolean;
    }>({
        totalClientes: 0,
        vipClientes: 0,
        carrinhosValor: 0,
        carrinhosQtd: 0,
        cuponsAtivos: 0,
        loaded: false
    });

    useEffect(() => {
        if (paramTab && paramTab !== activeTab && validTabs.includes(paramTab)) {
            setActiveTab(paramTab);
        }
    }, [paramTab]);

    useEffect(() => {
        let isMounted = true;

        async function loadSummary() {
            try {
                const [cartsRes, couponsRes, custRes] = await Promise.allSettled([
                    fetch('/api/admin/abandoned-carts?status=all').then(r => r.ok ? r.json() : null),
                    fetch('/api/admin/coupons').then(r => r.ok ? r.json() : null),
                    fetch('/api/admin/customers').then(r => r.ok ? r.json() : null)
                ]);

                if (!isMounted) return;

                const cartsData = cartsRes.status === 'fulfilled' ? cartsRes.value : null;
                const couponsData = couponsRes.status === 'fulfilled' ? couponsRes.value : null;
                const custData = custRes.status === 'fulfilled' ? custRes.value : null;

                const totalClientes = Array.isArray(custData) ? custData.length : (custData?.items?.length || 0);
                const vipClientes = Array.isArray(custData) 
                    ? custData.filter((c: any) => c.tags?.some((t: string) => typeof t === 'string' && t.toLowerCase().includes('vip'))).length 
                    : 0;

                const carrinhosValor = Number(cartsData?.stats?.totalValue) || 0;
                const carrinhosQtd = Number(cartsData?.stats?.totalCarts) || 0;

                const cuponsAtivos = Array.isArray(couponsData) 
                    ? couponsData.filter((c: any) => c.ativo !== false).length 
                    : 0;

                setSummaryStats({
                    totalClientes,
                    vipClientes,
                    carrinhosValor,
                    carrinhosQtd,
                    cuponsAtivos,
                    loaded: true
                });
            } catch {
                if (isMounted) setSummaryStats(prev => ({ ...prev, loaded: true }));
            }
        }

        loadSummary();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleTabChange = (tab: MarketingTab) => {
        setActiveTab(tab);
        const params = new URLSearchParams(window.location.search);
        params.set('tab', tab);
        router.replace(`/admin/marketing?${params.toString()}`, { scroll: false });
    };

    const tabs = [
        { id: 'clientes' as const, label: 'Clientes & CRM', icon: Users, badge: null },
        { id: 'carrinhos' as const, label: 'Carrinhos Abandonados', icon: PackageOpen, badge: 'Resgate' },
        { id: 'cupons' as const, label: 'Cupons de Desconto', icon: Tag, badge: null },
        { id: 'campanhas' as const, label: 'Campanhas Flash', icon: Flame, badge: null },
        { id: 'demanda' as const, label: 'Demanda & Oportunidades', icon: TrendingUp, badge: null },
    ];

    return (
        <div className="w-full space-y-4 animate-in fade-in duration-300">
            {/* Header da Central com Navegação */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="p-2 hover:bg-zinc-800/80 bg-zinc-900/80 border border-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-100 shrink-0"
                        title="Voltar ao Painel"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-zinc-100 leading-none">
                            Marketing & Inteligência Comercial
                        </h1>
                        <p className="text-zinc-500 text-[11px] mt-1">
                            CRM integrado, resgate de carrinhos, telemetria em tempo real, cadências de e-mail e inteligência de demanda.
                        </p>
                    </div>
                </div>
            </div>

            {/* 4 Cards de Resumo Executivo (Dark Matte Luxury) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider">Base de Clientes</span>
                        <Users size={14} className="text-zinc-400" />
                    </div>
                    <div className="text-lg font-bold font-mono text-zinc-100">
                        {summaryStats.loaded ? summaryStats.totalClientes : '...'}
                        <span className="text-xs font-normal text-zinc-500 font-sans ml-1">cadastros</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1">
                        {summaryStats.loaded ? `${summaryStats.vipClientes} clientes VIP` : 'Carregando...'}
                    </span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider">Receita em Carrinhos</span>
                        <PackageOpen size={14} className="text-amber-400" />
                    </div>
                    <div className="text-lg font-bold font-mono text-amber-400">
                        {summaryStats.loaded 
                            ? `R$ ${summaryStats.carrinhosValor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` 
                            : '...'}
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1">
                        {summaryStats.loaded ? `${summaryStats.carrinhosQtd} carrinhos para resgate` : 'Carregando...'}
                    </span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider">Cupons Vigentes</span>
                        <Tag size={14} className="text-orange-400" />
                    </div>
                    <div className="text-lg font-bold font-mono text-zinc-100">
                        {summaryStats.loaded ? summaryStats.cuponsAtivos : '...'}
                        <span className="text-xs font-normal text-zinc-500 font-sans ml-1">cupons ativos</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1">
                        Prontos para checkout e campanhas
                    </span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-500 mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider">Radar de Telemetria</span>
                        <Radio size={14} className="text-emerald-400 animate-pulse" />
                    </div>
                    <div className="text-lg font-bold font-mono text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Live Ativo
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1">
                        Sessões, funis e tráfego em tempo real
                    </span>
                </div>
            </div>

            {/* Segmented Tab Controls (Dark Matte) */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800/90 rounded-xl w-full overflow-x-auto scrollbar-none">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                                isActive
                                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/80 shadow-xs'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                            }`}
                        >
                            <Icon size={13} className={isActive ? 'text-orange-500' : 'text-zinc-500'} />
                            <span>{tab.label}</span>
                            {tab.badge && (
                                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full border ${
                                    isActive 
                                        ? 'bg-zinc-900 text-emerald-400 border-zinc-700' 
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Conteúdo das Abas */}
            <div className="w-full pt-1">
                {/* Aba de Clientes & CRM (gerencia Clientes, Cadências e Radar internamente) */}
                {activeTab === 'clientes' && (
                    <CustomersView />
                )}

                {/* Aba de Carrinhos Integrada */}
                {activeTab === 'carrinhos' && (
                    <AbandonedCartsView hideHeader={true} />
                )}

                {/* Abas geridas pelo CouponsView */}
                {activeTab === 'cupons' && (
                    <CouponsView forcedTab="cupons" />
                )}
                {activeTab === 'campanhas' && (
                    <CouponsView forcedTab="campanhas" />
                )}
                {activeTab === 'demanda' && (
                    <CouponsView forcedTab="demanda" />
                )}
            </div>
        </div>
    );
}

export default function MarketingPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
                <p className="text-xs font-mono uppercase tracking-widest text-zinc-500">
                    Carregando Marketing & CRM...
                </p>
            </div>
        }>
            <MarketingContent />
        </Suspense>
    );
}
