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
            <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-xl flex justify-center items-center h-32">
                <Loader2 size={20} className="animate-spin text-orange-500" />
            </div>
        );
    }

    if (!patreonData || !patreonData.memberships || patreonData.memberships.length === 0) {
        return null; // Don't show widget if not configured or empty
    }

    const activeMemberships = patreonData.memberships.filter((m: any) => m.patronStatus === 'active_patron');

    return (
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/60 p-6 md:p-8 rounded-2xl shadow-xl shadow-black/20 flex flex-col justify-between space-y-6 w-full">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800/60">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-center text-orange-400">
                        <Crown size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Licenças Comerciais Patreon</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">Monitoramento de Merchant Tiers e Estúdios Ativos</p>
                    </div>
                </div>
                <div className="bg-zinc-950/80 border border-zinc-800 px-4 py-1.5 rounded-xl text-zinc-200 font-mono font-bold text-xs flex items-center shadow-sm">
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
                            className="bg-zinc-950/60 hover:bg-zinc-900/90 border border-zinc-800/60 hover:border-zinc-700/80 p-4 rounded-xl transition-all group flex items-start justify-between shadow-sm"
                        >
                            <div className="flex flex-col min-w-0 pr-2 space-y-1.5 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-bold text-zinc-200 truncate group-hover:text-white transition-colors leading-snug">
                                        {m.campaignName}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isActive ? (
                                        isMerchant ? (
                                            <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono uppercase px-2 py-0.5 rounded-md shrink-0 font-semibold">
                                                Merchant
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono uppercase px-2 py-0.5 rounded-md shrink-0 font-semibold">
                                                Ativo
                                            </span>
                                        )
                                    ) : (
                                        <span className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] font-mono uppercase px-2 py-0.5 rounded-md shrink-0">
                                            Inativo
                                        </span>
                                    )}
                                    <span className="text-xs font-mono font-bold text-zinc-300 truncate block">
                                        {m.amountFormattedBRL || m.amountFormattedUSD}
                                    </span>
                                </div>

                                <span className="text-[11px] text-zinc-500 truncate block">
                                    {m.tiers[0] || 'Merchant Tier'}
                                </span>
                            </div>
                            <ExternalLink size={13} className="text-zinc-600 group-hover:text-zinc-300 shrink-0 transition-colors mt-0.5" />
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
