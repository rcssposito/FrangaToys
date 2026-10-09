import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { getGumroadProducts, createSingleUseCoupon } from '@/lib/gumroad';

export const dynamic = 'force-dynamic';

/**
 * GET /api/release/gumroad?email=...
 * Retorna os produtos disponíveis do Gumroad e o status de resgate do membro
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email')?.trim().toLowerCase();

        // 1. Buscar produtos do Gumroad
        let products: any[] = [];
        try {
            products = await getGumroadProducts();
        } catch (e: any) {
            console.error('Erro ao buscar produtos do Gumroad:', e.message);
        }

        // 2. Buscar configurações do estúdio (delivery_mode e enabled_gumroad_products)
        const { data: configRows } = await supabase
            .from('franga_studio_config')
            .select('key, value');

        const configMap: Record<string, string> = {};
        (configRows || []).forEach(r => { configMap[r.key] = r.value; });

        const deliveryMode = configMap['delivery_mode'] || 'gumroad';
        const patreonAccessRule = configMap['patreon_access_rule'] || 'paid_only';
        let enabledProductIds: string[] = [];
        try {
            if (configMap['enabled_gumroad_products']) {
                enabledProductIds = JSON.parse(configMap['enabled_gumroad_products']);
            }
        } catch {}

        // Filtrar SOMENTE os produtos habilitados pelo admin
        const filteredProducts = products.filter(p => enabledProductIds.includes(p.id));

        // 3. Se o e-mail foi fornecido, buscar os resgates deste membro
        let userClaims: any[] = [];
        if (email) {
            const { data } = await supabase
                .from('franga_gumroad_claims')
                .select('*')
                .eq('patron_email', email);
            userClaims = data || [];
        }

        // Mapear cada produto com o status do membro
        const mappedProducts = filteredProducts.map((prod: any) => {
            const claim = userClaims.find(c => c.product_id === prod.id);
            const coverImage = (prod.covers && prod.covers[0]?.url) || prod.preview_url || prod.thumbnail_url || null;
            const cleanDescription = prod.description
                ? prod.description.replace(/<[^>]*>?/gm, '').trim()
                : '';

            return {
                id: prod.id,
                name: prod.name,
                description: cleanDescription,
                formatted_price: prod.formatted_price,
                price: prod.price,
                short_url: prod.short_url,
                permalink: prod.permalink || (prod.short_url ? prod.short_url.split('/').pop() : ''),
                published: prod.published,
                cover_url: coverImage,
                claim: claim ? {
                    id: claim.id,
                    coupon_code: claim.coupon_code,
                    checkout_url: claim.checkout_url,
                    is_redeemed: claim.is_redeemed,
                    created_at: claim.created_at
                } : null
            };
        });

        return NextResponse.json({
            deliveryMode,
            patreonAccessRule,
            products: mappedProducts
        });

    } catch (error: any) {
        console.error('Erro no GET /api/release/gumroad:', error);
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
    }
}

/**
 * POST /api/release/gumroad
 * Resgate do cupom de uso único pelo próprio membro
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { productId, patronEmail, patronName } = body;

        if (!productId || !patronEmail) {
            return NextResponse.json({ error: 'Produto e e-mail são obrigatórios' }, { status: 400 });
        }

        const normalizedEmail = patronEmail.trim().toLowerCase();

        // 1. ANTI-ABUSO: Verificar se este patrono JÁ resgatou um cupom para este produto
        const { data: existingClaim } = await supabase
            .from('franga_gumroad_claims')
            .select('*')
            .eq('patron_email', normalizedEmail)
            .eq('product_id', productId)
            .maybeSingle();

        if (existingClaim) {
            // Retorna o cupom existente sem gerar um novo! Impede geração infinita por um único membro.
            return NextResponse.json({
                alreadyClaimed: true,
                message: 'Você já gerou o cupom exclusivo para este modelo.',
                couponCode: existingClaim.coupon_code,
                checkoutUrl: existingClaim.checkout_url,
                claim: existingClaim
            });
        }

        // 2. Gerar cupom de uso único no Gumroad
        const { offerCode, checkoutUrl, permalink, productName } = await createSingleUseCoupon(productId);

        // 3. Registrar no banco de dados para vincular permanentemente o assinante a este cupom
        const { data: newClaim, error: dbError } = await supabase
            .from('franga_gumroad_claims')
            .insert({
                product_id: productId,
                product_name: productName,
                product_permalink: permalink,
                patron_email: normalizedEmail,
                patron_name: patronName ? patronName.trim() : null,
                coupon_code: offerCode.name,
                gumroad_coupon_id: offerCode.id,
                checkout_url: checkoutUrl,
                is_redeemed: false,
                times_used: 0
            })
            .select()
            .single();

        if (dbError) {
            console.error('Erro ao registrar claim do membro no Supabase:', dbError);
        }

        return NextResponse.json({
            alreadyClaimed: false,
            success: true,
            couponCode: offerCode.name,
            checkoutUrl,
            claim: newClaim
        });

    } catch (error: any) {
        console.error('Erro no POST /api/release/gumroad:', error);
        return NextResponse.json({ error: error.message || 'Erro ao resgatar modelo no Gumroad' }, { status: 500 });
    }
}
