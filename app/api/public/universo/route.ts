import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Cores temáticas vibrantes para categorias
const CATEGORY_COLORS: Record<string, string> = {
    'anime': '#ec4899',       // Rosa choque / Magenta
    'manga': '#ec4899',
    'herois': '#ef4444',      // Vermelho
    'marvel': '#ef4444',
    'dc': '#06b6d4',          // Ciano
    'games': '#10b981',       // Esmeralda neon
    'jogos': '#10b981',
    'cinema': '#f59e0b',      // Âmbar
    'filmes': '#f59e0b',
    'series': '#8b5cf6',      // Roxo
    'geek': '#6366f1',        // Índigo
    'default': '#a855f7'      // Roxo padrão
};

function getCategoryColor(name: string): string {
    const lower = (name || '').toLowerCase();
    for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
        if (lower.includes(key)) return color;
    }
    return CATEGORY_COLORS.default;
}

export async function GET() {
    try {
        // 1. Buscar categorias cadastradas
        const { data: categorias, error: catErr } = await supabase
            .from('categorias')
            .select('id, nome')
            .order('nome');

        if (catErr) throw catErr;

        // 2. Buscar estúdios cadastrados
        const { data: studios, error: stuErr } = await supabase
            .from('studios')
            .select('id, nome, logo_url')
            .order('nome');

        if (stuErr) throw stuErr;

        // 3. Buscar séries cadastradas
        const { data: seriesList, error: serErr } = await supabase
            .from('series')
            .select('id, nome, categoria_id')
            .order('nome');

        if (serErr) throw serErr;

        // 4. Buscar todas as figuras do catálogo contornando a limitação de 1.000 linhas via paginação
        let allFiguresSummary: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data: batch, error: batchErr } = await supabase
                .from('figuras')
                .select(`
                    id,
                    nome,
                    imagem_url,
                    studio_id,
                    serie_id,
                    disponivel,
                    series:series (
                        categoria_id
                    )
                `)
                .eq('disponivel', true)
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (batchErr) throw batchErr;

            if (batch && batch.length > 0) {
                allFiguresSummary = allFiguresSummary.concat(batch);
                if (batch.length < pageSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                hasMore = false;
            }
        }

        // Mapear contadores de categorias, estúdios e séries
        const categoryCounts = new Map<number, number>();
        const studioCounts = new Map<number, number>();
        const serieCounts = new Map<number, number>();

        // Mapas de relacionamento
        const studioCategoriesMap = new Map<number, Set<number>>();
        const serieStudiosMap = new Map<number, Set<number>>();

        allFiguresSummary.forEach(fig => {
            const serieData = Array.isArray(fig.series) ? fig.series[0] : fig.series;
            const catId = serieData?.categoria_id;
            const stuId = fig.studio_id;
            const serId = fig.serie_id;

            if (catId) {
                categoryCounts.set(catId, (categoryCounts.get(catId) || 0) + 1);
            }
            if (stuId) {
                studioCounts.set(stuId, (studioCounts.get(stuId) || 0) + 1);
                if (catId) {
                    if (!studioCategoriesMap.has(stuId)) {
                        studioCategoriesMap.set(stuId, new Set<number>());
                    }
                    studioCategoriesMap.get(stuId)!.add(catId);
                }
            }
            if (serId) {
                serieCounts.set(serId, (serieCounts.get(serId) || 0) + 1);
                if (stuId) {
                    if (!serieStudiosMap.has(serId)) {
                        serieStudiosMap.set(serId, new Set<number>());
                    }
                    serieStudiosMap.get(serId)!.add(stuId);
                }
            }
        });

        // Montar nós e links
        const nodes: any[] = [];
        const links: any[] = [];

        // 1. NÓ CENTRAL: Franga Toys (Sol)
        const rootId = 'franga-toys-core';
        nodes.push({
            id: rootId,
            type: 'root',
            name: 'Franga Toys',
            subtitle: 'Centro Galáctico',
            color: '#f97316',
            size: 38,
            pulse: true
        });

        // 2. ÓRBITA 1: Categorias ao redor da Franga (em cores temáticas diferentes)
        let animeCatId: number | null = null;

        (categorias || []).forEach(cat => {
            const count = categoryCounts.get(cat.id) || 0;
            if (count === 0) return;

            if (cat.nome.toLowerCase() === 'anime') {
                animeCatId = cat.id;
            }

            const catNodeId = `cat-${cat.id}`;
            const color = getCategoryColor(cat.nome);

            nodes.push({
                id: catNodeId,
                type: 'category',
                name: cat.nome,
                color,
                size: 26,
                itemCount: count,
                orbitRing: 1
            });

            // Conexão direta com a Franga Toys (órbita primária)
            links.push({
                source: rootId,
                target: catNodeId,
                type: 'root-category',
                distance: 145
            });
        });

        // 3. ÓRBITA 2: Estúdios depois das categorias como discos menores (16 estúdios modeladores)
        (studios || []).forEach(st => {
            const count = studioCounts.get(st.id) || 0;
            if (count === 0) return; // Apenas estúdios ativos
            if (st.id === 0 || (st.nome || '').toLowerCase().trim() === 'custom') return; // Custom não é estúdio modelador

            const studioNodeId = `studio-${st.id}`;
            const linkedCats = studioCategoriesMap.get(st.id);

            nodes.push({
                id: studioNodeId,
                type: 'studio',
                name: st.nome,
                logoUrl: st.logo_url,
                color: '#38bdf8', // Azul celeste / Ciano neon
                size: 15,          // Discos menores que as categorias
                itemCount: count,
                orbitRing: 2
            });

            // Se o estúdio tem peças em categorias conhecidas, conecta às categorias onde atua
            if (linkedCats && linkedCats.size > 0) {
                linkedCats.forEach(catId => {
                    const catNodeId = `cat-${catId}`;
                    links.push({
                        source: catNodeId,
                        target: studioNodeId,
                        type: 'category-studio',
                        distance: 120
                    });
                });
            } else {
                links.push({
                    source: rootId,
                    target: studioNodeId,
                    type: 'root-studio',
                    distance: 265
                });
            }
        });

        // 4. ÓRBITA 3 (MICRO-ÓRBITAS): Séries de TODAS as categorias ativas
        (categorias || []).forEach(cat => {
            const catSeries = (seriesList || []).filter(s => s.categoria_id === cat.id);
            const baseColor = getCategoryColor(cat.nome);
            const isLargeCategory = cat.nome.toLowerCase().includes('anime') || cat.nome.toLowerCase().includes('game');

            catSeries.forEach(ser => {
                const count = serieCounts.get(ser.id) || 0;
                if (count === 0) return; // Apenas séries com figuras ativas

                let lane: 1 | 2 | 3 = 1;
                let nodeSize = 10;

                if (isLargeCategory) {
                    // Para grandes categorias (Anime e Games): 3 Lanes
                    // Lane 1: >= 10 peças
                    // Lane 2: 5 a 9 peças
                    // Lane 3: 1 a 4 peças
                    if (count >= 10) {
                        lane = 1;
                        nodeSize = 14;
                    } else if (count >= 5) {
                        lane = 2;
                        nodeSize = 9;
                    } else {
                        lane = 3;
                        nodeSize = 6.5;
                    }
                } else {
                    // Para categorias compactas (Marvel, DC, Random): lane única
                    lane = 1;
                    nodeSize = count >= 4 ? 12 : 9;
                }

                const serieNodeId = `serie-${ser.id}`;

                nodes.push({
                    id: serieNodeId,
                    type: 'serie',
                    name: ser.nome,
                    categoryId: `cat-${cat.id}`,
                    categoryName: cat.nome,
                    lane,
                    color: baseColor,
                    size: nodeSize,
                    itemCount: count,
                    orbitRing: 3
                });

                // Link da Categoria para a Série
                links.push({
                    source: `cat-${cat.id}`,
                    target: serieNodeId,
                    type: 'category-serie',
                    distance: 220
                });

                // Conectar os estúdios que modelam figuras dessa série
                const linkedStudios = serieStudiosMap.get(ser.id);
                if (linkedStudios && linkedStudios.size > 0) {
                    linkedStudios.forEach(stuId => {
                        const studioNodeId = `studio-${stuId}`;
                        links.push({
                            source: studioNodeId,
                            target: serieNodeId,
                            type: 'studio-serie'
                        });
                    });
                }
            });
        });

        // 5. ÓRBITA 4: Figuras de TODAS as categorias agrupadas nas suas Lanes Cósmicas
        const seriesMap = new Map<string, any>();
        nodes.filter(n => n.type === 'serie').forEach(s => seriesMap.set(s.id, s));

        const getCategoryFigureColor = (catName?: string) => {
            const lower = (catName || '').toLowerCase();
            if (lower.includes('anime')) return '#f472b6';      // Rosa neon / Sakura
            if (lower.includes('game') || lower.includes('jogo')) return '#34d399'; // Verde esmeralda neon
            if (lower.includes('marvel')) return '#f87171';     // Vermelho neon
            if (lower.includes('dc')) return '#38bdf8';         // Azul ciano neon
            return '#c084fc';                                   // Violeta neon (Cinema / Geek / Random)
        };

        const studiosMap = new Map<number, string>();
        (studios || []).forEach(st => studiosMap.set(st.id, st.nome));

        allFiguresSummary.forEach(fig => {
            const serieNode = seriesMap.get(`serie-${fig.serie_id}`);
            if (!serieNode) return;

            const figNodeId = `fig-${fig.id}`;
            const figLane = serieNode.lane || 1;
            const figColor = getCategoryFigureColor(serieNode.categoryName);
            const studioName = fig.studio_id ? studiosMap.get(fig.studio_id) : undefined;

            nodes.push({
                id: figNodeId,
                type: 'figure',
                name: fig.nome,
                imageUrl: fig.imagem_url,
                serieId: serieNode.id,
                serieName: serieNode.name,
                studioId: fig.studio_id ? `studio-${fig.studio_id}` : undefined,
                studioName,
                categoryId: serieNode.categoryId,
                categoryName: serieNode.categoryName,
                lane: figLane,
                color: figColor,
                size: 3.5,
                orbitRing: 4
            });

            // Link visual da Série para a Figura
            links.push({
                source: serieNode.id,
                target: figNodeId,
                type: 'serie-figure',
                distance: 180
            });

            // Se tem estúdio vinculado, link do Estúdio para a Figura
            if (fig.studio_id) {
                links.push({
                    source: `studio-${fig.studio_id}`,
                    target: figNodeId,
                    type: 'studio-figure',
                    distance: 300
                });
            }
        });

        const allSeriesNodes = nodes.filter(n => n.type === 'serie');
        const allFigureNodes = nodes.filter(n => n.type === 'figure');

        return NextResponse.json({
            nodes,
            links,
            stats: {
                totalCatalogFigures: allFiguresSummary.length,
                totalNodes: nodes.length,
                totalCategories: nodes.filter(n => n.type === 'category').length,
                totalStudios: nodes.filter(n => n.type === 'studio').length,
                totalSeries: allSeriesNodes.length,
                totalFigures: allFigureNodes.length,
                totalAnimeFigures: allFigureNodes.filter(n => n.categoryName === 'Anime').length,
                totalGamesFigures: allFigureNodes.filter(n => (n.categoryName || '').toLowerCase().includes('game')).length,
                totalMarvelFigures: allFigureNodes.filter(n => (n.categoryName || '').toLowerCase().includes('marvel')).length,
                totalDCFigures: allFigureNodes.filter(n => (n.categoryName || '').toLowerCase().includes('dc')).length,
                totalRandomFigures: allFigureNodes.filter(n => !['anime', 'games', 'marvel', 'dc'].some(c => (n.categoryName || '').toLowerCase().includes(c))).length,
                totalAnimeSeries: allSeriesNodes.filter(n => n.categoryName === 'Anime').length,
                totalGamesSeries: allSeriesNodes.filter(n => (n.categoryName || '').toLowerCase().includes('game')).length,
                totalMarvelSeries: allSeriesNodes.filter(n => (n.categoryName || '').toLowerCase().includes('marvel')).length,
                totalDCSeries: allSeriesNodes.filter(n => (n.categoryName || '').toLowerCase().includes('dc')).length,
                totalRandomSeries: allSeriesNodes.filter(n => !['anime', 'games', 'marvel', 'dc'].some(c => (n.categoryName || '').toLowerCase().includes(c))).length
            }
        });

    } catch (err: any) {
        console.error('Erro na API do Universo:', err);
        return NextResponse.json({ error: err.message || 'Erro ao carregar dados do universo' }, { status: 500 });
    }
}
