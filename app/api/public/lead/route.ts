import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendTelegramAlert } from '@/lib/telegram';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { nome, contato, itemsCount, total, items } = body;

        if (!nome || !contato) return NextResponse.json({ ok: true });

        const cleanPhone = contato.replace(/\D/g, '');
        if (cleanPhone.length >= 8) {
            // Verifica se já existe um carrinho abandonado aberto para este contato
            const { data: existing } = await supabase
                .from('carrinhos_abandonados')
                .select('id')
                .eq('cliente_contato', cleanPhone)
                .eq('status', 'abandonado')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existing) {
                await supabase
                    .from('carrinhos_abandonados')
                    .update({
                        cliente_nome: nome,
                        itens: items || [],
                        itens_count: itemsCount || 1,
                        valor_total: total || 0,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('carrinhos_abandonados')
                    .insert({
                        cliente_nome: nome,
                        cliente_contato: cleanPhone,
                        itens: items || [],
                        itens_count: itemsCount || 1,
                        valor_total: total || 0,
                        status: 'abandonado'
                    });
            }
        }

        await sendTelegramAlert(
            `👀 *LEAD NO CARRINHO!*\n\n` +
            `👤 *Nome:* ${nome}\n` +
            `📱 *WhatsApp:* ${contato}\n` +
            `🛒 *Itens:* ${itemsCount || 1}\n` +
            `💰 *Valor Estimado:* R$ ${Number(total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
            `O cliente preencheu os dados, mas ainda não finalizou a compra.\n\n` +
            `🔗 [Ver Carrinhos Abandonados no Admin](${process.env.NEXT_PUBLIC_SITE_URL || 'https://frangatoys.com.br'}/admin/abandoned-carts)`
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ ok: true }); // Silencioso
    }
}
