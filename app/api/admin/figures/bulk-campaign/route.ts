import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const TIMER_CODE = '__CAMPANHA_TIMER__';
const PAGE_SIZE = 1000;

/**
 * Busca TODOS os IDs de figuras sem cair no limite de 1000 linhas do PostgREST/Supabase.
 */
async function fetchAllFigureIds(filters?: {
    disponivelOnly?: boolean;
    serieId?: number;
    studioId?: number;
}): Promise<number[]> {
    let allIds: number[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
        let q = supabase
            .from('figuras')
            .select('id')
            .order('id', { ascending: true })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (filters?.disponivelOnly) {
            q = q.eq('disponivel', true);
        }
        if (filters?.serieId !== undefined) {
            q = q.eq('serie_id', filters.serieId);
        }
        if (filters?.studioId !== undefined) {
            q = q.eq('studio_id', filters.studioId);
        }

        const { data, error } = await q;
        if (error) throw error;

        if (data && data.length > 0) {
            allIds.push(...data.map((r: any) => r.id));
            if (data.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                page++;
            }
        } else {
            hasMore = false;
        }
    }

    return allIds;
}

/**
 * Busca TODOS os figura_id de figuras_meta que satisfazem uma condição OR de campanha,
 * paginando de 1000 em 1000 para superar o limite padrão do Supabase.
 */
async function fetchAllCampaignMetaIds(orFilter: string): Promise<number[]> {
    let allIds: number[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('figuras_meta')
            .select('figura_id')
            .or(orFilter)
            .order('figura_id', { ascending: true })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
            allIds.push(...data.map((r: any) => r.figura_id));
            if (data.length < PAGE_SIZE) {
                hasMore = false;
            } else {
                page++;
            }
        } else {
            hasMore = false;
        }
    }

    return allIds;
}

/**
 * Atualiza figuras_meta em lotes seguros de 500 IDs por vez,
 * criando o registro em figuras_meta caso alguma figura ainda não possua linha.
 */
async function updateMetaInBatches(
    figureIds: number[],
    payload: Record<string, any>,
    ensureMissingRows = false
): Promise<number> {
    const batchSize = 500;
    let updatedCount = 0;

    for (let i = 0; i < figureIds.length; i += batchSize) {
        const chunk = figureIds.slice(i, i + batchSize);
        const { data: updatedRows, error } = await supabase
            .from('figuras_meta')
            .update(payload)
            .in('figura_id', chunk)
            .select('figura_id');

        if (error) throw error;

        if (ensureMissingRows) {
            const existingSet = new Set((updatedRows || []).map((r: any) => Number(r.figura_id)));
            const missingIds = chunk.filter((id) => !existingSet.has(Number(id)));

            if (missingIds.length > 0) {
                const rowsToInsert = missingIds.map((figura_id) => ({
                    figura_id,
                    ...payload,
                }));
                const { error: insertErr } = await supabase
                    .from('figuras_meta')
                    .insert(rowsToInsert);
                if (insertErr) throw insertErr;
            }
        }

        updatedCount += chunk.length;
    }

    return updatedCount;
}

async function getOrExpireCampaignTimer(): Promise<string | null> {
    const { data } = await supabase
        .from('cupoms_desconto')
        .select('id, data_validade')
        .eq('codigo', TIMER_CODE)
        .maybeSingle();

    if (!data?.data_validade) return null;

    const endDate = new Date(data.data_validade);
    if (isNaN(endDate.getTime())) return null;

    if (endDate.getTime() <= Date.now()) {
        // Expirou! Pausa todas as promoções ativas e limpa o timer
        await Promise.all([
            supabase
                .from('figuras_meta')
                .update({ is_campanha_active: false })
                .eq('is_campanha_active', true),
            supabase
                .from('cupoms_desconto')
                .update({ data_validade: null })
                .eq('codigo', TIMER_CODE)
        ]);
        return null;
    }

    return data.data_validade;
}

async function setCampaignTimer(campaignEndAt: string | null) {
    const { data: existing, error: selectErr } = await supabase
        .from('cupoms_desconto')
        .select('id')
        .eq('codigo', TIMER_CODE)
        .maybeSingle();

    if (selectErr) throw selectErr;

    if (existing) {
        const { error: updateErr } = await supabase
            .from('cupoms_desconto')
            .update({ data_validade: campaignEndAt || null, ativo: false })
            .eq('id', existing.id);
        if (updateErr) throw updateErr;
    } else if (campaignEndAt) {
        const { error: insertErr } = await supabase
            .from('cupoms_desconto')
            .insert([{
                codigo: TIMER_CODE,
                tipo: 'porcentagem',
                valor: 1,
                usos_restantes: 0,
                data_validade: campaignEndAt,
                ativo: false
            }]);
        if (insertErr) throw insertErr;
    }
}

// LER TIMER DA CAMPANHA
export async function GET() {
    try {
        const campaignEndAt = await getOrExpireCampaignTimer();
        return NextResponse.json({ campaignEndAt });
    } catch (error: any) {
        return NextResponse.json({ campaignEndAt: null, error: error.message }, { status: 500 });
    }
}

// APLICAR PROMOÇÃO EM MASSA (ESTÚDIO, SÉRIE, SELEÇÃO, TIMER OU LOJA TODA)
export async function PUT(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing', 'sales']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { studioId, serieId, figureIds, applyAll, action, discount, campaignEndAt } = body;

        // Ação de Configurar / Limpar Timer da Campanha
        if (action === 'set-timer') {
            await setCampaignTimer(campaignEndAt || null);
            return NextResponse.json({
                success: true,
                campaignEndAt: campaignEndAt || null,
                message: campaignEndAt
                    ? 'Timer de encerramento da promoção configurado!'
                    : 'Timer de promoção removido.'
            });
        }

        // Ações de Pausar / Retomar tudo sem zerar os descontos (sem limite de 1000 linhas)
        if (action === 'pause-all') {
            const targetIds = await fetchAllCampaignMetaIds('is_campanha.eq.true,is_campanha_active.eq.true,desconto_campanha.gt.0,preco_fixo_campanha.gt.0');
            const [updatedCount] = await Promise.all([
                updateMetaInBatches(targetIds, { is_campanha_active: false }),
                setCampaignTimer(null)
            ]);

            return NextResponse.json({
                success: true,
                count: updatedCount,
                message: `Todas as ${updatedCount} promoções foram pausadas.`
            });
        }

        if (action === 'resume-all') {
            const targetIds = await fetchAllCampaignMetaIds('is_campanha.eq.true,desconto_campanha.gt.0,preco_fixo_campanha.gt.0');
            const updatedCount = await updateMetaInBatches(targetIds, {
                is_campanha_active: true,
                is_campanha: true
            });

            return NextResponse.json({
                success: true,
                count: updatedCount,
                message: `Todas as ${updatedCount} promoções foram reativadas.`
            });
        }

        // Validação de desconto (Modo Black Friday força 30% em tudo sem exceção)
        const disc = applyAll ? 30 : Number(discount);
        if (!applyAll && (discount === undefined || isNaN(disc) || disc < 0 || disc > 100)) {
            return NextResponse.json({ error: 'Porcentagem de desconto inválida (0 a 100).' }, { status: 400 });
        }

        let targetFigureIds: number[] = [];

        if (applyAll) {
            // Modo Black Friday: TODAS as figuras da loja sem exceção (ativas, inativas, qualquer estúdio)
            targetFigureIds = await fetchAllFigureIds();
        } else if (Array.isArray(figureIds) && figureIds.length > 0) {
            // Aplicar em figuras selecionadas
            targetFigureIds = figureIds.map(Number).filter(id => !isNaN(id));
        } else if (serieId !== undefined && serieId !== '') {
            targetFigureIds = await fetchAllFigureIds({ serieId: Number(serieId) });
        } else if (studioId !== undefined && studioId !== '') {
            targetFigureIds = await fetchAllFigureIds({ studioId: Number(studioId) });
        } else {
            return NextResponse.json({ 
                error: 'Informe studioId, serieId, figureIds ou applyAll: true.' 
            }, { status: 400 });
        }

        if (targetFigureIds.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'Nenhuma figura elegível encontrada.' });
        }

        const updatedCount = await updateMetaInBatches(
            targetFigureIds,
            {
                is_campanha: true,
                is_campanha_active: true,
                desconto_campanha: disc,
                preco_fixo_campanha: 0
            },
            true
        );

        return NextResponse.json({ success: true, count: updatedCount });
    } catch (error: any) {
        console.error('Error applying bulk campaign discount:', error);
        return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
    }
}

// REMOVER PROMOÇÃO EM MASSA (ESTÚDIO, SÉRIE, SELEÇÃO OU LOJA TODA)
export async function DELETE(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing', 'sales']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const studioId = searchParams.get('studioId');
        const serieId = searchParams.get('serieId');
        const clearAll = searchParams.get('clearAll') === 'true' || searchParams.get('all') === 'true';

        // Suporte a remoção por corpo JSON para passar figureIds
        let figureIds: number[] | null = null;
        try {
            const contentType = req.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const body = await req.json();
                if (Array.isArray(body.figureIds)) {
                    figureIds = body.figureIds;
                }
            }
        } catch {
            // Sem corpo json, continua com searchParams
        }

        // 1. ZERAR TUDO (KILL-SWITCH GERAL / RESET DE BLACK FRIDAY - Sem limite de 1000)
        if (clearAll) {
            const targetIds = await fetchAllCampaignMetaIds('is_campanha.eq.true,is_campanha_active.eq.true,desconto_campanha.gt.0,preco_fixo_campanha.gt.0');
            const [updatedCount] = await Promise.all([
                updateMetaInBatches(targetIds, {
                    is_campanha: false,
                    is_campanha_active: false,
                    desconto_campanha: 0,
                    preco_fixo_campanha: 0
                }),
                setCampaignTimer(null)
            ]);

            return NextResponse.json({ 
                success: true, 
                count: updatedCount,
                message: 'Todas as promoções e descontos foram removidos com sucesso!' 
            });
        }

        // 2. Por lista de IDs específicos
        if (figureIds && figureIds.length > 0) {
            const updatedCount = await updateMetaInBatches(figureIds, {
                is_campanha: false,
                is_campanha_active: false,
                desconto_campanha: 0,
                preco_fixo_campanha: 0
            });

            return NextResponse.json({ success: true, count: updatedCount });
        }

        // 3. Por Estúdio ou Série
        if (!studioId && !serieId) {
            return NextResponse.json({ 
                error: 'Parâmetro studioId, serieId ou clearAll=true é obrigatório.' 
            }, { status: 400 });
        }

        const ids = await fetchAllFigureIds({
            ...(serieId ? { serieId: Number(serieId) } : {}),
            ...(studioId ? { studioId: Number(studioId) } : {}),
        });

        if (ids.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'Nenhuma figura encontrada.' });
        }

        const updatedCount = await updateMetaInBatches(ids, {
            is_campanha: false,
            is_campanha_active: false,
            desconto_campanha: 0,
            preco_fixo_campanha: 0
        });

        return NextResponse.json({ success: true, count: updatedCount });
    } catch (error: any) {
        console.error('Error removing bulk campaign discount:', error);
        return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
    }
}
