import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const TIMER_CODE = '__CAMPANHA_TIMER__';

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

        // Ações de Pausar / Retomar tudo sem zerar os descontos
        if (action === 'pause-all') {
            const [{ data, error }] = await Promise.all([
                supabase
                    .from('figuras_meta')
                    .update({ is_campanha_active: false })
                    .or('is_campanha.eq.true,desconto_campanha.gt.0,preco_fixo_campanha.gt.0')
                    .select('figura_id'),
                setCampaignTimer(null)
            ]);

            if (error) throw error;
            return NextResponse.json({ success: true, count: data?.length || 0, message: 'Todas as promoções foram pausadas.' });
        }

        if (action === 'resume-all') {
            const { data, error } = await supabase
                .from('figuras_meta')
                .update({ is_campanha_active: true, is_campanha: true })
                .or('desconto_campanha.gt.0,preco_fixo_campanha.gt.0')
                .select('figura_id');

            if (error) throw error;
            return NextResponse.json({ success: true, count: data?.length || 0, message: 'Todas as promoções foram reativadas.' });
        }

        // Validação de desconto
        if (discount === undefined) {
            return NextResponse.json({ error: 'Parâmetro discount é obrigatório.' }, { status: 400 });
        }

        const disc = Number(discount);
        if (isNaN(disc) || disc < 0 || disc > 100) {
            return NextResponse.json({ error: 'Porcentagem de desconto inválida (0 a 100).' }, { status: 400 });
        }

        let targetFigureIds: number[] = [];

        if (applyAll) {
            // Aplicar na loja toda (todas as figuras disponíveis)
            const { data: figures, error: figError } = await supabase
                .from('figuras')
                .select('id')
                .eq('disponivel', true);

            if (figError) throw figError;
            targetFigureIds = (figures || []).map(f => f.id);
        } else if (Array.isArray(figureIds) && figureIds.length > 0) {
            // Aplicar em figuras selecionadas
            targetFigureIds = figureIds.map(Number).filter(id => !isNaN(id));
        } else if (serieId !== undefined && serieId !== '') {
            const { data: figures, error: figError } = await supabase
                .from('figuras')
                .select('id')
                .eq('serie_id', Number(serieId));

            if (figError) throw figError;
            targetFigureIds = (figures || []).map(f => f.id);
        } else if (studioId !== undefined && studioId !== '') {
            const { data: figures, error: figError } = await supabase
                .from('figuras')
                .select('id')
                .eq('studio_id', Number(studioId));

            if (figError) throw figError;
            targetFigureIds = (figures || []).map(f => f.id);
        } else {
            return NextResponse.json({ 
                error: 'Informe studioId, serieId, figureIds ou applyAll: true.' 
            }, { status: 400 });
        }

        if (targetFigureIds.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'Nenhuma figura elegível encontrada.' });
        }

        // Atualizar figuras_meta em massa em batches de 500 para segurança
        const batchSize = 500;
        let updatedCount = 0;

        for (let i = 0; i < targetFigureIds.length; i += batchSize) {
            const chunk = targetFigureIds.slice(i, i + batchSize);
            const { error: metaError } = await supabase
                .from('figuras_meta')
                .update({
                    is_campanha: true,
                    is_campanha_active: true,
                    desconto_campanha: disc
                })
                .in('figura_id', chunk);

            if (metaError) throw metaError;
            updatedCount += chunk.length;
        }

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

        // 1. ZERAR TUDO (KILL-SWITCH GERAL / RESET DE BLACK FRIDAY)
        if (clearAll) {
            const [{ data, error }] = await Promise.all([
                supabase
                    .from('figuras_meta')
                    .update({
                        is_campanha: false,
                        is_campanha_active: false,
                        desconto_campanha: 0,
                        preco_fixo_campanha: 0
                    })
                    .or('is_campanha.eq.true,is_campanha_active.eq.true,desconto_campanha.gt.0,preco_fixo_campanha.gt.0')
                    .select('figura_id'),
                setCampaignTimer(null)
            ]);

            if (error) throw error;
            return NextResponse.json({ 
                success: true, 
                count: data?.length || 0,
                message: 'Todas as promoções e descontos foram removidos com sucesso!' 
            });
        }

        // 2. Por lista de IDs específicos
        if (figureIds && figureIds.length > 0) {
            const { data, error } = await supabase
                .from('figuras_meta')
                .update({
                    is_campanha: false,
                    is_campanha_active: false,
                    desconto_campanha: 0,
                    preco_fixo_campanha: 0
                })
                .in('figura_id', figureIds)
                .select('figura_id');

            if (error) throw error;
            return NextResponse.json({ success: true, count: data?.length || 0 });
        }

        // 3. Por Estúdio ou Série
        if (!studioId && !serieId) {
            return NextResponse.json({ 
                error: 'Parâmetro studioId, serieId ou clearAll=true é obrigatório.' 
            }, { status: 400 });
        }

        let query = supabase.from('figuras').select('id');
        if (serieId) {
            query = query.eq('serie_id', Number(serieId));
        } else if (studioId) {
            query = query.eq('studio_id', Number(studioId));
        }

        const { data: figures, error: figError } = await query;
        if (figError) throw figError;

        if (!figures || figures.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'Nenhuma figura encontrada.' });
        }

        const ids = figures.map(f => f.id);

        const { error: metaError } = await supabase
            .from('figuras_meta')
            .update({
                is_campanha: false,
                is_campanha_active: false,
                desconto_campanha: 0,
                preco_fixo_campanha: 0
            })
            .in('figura_id', ids);

        if (metaError) throw metaError;

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error: any) {
        console.error('Error removing bulk campaign discount:', error);
        return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
    }
}
