import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { emitirNFe } from '@/lib/nfe';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { checkout_id, sale_id, manual_key } = body;

        let finalCheckoutId = checkout_id;

        // Se foi enviado apenas o sale_id, busca o checkout_id no banco
        if (!finalCheckoutId && sale_id) {
            const { data: sale } = await supabase
                .from('vendas')
                .select('checkout_id')
                .eq('id', Number(sale_id))
                .maybeSingle();
            
            if (sale && sale.checkout_id) {
                finalCheckoutId = sale.checkout_id;
            } else {
                const dummyId = `MAN_${sale_id}`;
                await supabase
                    .from('vendas')
                    .update({ checkout_id: dummyId })
                    .eq('id', Number(sale_id));
                finalCheckoutId = dummyId;
            }
        }

        if (manual_key) {
            const cleanKey = manual_key.replace(/\D/g, '');
            if (cleanKey.length !== 44) {
                return NextResponse.json({ error: 'A chave de acesso da NF-e deve conter exatamente 44 dígitos' }, { status: 400 });
            }

            // Atualiza todas as vendas deste checkout (ou a venda específica)
            if (finalCheckoutId) {
                await supabase
                    .from('vendas')
                    .update({ chave_nfe: cleanKey })
                    .eq('checkout_id', finalCheckoutId);

                // Registrar ou atualizar registros_nfe
                const numStr = cleanKey.slice(25, 34);
                const num = parseInt(numStr, 10);
                if (!isNaN(num)) {
                    await supabase
                        .from('registros_nfe')
                        .upsert([{
                            checkout_id: finalCheckoutId,
                            numero_nfe: num,
                            chave_nfe: cleanKey,
                            status: 'autorizada'
                        }], { onConflict: 'checkout_id' });
                }
            } else if (sale_id) {
                await supabase
                    .from('vendas')
                    .update({ chave_nfe: cleanKey })
                    .eq('id', Number(sale_id));
            }

            // Alerta opcional no Telegram
            try {
                const { sendTelegramAlert } = await import('@/lib/telegram');
                await sendTelegramAlert(
                    `🧾 *[NF-e REGISTRADA MANUALMENTE]*\n\n` +
                    `✅ *Chave de Acesso vinculada com sucesso!*\n` +
                    `🔑 *Chave de Acesso:* \`${cleanKey}\``
                );
            } catch (tgErr) {
                console.error('Error sending Telegram alert for manual NFe:', tgErr);
            }

            return NextResponse.json({ success: true, message: 'Chave NF-e registrada manualmente', chave: cleanKey });
        }

        if (!finalCheckoutId) {
            return NextResponse.json({ error: 'Checkout ID não encontrado para esta venda' }, { status: 400 });
        }

        console.log(`[NF-e Manual] Iniciando emissão para o checkout: ${finalCheckoutId}`);
        const result = await emitirNFe(finalCheckoutId);

        if (result.success) {
            return NextResponse.json({ success: true, message: result.message, chave: result.chave });
        } else {
            return NextResponse.json({ error: result.message }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Manual NFe Error:', error);
        return NextResponse.json({ error: error.message || 'Erro interno na emissão' }, { status: 500 });
    }
}
