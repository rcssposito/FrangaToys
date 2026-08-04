import { NextRequest, NextResponse } from 'next/server';
import { fetchPatreonMemberships } from '@/lib/integrations/patreon';

export async function GET(req: NextRequest) {
    try {
        const token = process.env.PATREON_CREATOR_ACCESS_TOKEN;

        if (!token) {
            return NextResponse.json({
                success: false,
                error: 'PATREON_CREATOR_ACCESS_TOKEN não está configurado no arquivo .env.local.'
            }, { status: 400 });
        }

        // 1. Tentar buscar da API de OAuth de Identidade do Criador
        const memberships = await fetchPatreonMemberships();

        // 2. Se a API de membros da campanha for usada
        const campRes = await fetch('https://www.patreon.com/api/oauth2/v2/campaigns', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let activeMembers: any[] = [];

        if (campRes.ok) {
            const campData = await campRes.json();
            const campaignId = campData.data?.[0]?.id;

            if (campaignId) {
                const memRes = await fetch(`https://www.patreon.com/api/oauth2/v2/campaigns/${campaignId}/members?include=user,currently_entitled_tiers&fields[member]=patron_status,email,full_name,currently_entitled_amount_cents&fields[user]=email,full_name`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (memRes.ok) {
                    const memData = await memRes.json();
                    const members = memData.data || [];
                    const users = memData.included || [];

                    const userMap = new Map<string, any>();
                    users.forEach((u: any) => {
                        if (u.type === 'user') {
                            userMap.set(u.id, u.attributes || {});
                        }
                    });

                    activeMembers = members.map((m: any) => {
                        const userId = m.relationships?.user?.data?.id;
                        const userAttr = userId ? userMap.get(userId) : {};
                        const email = m.attributes?.email || userAttr.email || 'Oculto pelo membro';
                        const fullName = m.attributes?.full_name || userAttr.full_name || 'Apoiador Anonimo';

                        return {
                            id: m.id,
                            fullName,
                            email,
                            status: m.attributes?.patron_status || 'inactive',
                            amountCents: m.attributes?.currently_entitled_amount_cents || 0,
                            isActive: m.attributes?.patron_status === 'active_patron'
                        };
                    });
                }
            }
        }

        const totalActive = activeMembers.filter(m => m.isActive).length;

        return NextResponse.json({
            success: true,
            totalMembers: activeMembers.length,
            totalActiveMembers: totalActive,
            members: activeMembers.length > 0 ? activeMembers : memberships
        });

    } catch (error: any) {
        console.error('Erro ao consultar membros do Patreon:', error);
        return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
    }
}
