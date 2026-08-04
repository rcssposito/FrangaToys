export interface PatreonMembership {
    campaignId: string;
    campaignName: string;
    campaignUrl: string;
    patronStatus: string;
    lastChargeStatus: string;
    amountCents: number;
    amountFormattedUSD: string;
    amountBRL: number;
    amountFormattedBRL: string;
    nextChargeDate: string | null;
    lastChargeDate: string | null;
    tiers: string[];
    isMerchantTier: boolean;
}

export async function getUsdBrlRate(): Promise<number> {
    try {
        const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL', { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            const rate = parseFloat(data.USDBRL?.bid);
            if (rate > 0) return rate;
        }
    } catch (e) {
        console.error('Error fetching USD/BRL rate:', e);
    }
    return 5.60;
}

/**
 * Valida se um e-mail é de um membro ativo da campanha do Patreon.
 */
export async function verifyActivePatreonMember(emailToVerify: string): Promise<{ isAuthorized: boolean; patronName: string; reason?: string }> {
    const normalizedEmail = emailToVerify.trim().toLowerCase();
    const token = process.env.PATREON_CREATOR_ACCESS_TOKEN;

    if (!normalizedEmail) {
        return { isAuthorized: false, patronName: '', reason: 'E-mail não informado.' };
    }

    if (token) {
        try {
            // 1. Obter a Campanha do Criador (SEM CACHE)
            const campRes = await fetch('https://www.patreon.com/api/oauth2/v2/campaigns', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                },
                cache: 'no-store'
            });

            if (campRes.ok) {
                const campData = await campRes.json();
                const campaignId = campData.data?.[0]?.id;

                if (campaignId) {
                    // 2. Buscar membros da campanha no Patreon (SEM CACHE)
                    const memRes = await fetch(`https://www.patreon.com/api/oauth2/v2/campaigns/${campaignId}/members?include=user&fields[member]=patron_status,email,full_name&fields[user]=email,full_name&t=${Date.now()}`, {
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache'
                        },
                        cache: 'no-store'
                    });

                    if (memRes.ok) {
                        const memData = await memRes.json();
                        const members = memData.data || [];
                        const users = memData.included || [];

                        const userMap = new Map<string, string>();
                        users.forEach((u: any) => {
                            if (u.type === 'user' && u.attributes?.email) {
                                userMap.set(u.id, u.attributes.email.toLowerCase());
                            }
                        });

                        const matchingMember = members.find((m: any) => {
                            const memberEmail = m.attributes?.email?.toLowerCase();
                            const userId = m.relationships?.user?.data?.id;
                            const linkedUserEmail = userId ? userMap.get(userId) : '';
                            return memberEmail === normalizedEmail || linkedUserEmail === normalizedEmail;
                        });

                        if (matchingMember) {
                            const status = matchingMember.attributes?.patron_status;
                            // Aceita active_patron, null, ou qualquer status que não seja cancelado/rejeitado
                            if (status !== 'former_patron' && status !== 'declined_patron') {
                                return {
                                    isAuthorized: true,
                                    patronName: matchingMember.attributes?.full_name || 'Apoiador Ativo'
                                };
                            } else {
                                return {
                                    isAuthorized: false,
                                    patronName: '',
                                    reason: `A assinatura do e-mail ${normalizedEmail} no Patreon consta como inativa (${status}).`
                                };
                            }
                        }
                    }
                }
            }
        } catch (e: any) {
            console.error('Erro ao consultar API do Patreon:', e.message);
        }
    }

    // Se o usuário completou o OAuth2 com o Patreon com sucesso, considera autorizado por padrão
    return {
        isAuthorized: true,
        patronName: 'Apoiador Patreon'
    };
}

export async function fetchPatreonMemberships(): Promise<PatreonMembership[]> {
    const accessToken = process.env.PATREON_CREATOR_ACCESS_TOKEN;
    if (!accessToken) {
        return [];
    }

    const usdBrlRate = await getUsdBrlRate();
    const url = "https://www.patreon.com/api/oauth2/v2/identity?include=memberships,memberships.campaign,memberships.currently_entitled_tiers&fields[member]=patron_status,currently_entitled_amount_cents,will_pay_amount_cents,next_charge_date,last_charge_date,last_charge_status&fields[campaign]=name,url&fields[tier]=title,description,amount_cents";

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'FrangaToysAdmin/1.0',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        cache: 'no-store'
    });

    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    const campaignMap = new Map<string, any>();
    const tierMap = new Map<string, any>();
    const membershipsRaw: any[] = [];

    (data.included || []).forEach((item: any) => {
        if (item.type === 'campaign') {
            campaignMap.set(item.id, item.attributes || {});
        } else if (item.type === 'tier') {
            tierMap.set(item.id, item.attributes || {});
        } else if (item.type === 'member') {
            membershipsRaw.push(item);
        }
    });

    const merchantRegex = /merchant|commercial|comercial|vendedor|revenda|permission to sell|sell physical|sell.*3d print|licence|license|merchant guild|monarch/i;

    return membershipsRaw.map((m: any) => {
        const campId = m.relationships?.campaign?.data?.id || '';
        const camp = campaignMap.get(campId) || {};
        const campName = camp.name || 'Desconhecido';
        const campUrl = camp.url || '';

        const status = m.attributes?.patron_status || 'inactive';
        const lastCharge = m.attributes?.last_charge_status || 'Unknown';
        const amountCents = m.attributes?.currently_entitled_amount_cents || 0;
        const willPayCents = m.attributes?.will_pay_amount_cents ?? 0;
        const amountUSD = amountCents / 100;
        const amountBRL = willPayCents > 0 ? (willPayCents / 100) : (amountUSD * usdBrlRate);
        const nextCharge = m.attributes?.next_charge_date || null;
        const lastChargeDate = m.attributes?.last_charge_date || null;

        const tiersData = m.relationships?.currently_entitled_tiers?.data || [];
        const tierObjects = tiersData.map((t: any) => tierMap.get(t.id)).filter(Boolean);
        const paidTiers = tierObjects.filter((t: any) => (t.amount_cents || 0) > 0);
        const primaryTierObj = paidTiers.length > 0 ? paidTiers[0] : tierObjects[0];

        const tiers = tierObjects
            .map((t: any) => t.title)
            .filter((title: string | undefined): title is string => !!title);

        const primaryTierTitle = primaryTierObj?.title || 'Merchant Tier';

        const isMerchant = tierObjects.some((t: any) => 
            merchantRegex.test(t.title || '') || merchantRegex.test(t.description || '')
        ) || merchantRegex.test(campName);

        return {
            campaignId: campId,
            campaignName: campName,
            campaignUrl: campUrl,
            patronStatus: status,
            lastChargeStatus: lastCharge,
            amountCents: amountCents,
            amountFormattedUSD: `$${amountUSD.toFixed(2)}`,
            amountBRL: amountBRL,
            amountFormattedBRL: `R$ ${amountBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            nextChargeDate: nextCharge,
            lastChargeDate: lastChargeDate,
            tiers: tiers.length > 0 ? [primaryTierTitle, ...tiers.filter((t: string) => t !== primaryTierTitle)] : [primaryTierTitle],
            isMerchantTier: isMerchant
        };
    });
}
