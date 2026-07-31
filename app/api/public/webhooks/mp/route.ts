import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { sendTelegramAlert } from '@/lib/telegram';
import { emitirNFe } from '@/lib/nfe';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const searchParams = req.nextUrl.searchParams;

        // Mercado Pago pode enviar ID no body (data.id, id, resource) ou na query string (?id=... ou ?data.id=...)
        const action = body.action || searchParams.get('action');
        const type = body.type || searchParams.get('type') || searchParams.get('topic');
        const paymentId = 
            body.data?.id || 
            body.id || 
            searchParams.get('data.id') || 
            searchParams.get('id') || 
            (body.resource ? body.resource.split('/').pop() : null);

        // Se a notificação for de tipo diferente de pagamento, respondemos 200 e encerramos
        if (type && type !== 'payment' && !action?.includes('payment')) {
            return NextResponse.json({ received: true });
        }

        if (!paymentId) {
            return NextResponse.json({ received: true });
        }

        // Validação de assinatura HMAC do Mercado Pago (se o segredo estiver no .env)
        const secret = process.env.MP_WEBHOOK_SECRET;
        const xSignature = req.headers.get('x-signature');
        const xRequestId = req.headers.get('x-request-id');

        if (secret && xSignature && xRequestId && paymentId) {
            try {
                const parts = xSignature.split(',');
                let ts = '';
                let v1 = '';
                for (const part of parts) {
                    const [key, val] = part.split('=').map(s => s.trim());
                    if (key === 'ts') ts = val;
                    if (key === 'v1') v1 = val;
                }

                if (ts && v1) {
                    const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
                    const computedHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
                    if (computedHash !== v1) {
                        console.warn('[MP Webhook] Assinatura x-signature não confere (mas prosseguindo para busca via API oficial).');
                    }
                }
            } catch (sigErr) {
                console.error('[MP Webhook] Erro ao verificar x-signature:', sigErr);
            }
        }

        const accessToken = process.env.MP_ACCESS_TOKEN;
        if (!accessToken) {
            console.error('[MP Webhook] MP_ACCESS_TOKEN missing in environment variables');
            return NextResponse.json({ error: 'MP Token missing' }, { status: 200 });
        }

        const client = new MercadoPagoConfig({ accessToken });
        const payment = new Payment(client);

        // 1. Buscar detalhes do pagamento no Mercado Pago
        const paymentInfo = await payment.get({ id: paymentId });
        const checkout_id = paymentInfo.external_reference;

        if (!checkout_id) {
            console.warn(`[MP Webhook] Pagamento ${paymentId} sem external_reference (checkout_id).`);
            return NextResponse.json({ received: true });
        }

        if (paymentInfo.status === 'approved') {
            // 2. Atualizar todas as vendas vinculadas a este checkout no Supabase
            const { data: updatedSales, error } = await supabase
                .from('vendas')
                .update({ 
                    status_pagamento: 'Pago',
                    status: 'Fila de Impressão'
                })
                .eq('checkout_id', checkout_id)
                .select('cliente_nome, valor_venda_final, valor_frete');

            if (error) {
                console.error('[MP Webhook] Erro ao atualizar venda via Webhook:', error);
            } else if (updatedSales && updatedSales.length > 0) {
                const total = updatedSales.reduce((acc, s) => acc + (s.valor_venda_final || 0), 0) + (updatedSales[0].valor_frete || 0);
                const nome = updatedSales[0].cliente_nome;

                await sendTelegramAlert(
                    `✅ *PAGAMENTO APROVADO VIA MERCADO PAGO!*\n\n` +
                    `👤 *Cliente:* ${nome}\n` +
                    `💰 *Valor Recebido:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                    `🆔 *Checkout:* \`${checkout_id}\`\n\n` +
                    `O pagamento foi marcado como *Pago* e o pedido enviado para a *Fila de Impressão* no seu Kanban.`
                );

                // 4. Emitir Nota Fiscal Eletrônica (NF-e)
                try {
                    await emitirNFe(checkout_id);
                } catch (nfeErr) {
                    console.error('[MP Webhook] Erro ao acionar emissão de NF-e:', nfeErr);
                }
            }
        } else if (paymentInfo.status === 'rejected' || paymentInfo.status === 'cancelled') {
            const { data: sales } = await supabase
                .from('vendas')
                .select('cliente_nome, valor_venda_final')
                .eq('checkout_id', checkout_id);

            const nome = sales?.[0]?.cliente_nome || 'Cliente';
            const statusTexto = paymentInfo.status === 'rejected' ? 'Recusado' : 'Cancelado';

            await sendTelegramAlert(
                `⚠️ *PAGAMENTO ${statusTexto.toUpperCase()} VIA MERCADO PAGO*\n\n` +
                `👤 *Cliente:* ${nome}\n` +
                `🆔 *Checkout:* \`${checkout_id}\`\n` +
                `Motivo: _${paymentInfo.status_detail || 'Não especificado'}_`
            );
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('[MP Webhook] Exception Error:', error);
        // Retornamos 200 para o MP não ficar tentando reenviar em loop infinitamente
        return NextResponse.json({ error: error.message }, { status: 200 });
    }
}
