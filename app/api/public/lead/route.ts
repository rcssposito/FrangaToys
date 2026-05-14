import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramAlert } from '@/lib/telegram';

export async function POST(req: NextRequest) {
    try {
        const { nome, contato, itemsCount, total } = await req.json();

        if (!nome || !contato) return NextResponse.json({ ok: true });

        await sendTelegramAlert(
            `👀 *LEAD NO CARRINHO!*\n\n` +
            `👤 *Nome:* ${nome}\n` +
            `📱 *WhatsApp:* ${contato}\n` +
            `🛒 *Itens:* ${itemsCount}\n` +
            `💰 *Valor Estimado:* R$ ${Number(total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
            `O cliente preencheu os dados, mas ainda não finalizou a compra.\n\n` +
            `🔗 [Ver no Kanban Administrativo](${process.env.NEXT_PUBLIC_SITE_URL || 'https://frangatoys.com.br'}/admin/kanban)`
        );

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ ok: true }); // Silencioso
    }
}
