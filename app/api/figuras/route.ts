
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { FiltersSchema, FiguraDTO } from '@/lib/dto';
import { calculateFigurePrices } from '@/lib/pricing';

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
            figuras_meta(
                altura_cm,
                largura_cm,
                profundidade_cm,
                resina_kg,
                horas_impressao,
                horas_pintura
            )
        `, { count: 'exact' });

        // --- Filters ---
        if (filters.incluirNaoVendaveis !== 'true') {
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

        // --- Sorting ---
        const sortType = filters.sort || (filters.novidades === 'true' ? 'newest' : 'name_asc');

        if (sortType === 'newest') {
            query = query.order('id', { ascending: false });
        } else if (sortType === 'name_desc') {
            query = query.order('nome', { ascending: false });
        } else {
            // Default: name_asc
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
            
            const precos = settings && meta ? calculateFigurePrices(meta, settings) : undefined;

            // Handle joined objects that might come as arrays
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
                precos: precos ? {
                    estilizado: precos.estilizado,
                    colorido: precos.colorido,
                    premium: precos.premium,
                    pix_estilizado: precos.pix_estilizado,
                    pix_colorido: precos.pix_colorido,
                    pix_premium: precos.pix_premium
                } : undefined
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
