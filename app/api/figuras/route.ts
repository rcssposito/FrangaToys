
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { FiltersSchema, FiguraDTO } from '@/lib/dto';
import { calculateFigurePrices } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const queryParams = Object.fromEntries(searchParams.entries());

        // Validate Input
        const filters = FiltersSchema.parse(queryParams);

        // Fetch pricing params first (cached or constant)
        const { data: settings } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        // 3. Category Logic (Database-side filtering)
        const shouldFilterCategory = filters.categoria && filters.categoria !== 'Todos' && filters.categoria !== 'all';

        // Construct select string dynamically based on whether we filter or not
        const seriesJoin = shouldFilterCategory ? 'series:series!inner' : 'series:series';
        const categoryJoin = shouldFilterCategory ? 'categorias:categorias!inner' : 'categorias:categorias';
        const isCampanhaActive = searchParams.get('campanha') === 'true';
        const metaJoin = isCampanhaActive ? 'figuras_meta!inner' : 'figuras_meta';

        let query = supabase
            .from('figuras')
            .select(`
            id,
            nome,
            codigo,
            imagem_url,
            disponivel,
            tem_extras,
            studio_id,
            serie_id,
            ${seriesJoin} (
                id,
                nome,
                ${categoryJoin} (
                    id,
                    nome
                )
             ),
            studios: studios(
                id,
                nome,
                logo_url,
                instagram_handle,
                social_url
            ),
            ${metaJoin}(
                altura_cm,
                largura_cm,
                profundidade_cm,
                resina_kg,
                horas_impressao,
                horas_pintura,
                is_campanha_active,
                desconto_campanha,
                preco_fixo_campanha
            )
        `, { count: 'exact' });

        // --- Filters ---
        if (filters.incluirNaoVendaveis !== 'true' && !isCampanhaActive) {
            query = query.is('disponivel', true);
        }

        if (filters.studioIds) {
            const ids = filters.studioIds.split(',').map(Number).filter(n => !isNaN(n));
            if (ids.length > 0) {
                query = query.in('studio_id', ids);
            }
        }

        if (shouldFilterCategory) {
            query = query.eq('series.categorias.nome', filters.categoria);
        }

        if (filters.q) {
            const term = filters.q;
            query = query.or(`nome.ilike.%${term}%,sinonimos.ilike.%${term}%`);
        }

        if (isCampanhaActive) {
            query = query.eq('figuras_meta.is_campanha_active', true);
        }

        // --- Sorting ---
        const sortType = filters.sort || (filters.novidades === 'true' ? 'newest' : 'name_asc');

        if (sortType === 'newest') {
            query = query.order('id', { ascending: false });
        } else if (sortType === 'name_desc') {
            query = query.order('nome', { ascending: false });
        } else {
            query = query.order('nome', { ascending: true });
        }

        const limit = parseInt(filters.limit || '20'); 
        const page = parseInt(queryParams.page as string || '0');
        const from = page * limit;
        const to = from + limit - 1;

        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            throw error;
        }

        // Transform to DTO
        const items = data.map((item: any) => {
            const meta = Array.isArray(item.figuras_meta) ? item.figuras_meta[0] : item.figuras_meta;
            const pricesData = settings && meta ? calculateFigurePrices(meta, settings) : null;
            
            // Pre-calculate prices to avoid ternary issues in large objects
            let precos = null;
            if (pricesData) {
                precos = {
                    estilizado: pricesData.estilizado,
                    colorido: pricesData.colorido,
                    premium: pricesData.premium,
                    pix_estilizado: pricesData.pix_estilizado,
                    pix_colorido: pricesData.pix_colorido,
                    pix_premium: pricesData.pix_premium
                };
            }

            const seriesData = Array.isArray(item.series) ? item.series[0] : item.series;
            const studioData = Array.isArray(item.studios) ? item.studios[0] : item.studios;
            const categoriaData = seriesData?.categorias;
            const categoriaNome = Array.isArray(categoriaData) ? categoriaData[0]?.nome : categoriaData?.nome;

            return {
                id: item.id,
                nome: item.nome,
                codigo: item.codigo,
                imagem_url: item.imagem_url,
                disponivel: item.disponivel,
                tem_extras: item.tem_extras || false,
                studio_id: item.studio_id,
                serie_id: item.serie_id,
                serie: seriesData?.nome || null,
                categoria: categoriaNome || null,
                studio: studioData?.nome || null,
                studio_logo: studioData?.logo_url || null,
                studio_instagram: studioData?.instagram_handle || null,
                studio_social: studioData?.social_url || null,
                altura_cm: meta?.altura_cm || null,
                largura_cm: meta?.largura_cm || null,
                profundidade_cm: meta?.profundidade_cm || null,
                resina_kg: meta?.resina_kg || null,
                horas_impressao: meta?.horas_impressao || null,
                horas_pintura: meta?.horas_pintura || null,
                precos: precos,
                is_campanha: meta?.is_campanha_active || !!meta?.preco_fixo_campanha || !!meta?.desconto_campanha,
                is_campanha_active: meta?.is_campanha_active || false,
                desconto_campanha: meta?.desconto_campanha || 0,
                preco_fixo_campanha: meta?.preco_fixo_campanha || 0
            };
        });

        const nextPage = items.length === limit ? page + 1 : undefined;

        return NextResponse.json({ 
            items, 
            nextCursor: nextPage,
            total: count || 0
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });

    } catch (err: any) {
        console.error("API Error:", err);
        return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
    }
}
