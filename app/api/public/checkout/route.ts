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
            observacoes,
            cupom_codigo // Opcional
        } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 });
        }

        if (!cliente_nome || !cliente_contato) {
            return NextResponse.json({ error: 'Dados do cliente incompletos' }, { status: 400 });
        }

        // --- FETCH METADATA AND FIGURES FOR ALL ITEMS UPFRONT ---
        const itemIds = items.map(i => Number(i.id));
        const { data: metas } = await supabase.from('figuras_meta').select('*').in('figura_id', itemIds);
        const metaMap = new Map();
        if (metas) metas.forEach(m => metaMap.set(m.figura_id, m));

        const { data: figurasDb } = await supabase.from('figuras').select('id, serie_id').in('id', itemIds);
        const figureMap = new Map();
        if (figurasDb) figurasDb.forEach(f => figureMap.set(f.id, f));

        // --- VALIDATE COUPON ---
        let cupom_ativo: any = null;
        if (cupom_codigo) {
            const upperCodigo = cupom_codigo.trim().toUpperCase();
            const { data: cupom } = await supabase
                .from('cupoms_desconto')
                .select('*, series(nome)')
                .eq('codigo', upperCodigo)
                .maybeSingle();
            
            if (cupom && cupom.ativo && (cupom.usos_restantes === null || cupom.usos_restantes > 0)) {
                if (!cupom.data_validade || new Date(cupom.data_validade) >= new Date()) {
                    cupom_ativo = cupom;
                }
            }
            if (!cupom_ativo) {
                return NextResponse.json({ error: 'Cupom inválido, expirado ou inativo' }, { status: 400 });
            }

            // Series restriction validation
            if (cupom_ativo.serie_id) {
                const requiredSerieId = cupom_ativo.serie_id;
                const requiredSerieNome = cupom_ativo.series?.nome || 'série selecionada';

                // Check if any items belong to the series
                const itemsInSeries = items.filter(item => {
                    const fig = figureMap.get(Number(item.id));
                    return fig && fig.serie_id === requiredSerieId;
                });

                if (itemsInSeries.length === 0) {
                    return NextResponse.json({ 
                        error: `Este cupom é válido apenas para produtos da série ${requiredSerieNome}.` 
                    }, { status: 400 });
                }

                // Check if all items in the series are in active campaigns
                const eligibleItemsInSeries = itemsInSeries.filter(item => {
                    const meta = metaMap.get(Number(item.id)) || {};
                    return !meta.is_campanha_active;
                });

                if (eligibleItemsInSeries.length === 0) {
                    return NextResponse.json({ 
                        error: `Os produtos da série ${requiredSerieNome} no carrinho já estão em promoção e não aceitam cupom.` 
                    }, { status: 400 });
                }
            }
        }

        // --- CALCULATE ELIGIBLE DISCOUNT ---
        let totalElegivel = 0;
        let totalBruto = 0;
        for (const item of items) {
            const itemTotalPrice = item.price * item.quantity;
            totalBruto += itemTotalPrice;
            
            const meta = metaMap.get(Number(item.id)) || {};
            const isCampanha = meta.is_campanha_active;
            
            const fig = figureMap.get(Number(item.id)) || {};
            const isSerieEligible = !cupom_ativo || !cupom_ativo.serie_id || fig.serie_id === cupom_ativo.serie_id;

            if (!isCampanha && isSerieEligible) {
                totalElegivel += itemTotalPrice;
            }
        }

        if (cupom_ativo && totalElegivel === 0) {
            return NextResponse.json({ 
                error: 'Nenhum produto no carrinho é elegível para este cupom (produtos em promoção não aceitam cupom).' 
            }, { status: 400 });
        }

        let descontoTotal = 0;
        if (cupom_ativo && totalElegivel > 0) {
            // Regra do Valor Mínimo
            if (!cupom_ativo.valor_minimo || totalElegivel >= Number(cupom_ativo.valor_minimo)) {
                if (cupom_ativo.tipo === 'porcentagem') {
                    descontoTotal = totalElegivel * (Number(cupom_ativo.valor) / 100);
                    // Teto de desconto
                    if (cupom_ativo.desconto_maximo) {
                        descontoTotal = Math.min(descontoTotal, Number(cupom_ativo.desconto_maximo));
                    }
                } else {
                    descontoTotal = Math.min(Number(cupom_ativo.valor), totalElegivel);
                }
            } else {
                return NextResponse.json({ error: `Este cupom exige compras acima de R$ ${Number(cupom_ativo.valor_minimo).toFixed(2)} em produtos elegíveis.` }, { status: 400 });
            }
        }

        // --- AUTO-CRM ---
        let cliente_id: string | null = null;
        let final_cliente_nome = cliente_nome;
        const sanitizedPhone = cliente_contato.replace(/\D/g, '');
        
        const { data: existing } = await supabase
            .from('clientes')
            .select('id, nome')
            .eq('telefone', sanitizedPhone)
            .maybeSingle();
        
        if (existing) {
            cliente_id = existing.id;
            if (existing.nome) final_cliente_nome = existing.nome;
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
        let valorTotalFinalVenda = 0;

        for (const item of items) {
            const metaData = metaMap.get(Number(item.id)) || {};
            
            // Remover da campanha para evitar venda duplicada com desconto, mas mantê-la na vitrine
            if (metaData.is_campanha_active) {
                await supabase.from('figuras_meta').update({ 
                    is_campanha_active: false
                }).eq('figura_id', Number(item.id));
            }

            // Snapshot calculation (Logic from admin/sales)
            const custo_resina_raw = (metaData.resina_kg || 0) * (settings.custo_resina_kg || 0.15);
            const custo_impressao_raw = (metaData.horas_impressao || 0) * (settings.custo_h_impressao || 0.5);
            const custo_unitario_real = Math.ceil(custo_resina_raw + custo_impressao_raw);
            const custo_total_real = custo_unitario_real * item.quantity;

            // Apply Discount for this specific item row
            let itemTotalPrice = item.price * item.quantity;
            let itemDesconto = 0;
            const isCampanha = metaData.is_campanha_active;

            const fig = figureMap.get(Number(item.id)) || {};
            const isSerieEligible = !cupom_ativo || !cupom_ativo.serie_id || fig.serie_id === cupom_ativo.serie_id;

            if (cupom_ativo && !isCampanha && isSerieEligible && totalElegivel > 0) {
                const proporcao = itemTotalPrice / totalElegivel;
                itemDesconto = descontoTotal * proporcao;
            }

            const valorFinalComDesconto = itemTotalPrice - itemDesconto;
            const lucro_real = valorFinalComDesconto - custo_total_real;
            
            valorTotalFinalVenda += valorFinalComDesconto;

            let observacaoFinal = `[Acabamento: ${item.finish}] ${observacoes || ''}`;
            if (itemDesconto > 0) {
                observacaoFinal += ` (Desconto Cupom ${cupom_ativo.codigo}: -R$ ${itemDesconto.toFixed(2)})`;
            }

            salesToInsert.push({
                figura_id: Number(item.id),
                cliente_nome: final_cliente_nome,
                cliente_contato,
                canal_venda: 'Vitrine Web',
                vendedor: vendedor_id ? String(vendedor_id) : null,
                valor_venda_final: valorFinalComDesconto,
                valor_frete: salesToInsert.length === 0 ? (Number(valor_frete) || 0) : 0,
                custo_producao_snapshot: custo_total_real,
                lucro_real,
                status: 'Aguardando Pagamento',
                quantidade: item.quantity,
                observacao: observacaoFinal.trim(),
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

        // Decrement coupon uses
        if (cupom_ativo && cupom_ativo.usos_restantes !== null) {
            await supabase.from('cupoms_desconto')
                .update({ usos_restantes: cupom_ativo.usos_restantes - 1 })
                .eq('id', cupom_ativo.id);
        }

        // --- PAYMENT INTEGRATION ---
        let payment_url = null;
        let preference_id = null;

        if (metodo_pagamento === 'card') {
            const mpItems = items.map(i => {
                const metaData = metaMap.get(Number(i.id)) || {};
                const isCampanha = metaData.is_campanha_active;
                let itemTotalPrice = i.price * i.quantity;
                let itemDesconto = 0;
                
                const fig = figureMap.get(Number(i.id)) || {};
                const isSerieEligible = !cupom_ativo || !cupom_ativo.serie_id || fig.serie_id === cupom_ativo.serie_id;

                if (cupom_ativo && !isCampanha && isSerieEligible && totalElegivel > 0) {
                    const proporcao = itemTotalPrice / totalElegivel;
                    itemDesconto = descontoTotal * proporcao;
                }

                const finalItemTotalPrice = itemTotalPrice - itemDesconto;
                const unitPrice = finalItemTotalPrice / i.quantity;

                return {
                    id: String(i.id),
                    title: `${i.nome} [${i.finish}]`,
                    quantity: i.quantity,
                    unit_price: Number(unitPrice.toFixed(2))
                };
            });

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
        const totalVendaComFrete = valorTotalFinalVenda + (Number(valor_frete) || 0);
        const itemSummary = items.map(i => `• ${i.quantity}x ${i.nome} (${i.finish})`).join('\n');
        
        let telegramMsg = `🛒 *NOVO PEDIDO GERADO!*\n` +
            `_(Aguardando Pagamento)_\n\n` +
            `👤 *Cliente:* ${cliente_nome}\n` +
            `📱 *WhatsApp:* ${cliente_contato}\n`;
            
        if (descontoTotal > 0) {
            telegramMsg += `🏷️ *Cupom Aplicado:* ${cupom_ativo.codigo} (-R$ ${descontoTotal.toFixed(2)})\n`;
        }
            
        telegramMsg += `💰 *Valor Total:* R$ ${totalVendaComFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
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
