import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// APLICAR PROMOÇÃO EM MASSA POR ESTÚDIO
export async function PUT(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing', 'sales', 'orcamento']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { studioId, discount } = body;

        if (studioId === undefined || discount === undefined) {
            return NextResponse.json({ error: 'Parâmetros studioId e discount são obrigatórios.' }, { status: 400 });
        }

        const disc = Number(discount);
        if (isNaN(disc) || disc < 0 || disc > 100) {
            return NextResponse.json({ error: 'Porcentagem de desconto inválida.' }, { status: 400 });
        }

        // 1. Buscar todas as figuras do estúdio
        const { data: figures, error: figError } = await supabase
            .from('figuras')
            .select('id')
            .eq('studio_id', Number(studioId));

        if (figError) throw figError;

        if (!figures || figures.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'Nenhuma figura encontrada para este estúdio.' });
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

// REMOVER PROMOÇÃO EM MASSA POR ESTÚDIO
export async function DELETE(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing', 'sales', 'orcamento']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const studioId = searchParams.get('studioId');

        if (!studioId) {
            return NextResponse.json({ error: 'Parâmetro studioId é obrigatório.' }, { status: 400 });
        }

        // 1. Buscar todas as figuras do estúdio
        const { data: figures, error: figError } = await supabase
            .from('figuras')
            .select('id')
            .eq('studio_id', Number(studioId));

        if (figError) throw figError;

        if (!figures || figures.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'Nenhuma figura encontrada para este estúdio.' });
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
