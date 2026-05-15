import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { createMPPreference } from '@/lib/mp';
import { randomUUID } from 'crypto';
import { sendTelegramAlert } from '@/lib/telegram';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            items, // Array de { id, nome, quantity, finish, price }
            cliente_nome,
            cliente_contato,
            metodo_entrega, // 'retirada' ou 'envio'
            valor_frete,
            metodo_pagamento, // 'pix' ou 'card'
            vendedor_id, // Opcional
            observacoes
        } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 });
        }

        if (!cliente_nome || !cliente_contato) {
            return NextResponse.json({ error: 'Dados do cliente incompletos' }, { status: 400 });
        }

        // --- AUTO-CRM ---
        let cliente_id: string | null = null;
        const sanitizedPhone = cliente_contato.replace(/\D/g, '');
        
        const { data: existing } = await supabase
            .from('clientes')
            .select('id')
            .eq('telefone', sanitizedPhone)
            .maybeSingle();
        
        if (existing) {
            cliente_id = existing.id;
        } else {
            const { data: novo, error: clientError } = await supabase
                .from('clientes')
                .insert([{ 
                    id: randomUUID(), // Garante UUID válido
                    nome: cliente_nome, 
                    telefone: sanitizedPhone 
                }])
                .select('id')
                .maybeSingle();
            
            if (clientError) console.error('Erro ao criar cliente:', clientError);
            if (novo) cliente_id = novo.id;
        }

        // --- PRICING PARAMS ---
        const { data: settings } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

        if (!settings) throw new Error('Falha ao obter parâmetros de precificação do servidor');

        // --- PREPARE ORDER ---
        const checkout_id = `CHK_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;
        const access_token = randomUUID(); // UUID obrigatório para a coluna access_token
        
        const salesToInsert = [];

        for (const item of items) {
            const { data: meta } = await supabase
                .from('figuras_meta')
                .select('*')
                .eq('figura_id', item.id)
                .maybeSingle();

            const metaData = meta || {};
            
            // Remover da campanha para evitar venda duplicada com desconto, mas mantê-la na vitrine (e mantendo os preços para histórico na tela de esgotado)
            if (metaData.is_campanha_active) {
                await supabase.from('figuras_meta').update({ 
                    is_campanha_active: false
                }).eq('figura_id', item.id);
            }

            // Snapshot calculation (Logic from admin/sales)
            const custo_resina_raw = (metaData.resina_kg || 0) * (settings.custo_resina_kg || 0.15);
            const custo_impressao_raw = (metaData.horas_impressao || 0) * (settings.custo_h_impressao || 0.5);
            const custo_unitario_real = Math.ceil(custo_resina_raw + custo_impressao_raw);
            const custo_total_real = custo_unitario_real * item.quantity;

            const lucro_real = item.price - custo_total_real;

            salesToInsert.push({
                figura_id: Number(item.id), // Garante que é integer
                cliente_nome,
                cliente_contato,
                canal_venda: 'Vitrine Web',
                vendedor: vendedor_id ? String(vendedor_id) : null,
                valor_venda_final: item.price,
                valor_frete: salesToInsert.length === 0 ? (Number(valor_frete) || 0) : 0,
                custo_producao_snapshot: custo_total_real,
                lucro_real,
                status: 'Aguardando Pagamento',
                quantidade: item.quantity,
                observacao: `[Acabamento: ${item.finish}] ${observacoes || ''}`,
                checkout_id,
                access_token,
                cliente_id,
                metodo_entrega,
                data_venda: new Date().toISOString()
            });
        }

        // 3. Inserir vendas
        const { data: insertedData, error: insertError } = await supabase
            .from('vendas')
            .insert(salesToInsert)
            .select();

        if (insertError) {
            console.error('Erro ao inserir vendas:', insertError);
            throw new Error(`Erro ao registrar pedido no banco: ${insertError.message}`);
        }

        // --- PAYMENT INTEGRATION ---
        let payment_url = null;
        let preference_id = null;

        if (metodo_pagamento === 'card') {
            const mpItems = items.map(i => ({
                id: String(i.id),
                title: `${i.nome} [${i.finish}]`,
                quantity: i.quantity,
                unit_price: Number((i.price / i.quantity).toFixed(2))
            }));

            if (Number(valor_frete) > 0) {
                mpItems.push({
                    id: 'shipping',
                    title: 'Frete / Envio',
                    quantity: 1,
                    unit_price: Number(Number(valor_frete).toFixed(2))
                });
            }

            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://frangatoys.com.br';
            
            try {
                const preference = await createMPPreference({
                    items: mpItems,
                    customerName: cliente_nome,
                    externalReference: checkout_id,
                    backUrl: `${siteUrl}/checkout/success?token=${access_token}`
                });

                payment_url = preference.init_point;
                preference_id = preference.id;

                // Update sales with preference ID
                await supabase
                    .from('vendas')
                    .update({ link_pagamento: preference_id })
                    .eq('checkout_id', checkout_id);
            } catch (mpErr) {
                console.error('MP Error:', mpErr);
                // Não falha o checkout se o MP cair, mas o usuário saberá no retorno
            }
        }

        // --- TELEGRAM ALERT ---
        const totalVenda = items.reduce((acc, i) => acc + (i.price || 0), 0) + (Number(valor_frete) || 0);
        const itemSummary = items.map(i => `• ${i.quantity}x ${i.nome} (${i.finish})`).join('\n');
        
        const telegramMsg = `🛒 *NOVO PEDIDO GERADO!*\n` +
            `_(Aguardando Pagamento)_\n\n` +
            `👤 *Cliente:* ${cliente_nome}\n` +
            `📱 *WhatsApp:* ${cliente_contato}\n` +
            `💰 *Valor Total:* R$ ${totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
            `💳 *Pagamento:* ${metodo_pagamento.toUpperCase()}\n` +
            `🚚 *Entrega:* ${metodo_entrega === 'retirada' ? 'Retirada no Ateliê' : 'Envio via Frete'}\n\n` +
            `📦 *Itens:*\n${itemSummary}\n\n` +
            `🔗 [Ver no Kanban Administrativo](${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/kanban)`;

        try {
            await sendTelegramAlert(telegramMsg);
        } catch (e) {
            console.error('Telegram background alert failed:', e);
        }

        return NextResponse.json({
            success: true,
            checkout_id,
            access_token,
            payment_url,
            metodo_pagamento
        });

    } catch (error: any) {
        console.error('Checkout API Error:', error);
        return NextResponse.json({ error: error.message || 'Erro ao processar pedido' }, { status: 500 });
    }
}
