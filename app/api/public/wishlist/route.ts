import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateFigurePrices } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rawPhone = searchParams.get('phone');
        const rawIds = searchParams.get('ids');

        let targetIds: number[] = [];

        if (rawPhone) {
            const cleanPhone = rawPhone.replace(/\D/g, '');
            if (cleanPhone.length >= 8) {
                const { data: client } = await supabase
                    .from('clientes')
                    .select('wishlist')
                    .or(`telefone.eq.${cleanPhone},telefone.ilike.%${cleanPhone.slice(-8)}%`)
                    .limit(1)
                    .maybeSingle();

                if (client && Array.isArray(client.wishlist)) {
                    targetIds = client.wishlist;
                }
            }
        } else if (rawIds) {
            targetIds = rawIds
                .split(',')
                .map(id => parseInt(id.trim(), 10))
                .filter(id => !isNaN(id) && id > 0);
        }

        if (targetIds.length === 0) {
            return NextResponse.json({ items: [], ids: [] });
        }

        // Fetch pricing settings for dynamic price calculation
        const { data: settings } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        // Fetch figures by IDs
        const { data: figures, error } = await supabase
            .from('figuras')
            .select(`
                id,
                nome,
                codigo,
                imagem_url,
                imagem_secundaria,
                disponivel,
                tem_extras,
                slug,
                series: series ( id, nome ),
                studios: studios ( id, nome ),
                figuras_meta (
                    resina_kg,
                    horas_impressao,
                    horas_pintura,
                    escala,
                    is_campanha,
                    is_campanha_active,
                    desconto_campanha,
                    preco_fixo_campanha
                )
            `)
            .in('id', targetIds);

        if (error) throw error;

        const formattedFigures = (figures || []).map((f: any) => {
            const metas = Array.isArray(f.figuras_meta) ? f.figuras_meta : [f.figuras_meta].filter(Boolean);
            const meta = metas.find((m: any) => m.is_campanha || m.is_campanha_active || m.preco_fixo_campanha > 0 || m.desconto_campanha > 0) || metas[0] || {};
            const prices = calculateFigurePrices(meta, settings || undefined);

            const isCampanha = !!(meta.is_campanha || meta.is_campanha_active || meta.desconto_campanha > 0 || meta.preco_fixo_campanha > 0);

            return {
                id: f.id,
                nome: f.nome,
                codigo: f.codigo,
                imagem_url: f.imagem_url,
                imagem_secundaria: f.imagem_secundaria,
                disponivel: f.disponivel,
                tem_extras: f.tem_extras,
                slug: f.slug,
                serie: f.series?.nome || 'Sem Série',
                studio: f.studios?.nome || 'Studio',
                preco: prices.colorido,
                precos: prices,
                is_campanha: isCampanha
            };
        });

        return NextResponse.json({
            items: formattedFigures,
            ids: targetIds
        });
    } catch (err: any) {
        console.error('Error fetching wishlist:', err);
        return NextResponse.json({ error: 'Erro ao carregar lista de desejos' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { phone, wishlistIds } = body;

        if (!phone || !Array.isArray(wishlistIds)) {
            return NextResponse.json({ error: 'Telefone e lista de IDs são obrigatórios' }, { status: 400 });
        }

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 8) {
            return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 });
        }

        const uniqueIds = Array.from(new Set(wishlistIds.filter(id => typeof id === 'number' && id > 0)));

        // Procura cliente existente
        const { data: existingClient } = await supabase
            .from('clientes')
            .select('id, wishlist')
            .or(`telefone.eq.${cleanPhone},telefone.ilike.%${cleanPhone.slice(-8)}%`)
            .limit(1)
            .maybeSingle();

        if (existingClient) {
            // Mescla IDs sem duplicar
            const merged = Array.from(new Set([...(existingClient.wishlist || []), ...uniqueIds]));
            const { error: updateError } = await supabase
                .from('clientes')
                .update({ wishlist: merged })
                .eq('id', existingClient.id);

            if (updateError) throw updateError;

            return NextResponse.json({ success: true, wishlist: merged });
        } else {
            // Cliente ainda não cadastrado por compra: cria lead leve
            const { error: insertError } = await supabase
                .from('clientes')
                .insert({
                    nome: 'Colecionador',
                    telefone: cleanPhone,
                    wishlist: uniqueIds
                });

            if (insertError) {
                console.error('Error inserting client lead for wishlist:', insertError);
            }

            return NextResponse.json({ success: true, wishlist: uniqueIds });
        }
    } catch (err: any) {
        console.error('Error updating wishlist:', err);
        return NextResponse.json({ error: 'Erro ao sincronizar lista de desejos' }, { status: 500 });
    }
}
