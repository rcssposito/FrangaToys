import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export interface SlugMismatchItem {
    id: number;
    figureName: string;
    categoria: string;
    serie: string;
    currentSlug: string;
    proposedSlug: string;
    isVersionMismatch: boolean;
    nameVersion?: string | null;
    slugVersion?: string | null;
    isLegacyFormat: boolean;
    isNameMismatch: boolean;
}

function generateCleanSlug(text: string): string {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// GET: Analisa descasamentos de slugs no banco de dados
export async function GET(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const requestedCategory = searchParams.get('category') || 'ALL';

        // Carrega figuras com categoria e série
        let allFigures: any[] = [];
        let from = 0;
        const step = 1000;

        while (true) {
            let query = supabase
                .from('figuras')
                .select(`
                    id,
                    nome,
                    slug,
                    disponivel,
                    series (
                        nome,
                        categorias (
                            nome
                        )
                    )
                `)
                .order('id', { ascending: true })
                .range(from, from + step - 1);

            const { data, error } = await query;
            if (error) throw error;
            if (!data || data.length === 0) break;

            allFigures.push(...data);
            if (data.length < step) break;
            from += step;
        }

        // Filtra por categoria se solicitada
        if (requestedCategory !== 'ALL') {
            allFigures = allFigures.filter(f => {
                const series = Array.isArray(f.series) ? f.series[0] : f.series;
                const catObj = series?.categorias;
                const catName = Array.isArray(catObj) ? catObj[0]?.nome : catObj?.nome;
                return (catName || 'Random').toLowerCase() === requestedCategory.toLowerCase();
            });
        }

        // Mapa para garantir unicidade dos slugs propostos
        const existingSlugs = new Set<string>();
        // Pré-popula slugs de figuras que não estão sendo alteradas
        allFigures.forEach(f => {
            if (f.slug) existingSlugs.add(f.slug.toLowerCase());
        });

        const mismatches: SlugMismatchItem[] = [];

        for (const f of allFigures) {
            const figureName = f.nome || '';
            const currentSlug = f.slug || '';
            const cleanExpected = generateCleanSlug(figureName);

            const vName = figureName.match(/v(\d+)\b/i)?.[1] || null;
            const vSlug = currentSlug.match(/v(\d+)\b/i)?.[1] || null;
            const isVersionMismatch = Boolean(vName && vSlug && vName !== vSlug);

            const isLegacyFormat = currentSlug.includes('---') || /[A-Z]/.test(currentSlug) || /\s/.test(currentSlug);
            const isNameMismatch = currentSlug !== cleanExpected;
            const isMissing = !currentSlug || currentSlug.trim() === '';

            if (isVersionMismatch || isLegacyFormat || isNameMismatch || isMissing) {
                // Calcula proposedSlug garantindo unicidade
                let candidateSlug = cleanExpected;
                let counter = 1;
                while (existingSlugs.has(candidateSlug) && candidateSlug !== currentSlug) {
                    candidateSlug = `${cleanExpected}-${counter}`;
                    counter++;
                }

                const series = Array.isArray(f.series) ? f.series[0] : f.series;
                const catObj = series?.categorias;
                const categoria = (Array.isArray(catObj) ? catObj[0]?.nome : catObj?.nome) || 'Outros';
                const serie = series?.nome || 'Sem Série';

                mismatches.push({
                    id: f.id,
                    figureName,
                    categoria,
                    serie,
                    currentSlug,
                    proposedSlug: candidateSlug,
                    isVersionMismatch,
                    nameVersion: vName,
                    slugVersion: vSlug,
                    isLegacyFormat,
                    isNameMismatch
                });
            }
        }

        return NextResponse.json({
            category: requestedCategory,
            totalRowsScanned: allFigures.length,
            totalMismatches: mismatches.length,
            mismatches
        });

    } catch (err: any) {
        console.error('[SyncSlugs GET Error]:', err);
        return NextResponse.json({ error: err.message || 'Erro ao analisar slugs' }, { status: 500 });
    }
}

// POST: Aplica a sincronização de slugs no Supabase
export async function POST(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { items } = body as { items: { id: number; figureName: string; proposedSlug: string }[] };

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Nenhum slug informado para sincronização' }, { status: 400 });
        }

        const results = [];

        for (const item of items) {
            let success = false;
            let error = '';

            try {
                // Verifica se já existe outra figura com esse mesmo slug
                let targetSlug = item.proposedSlug;
                const { data: collision } = await supabase
                    .from('figuras')
                    .select('id')
                    .eq('slug', targetSlug)
                    .neq('id', item.id)
                    .maybeSingle();

                if (collision) {
                    targetSlug = `${targetSlug}-${item.id}`;
                }

                const { error: updateErr } = await supabase
                    .from('figuras')
                    .update({ slug: targetSlug })
                    .eq('id', item.id);

                if (updateErr) {
                    throw updateErr;
                }

                success = true;
            } catch (err: any) {
                error = err.message || 'Erro ao atualizar slug no banco';
            }

            results.push({
                id: item.id,
                figureName: item.figureName,
                proposedSlug: item.proposedSlug,
                success,
                error: error || undefined
            });
        }

        const successCount = results.filter(r => r.success).length;

        return NextResponse.json({
            message: `${successCount} de ${items.length} slugs sincronizados com sucesso!`,
            results
        });

    } catch (err: any) {
        console.error('[SyncSlugs POST Error]:', err);
        return NextResponse.json({ error: err.message || 'Erro ao sincronizar slugs' }, { status: 500 });
    }
}

