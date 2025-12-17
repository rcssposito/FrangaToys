
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { FiltersSchema, FiguraDTO } from '@/lib/dto';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const queryParams = Object.fromEntries(searchParams.entries());

        // Validate Input
        const filters = FiltersSchema.parse(queryParams);

        // 3. Category Logic (Database-side filtering)
        const shouldFilterCategory = filters.categoria && filters.categoria !== 'Todos' && filters.categoria !== 'all';

        // Construct select string dynamically based on whether we filter or not
        // Filtering requires inner join (series:series!inner) AND (categorias:categorias!inner)
        const seriesJoin = shouldFilterCategory ? 'series:series!inner' : 'series:series';
        const categoryJoin = shouldFilterCategory ? 'categorias:categorias!inner' : 'categorias:categorias';

        let query = supabase
            .from('figuras')
            .select(`
id,
    nome,
    imagem_url,
    disponivel,
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
    nome
),
    figuras_meta(
        altura_cm,
        largura_cm,
        profundidade_cm
    )
        `);

        // --- Filters ---

        // 1. Availability
        if (filters.incluirNaoVendaveis !== 'true') {
            query = query.is('disponivel', true);
        }

        // 2. Studios
        if (filters.studioIds) {
            const ids = filters.studioIds.split(',').map(Number).filter(n => !isNaN(n));
            if (ids.length > 0) {
                query = query.in('studio_id', ids);
            }
        }

        // 3. Category
        if (shouldFilterCategory) {
            // Filter by the deep nested column via !inner joins
            query = query.eq('series.categorias.nome', filters.categoria);
        }

        // 4. Search (q)
        if (filters.q) {
            const term = filters.q;
            query = query.ilike('nome', `%${term}%`);
        }

        // 5. Sorting
        if (filters.novidades === 'true') {
            query = query.order('id', { ascending: false });
        } else {
            query = query.order('nome', { ascending: true });
        }

        // 6. Pagination
        const limit = parseInt(filters.limit || '20'); // Lower default limit for smoother loading
        const page = parseInt(queryParams.page as string || '0');
        const from = page * limit;
        const to = from + limit - 1;

        query = query.range(from, to);

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        // Transform to DTO
        let items = data.map((item: any) => {
            const meta = Array.isArray(item.figuras_meta) ? item.figuras_meta[0] : item.figuras_meta;
            return {
                id: item.id,
                nome: item.nome,
                imagem_url: item.imagem_url,
                disponivel: item.disponivel,
                studio_id: item.studio_id,
                serie_id: item.serie_id,
                serie: item.series?.nome || null,
                categoria: item.series?.categorias?.nome || null,
                studio: item.studios?.nome || null,
                altura_cm: meta?.altura_cm || null,
                largura_cm: meta?.largura_cm || null,
                profundidade_cm: meta?.profundidade_cm || null,
            };
        });

        // Manual filtering for Deep relations (Category) is handled by DB via !inner joins

        // Next Cursor Logic
        // Ideally we check if we got 'limit' items. If so, there might be next page.
        // A better way is checking count, but raw count with RLS/Filters is tricky.
        // Simple heuristic: if returned items.length === limit, assume next page exists.
        const nextPage = items.length === limit ? page + 1 : undefined;

        return NextResponse.json({ items, nextCursor: nextPage }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });

    } catch (err: any) {
        console.error("API Error:", err);
        return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
    }
}
