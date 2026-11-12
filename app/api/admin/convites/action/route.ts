import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateVipToken } from '@/lib/gatekeeper';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, action } = body;

        if (!id || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
        }

        if (action === 'approve') {
            const token = generateVipToken();
            const expiraEm = new Date();
            expiraEm.setDate(expiraEm.getDate() + 60);

            const { error } = await supabaseAdmin
                .from('solicitacoes_acesso')
                .update({
                    status: 'aprovado',
                    token_vip: token,
                    token_expira_em: expiraEm.toISOString(),
                    aprovado_em: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
            return NextResponse.json({ ok: true, token });
        }

        if (action === 'reject') {
            const { error } = await supabaseAdmin
                .from('solicitacoes_acesso')
                .update({
                    status: 'recusado',
                    recusado_em: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });

    } catch (err: any) {
        console.error('Erro ao processar ação de convite:', err);
        return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
    }
}

