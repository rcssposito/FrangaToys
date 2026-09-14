import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { fetchPatreonMemberships } from '@/lib/integrations/patreon';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const memberships = await fetchPatreonMemberships();

        // Fetch studios to perform fuzzy/name matching
        const { data: studios } = await supabase
            .from('studios')
            .select('id, nome, custo_mensal, ativo, merchant');

        const normalize = (name: string) => (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        const dbStudiosList = (studios || []).map(s => ({
            ...s,
            norm: normalize(s.nome)
        }));

        // Enrich memberships with studio match from FrangaToys database
        const enriched = memberships.map(m => {
            const normCamp = normalize(m.campaignName);
            
            // Try to find a matching studio in database using normalized string inclusion
            let matchedStudio = dbStudiosList.find(s => 
                s.norm && (s.norm.includes(normCamp) || normCamp.includes(s.norm))
            );

            const isPatreonActive = m.patronStatus === 'active_patron' && (m.amountCents || 0) > 0;
            // Para estúdios com Patreon ativo, o valor ao vivo do Patreon deve prevalecer (Patreon Sync)
            const finalBRL = (isPatreonActive && m.amountBRL > 0) ? m.amountBRL : (Number(matchedStudio?.custo_mensal) || 0);
            const finalFormattedBRL = `R$ ${finalBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            return {
                ...m,
                matchedStudioId: matchedStudio?.id || null,
                matchedStudioName: matchedStudio?.nome || null,
                amountBRL: finalBRL,
                amountFormattedBRL: finalFormattedBRL,
                isMerchantTier: m.isMerchantTier || !!matchedStudio?.merchant
            };
        });

        const activeMemberships = enriched.filter(m => m.patronStatus === 'active_patron' && (m.amountCents || 0) > 0);
        const activeCount = activeMemberships.length;
        
        const totalMonthlyUSD = activeMemberships.reduce((acc, m) => acc + (m.amountCents / 100), 0);
        const totalMonthlyBRL = activeMemberships.reduce((acc, m) => acc + m.amountBRL, 0);

        // Patreon live integration: apenas fornece os dados financeiros e memberships
        // (A alteração de ativo/pausado e merchant/vitrine é 100% manual pelo usuário para evitar sobrescritas indevidas)

        return NextResponse.json({
            memberships: enriched,
            stats: {
                totalActive: activeCount,
                totalMonthlyUSD: `$${totalMonthlyUSD.toFixed(2)}`,
                totalMonthlyBRL: `R$ ${totalMonthlyBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                totalMemberships: enriched.length
            }
        });
    } catch (error: any) {
        console.error('Error fetching Patreon licenses:', error);
        return NextResponse.json({ error: error.message || 'Erro ao carregar licenças do Patreon' }, { status: 500 });
    }
}
