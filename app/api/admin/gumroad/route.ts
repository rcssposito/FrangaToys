import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { getGumroadUser, getGumroadProducts, createSingleUseCoupon, getGumroadSales } from '@/lib/gumroad';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const auth = await requireRoles(['admin']);
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
        const auth = await requireRoles(['admin']);
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

// Sincronizar status de resgate via API de vendas do Gumroad
export async function PUT(req: Request) {
    try {
        const auth = await requireRoles(['admin']);
        if (auth instanceof NextResponse) return auth;

        const sales = await getGumroadSales();

        // Mapear vendas por cupom utilizado
        let updatedCount = 0;
        for (const sale of sales) {
            const offerCodeUsed = sale.offer_code;
            if (offerCodeUsed) {
                const { data: matchedClaim } = await supabase
                    .from('franga_gumroad_claims')
                    .select('id, is_redeemed')
                    .eq('coupon_code', offerCodeUsed)
                    .maybeSingle();

                if (matchedClaim && !matchedClaim.is_redeemed) {
                    await supabase
                        .from('franga_gumroad_claims')
                        .update({
                            is_redeemed: true,
                            times_used: 1,
                            redeemed_at: sale.created_at || new Date().toISOString()
                        })
                        .eq('id', matchedClaim.id);
                    updatedCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            totalSalesChecked: sales.length,
            claimsUpdated: updatedCount
        });

    } catch (error: any) {
        console.error('Erro na rota PUT /api/admin/gumroad:', error);
        return NextResponse.json({ error: error.message || 'Erro ao sincronizar resgates' }, { status: 500 });
    }
}
