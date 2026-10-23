'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    Users, 
    Tag, 
    Flame, 
    TrendingUp, 
    Radio, 
    Send, 
    Loader2, 
    Sparkles
} from 'lucide-react';
import { CustomersView } from '@/app/admin/customers/page';
import { CouponsView } from '@/app/admin/coupons/page';

type MarketingTab = 'clientes' | 'telemetria' | 'cadencias' | 'cupons' | 'campanhas' | 'demanda';

function MarketingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const paramTab = searchParams.get('tab') as MarketingTab | null;
    const initialTab: MarketingTab = paramTab && ['clientes', 'telemetria', 'cadencias', 'cupons', 'campanhas', 'demanda'].includes(paramTab)
        ? paramTab
        : 'clientes';

    const [activeTab, setActiveTab] = useState<MarketingTab>(initialTab);

    useEffect(() => {
        if (paramTab && paramTab !== activeTab && ['clientes', 'telemetria', 'cadencias', 'cupons', 'campanhas', 'demanda'].includes(paramTab)) {
            setActiveTab(paramTab);
        }
    }, [paramTab]);

    const handleTabChange = (tab: MarketingTab) => {
        setActiveTab(tab);
        const params = new URLSearchParams(window.location.search);
        params.set('tab', tab);
        router.replace(`/admin/marketing?${params.toString()}`, { scroll: false });
    };

    const tabs = [
        { id: 'clientes' as const, label: 'Clientes & CRM', icon: Users, badge: null },
        { id: 'telemetria' as const, label: 'Radar de Acessos', icon: Radio, badge: 'Live' },
        { id: 'cadencias' as const, label: 'Cadências & E-mail', icon: Send, badge: null },
        { id: 'cupons' as const, label: 'Cupons de Desconto', icon: Tag, badge: null },
        { id: 'campanhas' as const, label: 'Campanhas Flash', icon: Flame, badge: null },
        { id: 'demanda' as const, label: 'Demanda & Oportunidades', icon: TrendingUp, badge: null },
    ];

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
            {/* Header da Central */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <span className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                            <Flame size={24} />
                        </span>
                        Marketing & Clientes
                    </h1>
                    <p className="text-xs text-zinc-500 mt-1 font-medium max-w-2xl">
                        Hub unificado de CRM: base de clientes, telemetria em tempo real, réguas de cadência, cupons promocionais e inteligência de demanda.
                    </p>
                </div>
            </div>

            {/* Navegação por Abas */}
            <div className="flex items-center gap-2 p-1.5 bg-zinc-950/80 border border-zinc-900 rounded-2xl w-full overflow-x-auto scrollbar-none">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2.5 transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                                isActive
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                            }`}
                        >
                            <Icon size={15} className={tab.id === 'telemetria' && isActive ? 'animate-pulse' : ''} />
                            <span>{tab.label}</span>
                            {tab.badge && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                                    isActive ? 'bg-black/30 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Conteúdo das Abas */}
            <div className="w-full">
                {/* Abas geridas pelo CustomersView */}
                {activeTab === 'clientes' && (
                    <CustomersView forcedMode="clientes" />
                )}
                {activeTab === 'telemetria' && (
                    <CustomersView forcedMode="telemetria" />
                )}
                {activeTab === 'cadencias' && (
                    <CustomersView forcedMode="cadencias" />
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
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
                    Carregando Marketing & CRM...
                </p>
            </div>
        }>
            <MarketingContent />
        </Suspense>
    );
}
