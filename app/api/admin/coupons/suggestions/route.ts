import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        // 1. Top 5 Personagens / Figuras mais vistos
        const { data: topFiguresData, error: figError } = await supabase
            .from('figuras')
            .select('id, nome, views, imagem_url, series(nome)')
            .gt('views', 0)
            .order('views', { ascending: false })
            .limit(5);

        if (figError) throw figError;

        const topFigures = (topFiguresData || []).map((f: any) => ({
            id: f.id,
            nome: f.nome,
            views: f.views || 0,
            imagem_url: f.imagem_url,
            serie: Array.isArray(f.series) ? f.series[0]?.nome : f.series?.nome || null
        }));

        const totalTop5Views = topFigures.reduce((acc, curr) => acc + curr.views, 0);

        // 2. Série mais vista (agrupada por figuras)
        const { data: allFiguresWithSeries, error: seriesFigError } = await supabase
            .from('figuras')
            .select('id, views, serie_id, series(id, nome)')
            .gt('views', 0)
            .not('serie_id', 'is', null);

        if (seriesFigError) throw seriesFigError;

        const seriesViewsMap: Record<number, { id: number; nome: string; totalViews: number; figureCount: number }> = {};
        (allFiguresWithSeries || []).forEach((f: any) => {
            const sId = f.serie_id;
            const sName = Array.isArray(f.series) ? f.series[0]?.nome : f.series?.nome;
            if (!sId || !sName) return;

            if (!seriesViewsMap[sId]) {
                seriesViewsMap[sId] = { id: sId, nome: sName, totalViews: 0, figureCount: 0 };
            }
            seriesViewsMap[sId].totalViews += (f.views || 0);
            seriesViewsMap[sId].figureCount += 1;
        });

        const sortedSeries = Object.values(seriesViewsMap).sort((a, b) => b.totalViews - a.totalViews);
        const topSerie = sortedSeries[0] || null;

        // 3. Estúdio mais visto (agrupado por figuras)
        const { data: allFiguresWithStudio, error: studioFigError } = await supabase
            .from('figuras')
            .select('id, views, studio_id, studios(id, nome)')
            .gt('views', 0)
            .not('studio_id', 'is', null);

        if (studioFigError) throw studioFigError;

        const studioViewsMap: Record<number, { id: number; nome: string; totalViews: number; figureIds: number[] }> = {};
        (allFiguresWithStudio || []).forEach((f: any) => {
            const stId = f.studio_id;
            const stName = Array.isArray(f.studios) ? f.studios[0]?.nome : f.studios?.nome;
            if (!stId || !stName) return;

            if (!studioViewsMap[stId]) {
                studioViewsMap[stId] = { id: stId, nome: stName, totalViews: 0, figureIds: [] };
            }
            studioViewsMap[stId].totalViews += (f.views || 0);
            studioViewsMap[stId].figureIds.push(f.id);
        });

        const sortedStudios = Object.values(studioViewsMap).sort((a, b) => b.totalViews - a.totalViews);
        const topStudio = sortedStudios[0] || null;

        // Gerar sugestões estruturadas prontas para uso no front
        const suggestions = {
            topFiguresCombo: topFigures.length > 0 ? {
                titulo: 'Franga Picks: Favoritos do Público',
                descricao: `Curadoria especial com as 5 figuras mais desejadas da loja (${totalTop5Views} acessos). A seleção de ouro da Franga!`,
                codigoSugerido: 'FRANGAPICKS15',
                tipo: 'porcentagem' as const,
                valorSugerido: 15,
                figurasPermitidas: topFigures.map(f => f.id),
                figuras: topFigures,
                totalViews: totalTop5Views,
                badge: 'Franga Picks ⭐'
            } : null,

            topSeriesPromo: topSerie ? {
                titulo: `Especial Série ${topSerie.nome}`,
                descricao: `A série ${topSerie.nome} lidera o catálogo com ${topSerie.totalViews} acessos em ${topSerie.figureCount} figuras.`,
                codigoSugerido: `${topSerie.nome.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}10`,
                tipo: 'porcentagem' as const,
                valorSugerido: 10,
                serieId: topSerie.id,
                serieNome: topSerie.nome,
                totalViews: topSerie.totalViews,
                badge: 'Série Favorita'
            } : null,

            topStudioPromo: topStudio ? {
                titulo: `Semana do Estúdio ${topStudio.nome}`,
                descricao: `Modelos do estúdio ${topStudio.nome} acumulam ${topStudio.totalViews} acessos.`,
                codigoSugerido: `${topStudio.nome.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}12`,
                tipo: 'porcentagem' as const,
                valorSugerido: 12,
                figurasPermitidas: topStudio.figureIds.slice(0, 20),
                studioId: topStudio.id,
                studioNome: topStudio.nome,
                totalViews: topStudio.totalViews,
                badge: 'Estúdio Mais Desejado'
            } : null
        };

        return NextResponse.json(suggestions);
    } catch (error: any) {
        console.error('Erro ao buscar sugestões de cupons:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
