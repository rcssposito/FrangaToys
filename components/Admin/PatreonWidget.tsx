'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, ShieldCheck, DollarSign, Loader2, Crown, UserCheck, UserX } from 'lucide-react';

export default function PatreonWidget() {
    const [patreonData, setPatreonData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPatreonData = async () => {
            try {
                const res = await fetch('/api/admin/integrations/patreon/licenses');
                if (res.ok) {
                    const data = await res.json();
                    setPatreonData(data);
                }
            } catch (err) {
                console.error('Error loading Patreon widget data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPatreonData();
    }, []);

    if (loading) {
        return (
            <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/5 p-6 rounded-[2.5rem] flex justify-center items-center h-48">
                <Loader2 size={24} className="animate-spin text-orange-500" />
            </div>
        );
    }

    if (!patreonData || !patreonData.memberships || patreonData.memberships.length === 0) {
        return null; // Don't show widget if not configured or empty
    }

    const activeMemberships = patreonData.memberships.filter((m: any) => m.patronStatus === 'active_patron');

    return (
        <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-between space-y-6 w-full">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-inner">
                        <Crown size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">Licenças Comerciais Patreon</h3>
                        <p className="text-[11px] font-medium text-zinc-400">Monitoramento de Merchant Tiers e Estúdios Ativos</p>
                    </div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 px-3.5 py-1.5 rounded-xl text-orange-400 font-black text-xs flex items-center shadow-sm">
                    <span>{patreonData.stats.totalMonthlyBRL || patreonData.stats.totalMonthlyUSD} /mês</span>
                </div>
            </div>

            {/* Studio Badges Grid - Compact 6-column grid with status badges for active studios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {activeMemberships.map((m: any, idx: number) => {
                    const isActive = m.patronStatus === 'active_patron' && (m.amountCents || 0) > 0;
                    const isMerchant = m.isMerchantTier;

                    return (
                        <a
                            key={idx}
                            href={m.campaignUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-zinc-900/80 hover:bg-orange-500/10 border border-zinc-800 hover:border-orange-500/40 p-4 rounded-2xl transition-all duration-300 group flex items-start justify-between shadow-md"
                        >
                            <div className="flex flex-col min-w-0 pr-2 space-y-1.5 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-sm font-black text-white truncate group-hover:text-orange-400 transition-colors leading-snug">
                                        {m.campaignName}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {isActive ? (
                                        isMerchant ? (
                                            <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0">
                                                <Crown size={10} className="text-amber-400" />
                                                Merchant
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0">
                                                <UserCheck size={10} className="text-emerald-400" />
                                                Ativo
                                            </span>
                                        )
                                    ) : (
                                        <span className="inline-flex items-center gap-1 bg-zinc-800/80 border border-zinc-700/50 text-zinc-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0">
                                            <UserX size={10} className="text-zinc-500" />
                                            Inativo
                                        </span>
                                    )}
                                    <span className="text-xs font-bold text-orange-400 truncate block">
                                        {m.amountFormattedBRL || m.amountFormattedUSD}
                                    </span>
                                </div>

                                <span className="text-[11px] font-semibold text-zinc-300 truncate block">
                                    {m.tiers[0] || 'Merchant Tier'}
                                </span>
                            </div>
                            <ExternalLink size={14} className="text-zinc-500 group-hover:text-orange-400 shrink-0 transition-colors mt-0.5" />
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
