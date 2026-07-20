export interface PatreonMembership {
    campaignId: string;
    campaignName: string;
    campaignUrl: string;
    patronStatus: string; // 'active_patron' | 'former_patron' | 'declined_patron'
    lastChargeStatus: string; // 'Paid' | 'Declined' | 'Refunded'
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
        const res = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL', { next: { revalidate: 3600 } });
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

export async function fetchPatreonMemberships(): Promise<PatreonMembership[]> {
    const accessToken = process.env.PATREON_CREATOR_ACCESS_TOKEN;
    if (!accessToken) {
        throw new Error('PATREON_CREATOR_ACCESS_TOKEN not configured in .env');
    }

    const usdBrlRate = await getUsdBrlRate();

    const url = "https://www.patreon.com/api/oauth2/v2/identity?include=memberships,memberships.campaign,memberships.currently_entitled_tiers&fields[member]=patron_status,currently_entitled_amount_cents,will_pay_amount_cents,next_charge_date,last_charge_date,last_charge_status&fields[campaign]=name,url&fields[tier]=title,description,amount_cents";

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'FrangaToysAdmin/1.0'
        },
        next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Patreon API HTTP Error ${response.status}: ${errorText}`);
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

    const parsedMemberships: PatreonMembership[] = membershipsRaw.map((m: any) => {
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
        
        // Prioritize paid tiers over free tiers
        const paidTiers = tierObjects.filter((t: any) => (t.amount_cents || 0) > 0);
        const primaryTierObj = paidTiers.length > 0 ? paidTiers[0] : tierObjects[0];

        const tiers = tierObjects
            .map((t: any) => t.title)
            .filter((title: string | undefined): title is string => !!title);

        const primaryTierTitle = primaryTierObj?.title || 'Merchant Tier';

        const isMerchant = tierObjects.some((t: any) => 
            merchantRegex.test(t.title || '') || merchantRegex.test(t.description || '')
        ) || merchantRegex.test(campName);

        const isFree = amountCents === 0 || willPayCents === 0 || paidTiers.length === 0;
        const effectiveStatus = isFree ? 'free_member' : status;

        return {
            campaignId: campId,
            campaignName: campName,
            campaignUrl: campUrl,
            patronStatus: effectiveStatus,
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

    return parsedMemberships;
}
