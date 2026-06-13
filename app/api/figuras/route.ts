
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
            tem_pintura_real,
            slug,
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
                social_url,
                merchant
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

        // --- Price Range Filtering (Unified with storefront tiers) ---
        if (filters.priceRange) {
            const { data: allMeta, error: metaError } = await supabase
                .from('figuras')
                .select('id, figuras_meta(resina_kg, horas_impressao, horas_pintura, is_campanha_active, desconto_campanha, preco_fixo_campanha)');
            
            if (metaError) throw metaError;

            if (allMeta && settings) {
                const parts = filters.priceRange.split('-');
                const min = parseFloat(parts[0]);
                const max = parts[1] === '+' || parts[1] === '' ? Infinity : parseFloat(parts[1]);
                
                const matchedIds = allMeta.filter(item => {
                    const metaList = item.figuras_meta;
                    const meta = Array.isArray(metaList) ? metaList[0] : metaList;
                    if (!meta) return false;
                    
                    const prices = calculateFigurePrices(meta as any, settings as any);
                    const p = prices.colorido; // Colored price (Colorido)
                    return p >= min && p < max;
                }).map(item => item.id);

                if (matchedIds.length === 0) {
                    return NextResponse.json({ items: [], total: 0 });
                }
                query = query.in('id', matchedIds);
            }
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
            
            // Search matching series and studios in parallel
            const [seriesRes, studiosRes] = await Promise.all([
                supabase.from('series').select('id').ilike('nome', `%${term}%`),
                supabase.from('studios').select('id').ilike('nome', `%${term}%`)
            ]);

            const seriesIds = seriesRes.data?.map((s: any) => s.id) || [];
            const studioIds = studiosRes.data?.map((st: any) => st.id) || [];

            let orConditions = [
                `nome.ilike.%${term}%`,
                `sinonimos.ilike.%${term}%`
            ];

            if (seriesIds.length > 0) {
                orConditions.push(`serie_id.in.(${seriesIds.join(',')})`);
            }
            if (studioIds.length > 0) {
                orConditions.push(`studio_id.in.(${studioIds.join(',')})`);
            }

            query = query.or(orConditions.join(','));
        }

        if (isCampanhaActive) {
            query = query.eq('figuras_meta.is_campanha', true);
        }

        // --- Sorting ---
        const sortType = filters.sort || (filters.novidades === 'true' ? 'newest' : 'name_asc');
        
        let mappedSort = sortType;
        if (filters.priceRange) {
            if (sortType === 'name_asc') {
                mappedSort = 'price_asc';
            } else if (sortType === 'name_desc') {
                mappedSort = 'price_desc';
            }
        }
        
        const isPriceSort = mappedSort === 'price_asc' || mappedSort === 'price_desc';

        if (sortType === 'newest') {
            query = query.order('id', { ascending: false });
        } else if (sortType === 'name_desc') {
            query = query.order('nome', { ascending: false });
        } else if (!isPriceSort) {
            query = query.order('nome', { ascending: true });
        }

        const limit = parseInt(filters.limit || '20'); 
        const page = parseInt(queryParams.page as string || '0');
        const from = page * limit;
        const to = from + limit - 1;

        if (!isPriceSort) {
            query = query.range(from, to);
        }

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
                tem_pintura_real: item.tem_pintura_real || false,
                slug: item.slug || null,
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
                is_campanha: meta?.is_campanha || false,
                is_campanha_active: meta?.is_campanha_active || false,
                desconto_campanha: meta?.desconto_campanha || 0,
                preco_fixo_campanha: meta?.preco_fixo_campanha || 0,
                is_merchant: studioData?.merchant ?? false
            };
        });

        // In-memory sorting for price
        if (isPriceSort) {
            items.sort((a, b) => {
                const priceA = a.precos?.colorido ?? 0;
                const priceB = b.precos?.colorido ?? 0;
                if (mappedSort === 'price_asc') {
                    return priceA - priceB;
                } else {
                    return priceB - priceA;
                }
            });
        }

        const totalItemsCount = isPriceSort ? items.length : (count || 0);
        const paginatedItems = isPriceSort ? items.slice(from, from + limit) : items;
        const nextPage = isPriceSort
            ? (from + paginatedItems.length < totalItemsCount ? page + 1 : undefined)
            : (items.length === limit ? page + 1 : undefined);

        return NextResponse.json({ 
            items: paginatedItems, 
            nextCursor: nextPage,
            total: totalItemsCount
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
