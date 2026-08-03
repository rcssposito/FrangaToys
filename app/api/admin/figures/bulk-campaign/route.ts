import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// APLICAR PROMOÇÃO EM MASSA POR ESTÚDIO OU SÉRIE
export async function PUT(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing', 'sales']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { studioId, serieId, discount } = body;

        if (studioId === undefined && serieId === undefined) {
            return NextResponse.json({ error: 'Parâmetro studioId ou serieId é obrigatório.' }, { status: 400 });
        }
        if (discount === undefined) {
            return NextResponse.json({ error: 'Parâmetro discount é obrigatório.' }, { status: 400 });
        }

        const disc = Number(discount);
        if (isNaN(disc) || disc < 0 || disc > 100) {
            return NextResponse.json({ error: 'Porcentagem de desconto inválida.' }, { status: 400 });
        }

        // 1. Buscar todas as figuras do estúdio ou série
        let query = supabase.from('figuras').select('id');
        if (serieId !== undefined && serieId !== '') {
            query = query.eq('serie_id', Number(serieId));
        } else if (studioId !== undefined && studioId !== '') {
            query = query.eq('studio_id', Number(studioId));
        }

        const { data: figures, error: figError } = await query;

        if (figError) throw figError;

        if (!figures || figures.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'Nenhuma figura encontrada.' });
        }

        const figureIds = figures.map(f => f.id);

        // 2. Atualizar figuras_meta em massa para colocar na campanha
        const { error: metaError } = await supabase
            .from('figuras_meta')
            .update({
                is_campanha: true,
                is_campanha_active: true,
                desconto_campanha: disc
            })
            .in('figura_id', figureIds);

        if (metaError) throw metaError;

        return NextResponse.json({ success: true, count: figureIds.length });
    } catch (error: any) {
        console.error('Error applying bulk campaign discount:', error);
        return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
    }
}

// REMOVER PROMOÇÃO EM MASSA POR ESTÚDIO OU SÉRIE
export async function DELETE(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing', 'sales']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const studioId = searchParams.get('studioId');
        const serieId = searchParams.get('serieId');

        if (!studioId && !serieId) {
            return NextResponse.json({ error: 'Parâmetro studioId ou serieId é obrigatório.' }, { status: 400 });
        }

        // 1. Buscar todas as figuras do estúdio ou série
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

        const figureIds = figures.map(f => f.id);

        // 2. Atualizar figuras_meta em massa para remover da campanha e zerar valores promocionais
        const { error: metaError } = await supabase
            .from('figuras_meta')
            .update({
                is_campanha: false,
                is_campanha_active: false,
                desconto_campanha: 0,
                preco_fixo_campanha: 0
            })
            .in('figura_id', figureIds);

        if (metaError) throw metaError;

        return NextResponse.json({ success: true, count: figureIds.length });
    } catch (error: any) {
        console.error('Error removing bulk campaign discount:', error);
        return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
    }
}
