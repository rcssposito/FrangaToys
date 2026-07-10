import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { sendTelegramAlert } from '@/lib/telegram';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { nome, telefone, tipo } = body;

        if (!nome || !telefone || (tipo !== 'download' && tipo !== 'forget')) {
            return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
        }

        const { error } = await supabase
            .from('lgpd_requests')
            .insert({
                nome,
                telefone,
                tipo
            });

        if (error) throw error;

        const formattedType = tipo === 'download' ? '📇 Exportação/Acesso a Dados' : '🗑 Exclusão de Cadastro (Esquecimento)';
        const msg = `⚖️ *NOVA SOLICITAÇÃO LGPD!*\n\n` +
                    `👤 *Cliente:* ${nome}\n` +
                    `📞 *Telefone:* ${telefone}\n` +
                    `📋 *Tipo:* ${formattedType}\n\n` +
                    `_Por favor, confirme a identidade do cliente via WhatsApp e faça o tratamento adequado no painel do CRM._`;

        try {
            await sendTelegramAlert(msg);
        } catch (tgErr) {
            console.error('Failed to send Telegram alert for LGPD:', tgErr);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('LGPD request route error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
