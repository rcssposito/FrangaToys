import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { sendTelegramAlert } from '@/lib/telegram';
import { emitirNFe } from '@/lib/nfe';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, data } = body;

        // O Mercado Pago envia várias notificações, nos interessa apenas o pagamento
        if (action === 'payment.created' || action === 'payment.updated' || body.type === 'payment') {
            const paymentId = data?.id || body.data?.id || body.resource?.split('/').pop();

            if (!paymentId) return NextResponse.json({ received: true });

            const accessToken = process.env.MP_ACCESS_TOKEN;
            const mpToken = process.env.MELHORENVIO_TOKEN || process.env.Franga;
            if (!accessToken) throw new Error('MP Token missing');

            const client = new MercadoPagoConfig({ accessToken });
            const payment = new Payment(client);

            // 1. Buscar detalhes do pagamento no Mercado Pago
            const paymentInfo = await payment.get({ id: paymentId });

            if (paymentInfo.status === 'approved') {
                const checkout_id = paymentInfo.external_reference;

                if (checkout_id) {
                    // 2. Atualizar todas as vendas vinculadas a este checkout no Supabase
                    const { data: updatedSales, error } = await supabase
                        .from('vendas')
                        .update({ status: 'Pago' })
                        .eq('checkout_id', checkout_id)
                        .select('cliente_nome, valor_venda_final, valor_frete');

                    if (error) {
                        console.error('Erro ao atualizar venda via Webhook:', error);
                    } else if (updatedSales && updatedSales.length > 0) {
                        // 3. Notificar no Telegram
                        const total = updatedSales.reduce((acc, s) => acc + (s.valor_venda_final || 0), 0) + (updatedSales[0].valor_frete || 0);
                        const nome = updatedSales[0].cliente_nome;

                        await sendTelegramAlert(
                            `✅ *PAGAMENTO APROVADO!*\n\n` +
                            `👤 *Cliente:* ${nome}\n` +
                            `💰 *Valor Recebido:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                            `🆔 *Checkout:* \`${checkout_id}\`\n\n` +
                            `O status foi atualizado para *Pago* no seu Kanban.`
                        );

                        // 4. Emitir Nota Fiscal Eletrônica (NF-e)
                        try {
                            await emitirNFe(checkout_id);
                        } catch (nfeErr) {
                            console.error('Erro ao acionar emissão de NF-e:', nfeErr);
                        }
                    }
                }
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Webhook MP Error:', error);
        // Retornamos 200 para o MP não ficar tentando reenviar em loop se for um erro de lógica nosso
        return NextResponse.json({ error: error.message }, { status: 200 });
    }
}
