import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { getGumroadUser, getGumroadProducts, createSingleUseCoupon, getGumroadSales, getGumroadProductOfferCodes } from '@/lib/gumroad';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const auth = await requireRoles(['admin', 'franga_studio']);
        if (auth instanceof NextResponse) return auth;

        // 1. Dados do Gumroad (usuário e catálogo de produtos)
        let gumroadUser: any = null;
        let products: any[] = [];
        try {
            gumroadUser = await getGumroadUser();
            products = await getGumroadProducts();
        } catch (e: any) {
            console.error('Erro ao conectar na API do Gumroad:', e.message);
        }

        // 2. Histórico de cupons emitidos e resgatados no Supabase
        const { data: claims, error: claimsError } = await supabase
            .from('franga_gumroad_claims')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (claimsError) throw claimsError;

        // 3. Produtos habilitados no /release
        const { data: configData } = await supabase
            .from('franga_studio_config')
            .select('key, value')
            .eq('key', 'enabled_gumroad_products')
            .maybeSingle();

        let enabledProducts: string[] = [];
        if (configData?.value) {
            try {
                enabledProducts = JSON.parse(configData.value);
            } catch {}
        }

        return NextResponse.json({
            user: gumroadUser,
            products,
            enabledProducts,
            claims: claims || []
        });

    } catch (error: any) {
        console.error('Erro na rota GET /api/admin/gumroad:', error);
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireRoles(['admin', 'franga_studio']);
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { productId, patronEmail, patronName, patronId, customCode } = body;

        if (!productId || !patronEmail) {
            return NextResponse.json({ error: 'productId e patronEmail são obrigatórios' }, { status: 400 });
        }

        // 1. Gerar cupom de uso único no Gumroad
        const { offerCode, checkoutUrl, permalink, productName } = await createSingleUseCoupon(productId, customCode);

        // 2. Gravar no Supabase para auditoria e rastreamento anti-leak
        const { data: claimRecord, error: dbError } = await supabase
            .from('franga_gumroad_claims')
            .insert({
                product_id: productId,
                product_name: productName,
                product_permalink: permalink,
                patron_email: patronEmail.trim().toLowerCase(),
                patron_name: patronName ? patronName.trim() : null,
                patron_id: patronId ? String(patronId) : null,
                coupon_code: offerCode.name,
                gumroad_coupon_id: offerCode.id,
                checkout_url: checkoutUrl,
                is_redeemed: false,
                times_used: 0
            })
            .select()
            .single();

        if (dbError) {
            console.error('Erro ao salvar claim no banco:', dbError);
        }

        return NextResponse.json({
            success: true,
            couponCode: offerCode.name,
            checkoutUrl,
            claim: claimRecord
        });

    } catch (error: any) {
        console.error('Erro na rota POST /api/admin/gumroad:', error);
        return NextResponse.json({ error: error.message || 'Erro ao gerar cupom Gumroad' }, { status: 500 });
    }
}

// Sincronizar status de resgate via API de vendas E API de offer_codes do Gumroad
export async function PUT(req: Request) {
    try {
        const auth = await requireRoles(['admin', 'franga_studio']);
        if (auth instanceof NextResponse) return auth;

        // 1. Buscar todos os claims pendentes no banco
        const { data: pendingClaims, error: claimsErr } = await supabase
            .from('franga_gumroad_claims')
            .select('*')
            .eq('is_redeemed', false);

        if (claimsErr) throw claimsErr;

        let updatedCount = 0;
        const details: any[] = [];

        // 2. MÉTODO 1: Checar diretamente na API de offer_codes dos produtos com claims pendentes
        if (pendingClaims && pendingClaims.length > 0) {
            const uniqueProductIds = Array.from(new Set(pendingClaims.map(c => c.product_id)));

            for (const prodId of uniqueProductIds) {
                try {
                    const offerCodes = await getGumroadProductOfferCodes(prodId);
                    
                    for (const offer of offerCodes) {
                        const matchingClaim = pendingClaims.find(c => c.coupon_code === offer.name);
                        if (matchingClaim) {
                            details.push({
                                code: offer.name,
                                times_used: offer.times_used,
                                max_purchase_count: offer.max_purchase_count,
                                is_used: offer.times_used > 0
                            });

                            if (offer.times_used > 0 && !matchingClaim.is_redeemed) {
                                await supabase
                                    .from('franga_gumroad_claims')
                                    .update({
                                        is_redeemed: true,
                                        times_used: offer.times_used,
                                        redeemed_at: new Date().toISOString()
                                    })
                                    .eq('id', matchingClaim.id);
                                updatedCount++;
                            }
                        }
                    }
                } catch (offerErr: any) {
                    console.error(`Erro ao consultar offer_codes do produto ${prodId}:`, offerErr.message);
                }
            }
        }

        // 3. MÉTODO 2: Checar extrato de vendas (sales) do Gumroad para capturar dados do comprador
        let sales: any[] = [];
        try {
            sales = await getGumroadSales();
            for (const sale of sales) {
                // No Gumroad, offer_code pode ser um objeto: { code: '...', name: '...' } ou string
                const offerCodeUsed = typeof sale.offer_code === 'string'
                    ? sale.offer_code
                    : sale.offer_code?.name || sale.offer_code?.code;

                if (offerCodeUsed) {
                    const { data: matchedClaim } = await supabase
                        .from('franga_gumroad_claims')
                        .select('id, is_redeemed, patron_email')
                        .eq('coupon_code', offerCodeUsed)
                        .maybeSingle();

                    if (matchedClaim) {
                        const buyerEmail = (sale.email || sale.purchase_email || '').trim().toLowerCase();
                        const patronEmail = (matchedClaim.patron_email || '').trim().toLowerCase();
                        const isLeak = Boolean(buyerEmail && patronEmail && buyerEmail !== patronEmail);

                        await supabase
                            .from('franga_gumroad_claims')
                            .update({
                                is_redeemed: true,
                                times_used: 1,
                                redeemed_at: sale.created_at || new Date().toISOString(),
                                redeemer_email: buyerEmail || null,
                                gumroad_order_number: String(sale.order_id || sale.order_number || ''),
                                gumroad_sale_id: sale.id ? String(sale.id) : null,
                                buyer_country: sale.country || sale.ip_country || null,
                                is_leak_detected: isLeak
                            })
                            .eq('id', matchedClaim.id);
                        updatedCount++;
                    }
                }
            }
        } catch (salesErr: any) {
            console.error('Erro ao consultar vendas do Gumroad:', salesErr.message);
        }

        return NextResponse.json({
            success: true,
            totalSalesChecked: sales.length,
            pendingClaimsChecked: pendingClaims?.length || 0,
            claimsUpdated: updatedCount,
            details
        });

    } catch (error: any) {
        console.error('Erro na rota PUT /api/admin/gumroad:', error);
        return NextResponse.json({ error: error.message || 'Erro ao sincronizar resgates' }, { status: 500 });
    }
}

// Alterar manualmente o status de um cupom na auditoria (ex: marcar como resgatado manualmente)
export async function PATCH(req: Request) {
    try {
        const auth = await requireRoles(['admin', 'franga_studio']);
        if (auth instanceof NextResponse) return auth;

        const body = await req.json();
        const { claimId, isRedeemed, redeemerEmail } = body;

        if (!claimId) {
            return NextResponse.json({ error: 'claimId é obrigatório' }, { status: 400 });
        }

        const updateData: any = {
            is_redeemed: !!isRedeemed,
            times_used: isRedeemed ? 1 : 0,
            redeemed_at: isRedeemed ? new Date().toISOString() : null
        };

        if (redeemerEmail !== undefined) {
            updateData.redeemer_email = redeemerEmail ? redeemerEmail.trim().toLowerCase() : null;
        }

        const { data, error } = await supabase
            .from('franga_gumroad_claims')
            .update(updateData)
            .eq('id', claimId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, claim: data });
    } catch (error: any) {
        console.error('Erro na rota PATCH /api/admin/gumroad:', error);
        return NextResponse.json({ error: error.message || 'Erro ao atualizar claim' }, { status: 500 });
    }
}


