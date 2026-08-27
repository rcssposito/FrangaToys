import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { sendTelegramAlert, generatePaymentConfirmSecret } from '@/lib/telegram';

// In-memory cache de último aviso por checkout_id para evitar spam em 5 minutos
const lastNotificationMap = new Map<string, number>();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { checkout_id, action = 'copy' } = body;

        if (!checkout_id || typeof checkout_id !== 'string') {
            return NextResponse.json({ error: 'checkout_id é obrigatório' }, { status: 400 });
        }

        // Evita chamadas repetidas da mesma ação num intervalo de 10 segundos
        const cacheKey = `${checkout_id}:${action}`;
        const now = Date.now();
        const lastSent = lastNotificationMap.get(cacheKey) || 0;
        if (now - lastSent < 10000) {
            return NextResponse.json({ success: true, cached: true });
        }

        // Buscar vendas no Supabase usando query segura por UUID ou integer
        const isNumeric = /^\d+$/.test(checkout_id);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(checkout_id);

        let query = supabase.from('vendas').select(`
            *,
            figuras ( nome )
        `);

        if (isUuid) {
            query = query.eq('checkout_id', checkout_id);
        } else if (isNumeric) {
            query = query.or(`checkout_id.eq.${checkout_id},id.eq.${checkout_id}`);
        } else {
            query = query.eq('checkout_id', checkout_id);
        }

        const { data: sales, error } = await query;

        if (error || !sales || sales.length === 0) {
            console.error('Erro ou vendas não encontradas em notify-pix-copied:', error);
            return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
        }

        const firstSale = sales[0];

        // Se já foi pago ou cancelado, não notifica
        if (firstSale.status_pagamento === 'Pago' || firstSale.status === 'Concluída' || firstSale.status === 'Cancelada') {
            return NextResponse.json({ success: true, already_paid: true });
        }

        lastNotificationMap.set(cacheKey, now);

        const totalFinal = sales.reduce((acc, s) => acc + (Number(s.valor_venda_final) || 0), 0) + (Number(firstSale.valor_frete) || 0);
        const pagoParcial = Number(firstSale.valor_pago_parcial) || 0;
        const remaining = Math.max(0, totalFinal - pagoParcial);

        const figureNames = sales.map(s => {
            const fig = Array.isArray(s.figuras) ? s.figuras[0] : s.figuras;
            return `${s.quantidade || 1}x ${fig?.nome || 'Figura'}`;
        }).join(', ');

        const secret = generatePaymentConfirmSecret(checkout_id);
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://frangatoys.com.br';
        const confirmUrl = `${siteUrl}/api/public/orders/confirm-pix-direct?checkout_id=${encodeURIComponent(checkout_id)}&secret=${secret}`;

        const headerTitle = action === 'copy'
            ? `📋 *CLIENTE COPIOU A CHAVE PIX!*`
            : `👁️ *CLIENTE VISUALIZOU A TELA PIX!*`;

        const msg = `${headerTitle}\n\n` +
            `👤 *Cliente:* ${firstSale.cliente_nome}\n` +
            `📱 *WhatsApp:* ${firstSale.cliente_contato || 'Não informado'}\n` +
            `📦 *Itens:* ${figureNames}\n` +
            `💰 *Valor a Pagar:* R$ ${remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
            `🆔 *Checkout:* \`${checkout_id}\`\n\n` +
            `⚡ _O cliente ${action === 'copy' ? 'copiou a chave Pix de pagamento' : 'está com a tela do QR Code aberta'}. Quando a notificação do banco apitar, clique no botão abaixo para dar baixa no Kanban:_`;

        const reply_markup = {
            inline_keyboard: [
                [
                    {
                        text: `✅ Confirmar Pagamento (R$ ${remaining.toFixed(2)})`,
                        url: confirmUrl
                    }
                ]
            ]
        };

        await sendTelegramAlert(msg, reply_markup);

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('Erro na notificação de cópia Pix:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
