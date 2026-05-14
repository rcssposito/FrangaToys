
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { sendTelegramAlert } from '@/lib/telegram';

// LISTAR VENDAS (Histórico)
export async function GET() {
    try {
        const { data: sales, error } = await supabase
            .from('vendas')
            .select(`
                *,
                figuras ( 
                    nome, 
                    imagem_url,
                    studios ( nome )
                )
            `)
            .order('data_venda', { ascending: false });

        if (error) throw error;

        // Fetch display names for vendors
        const { data: users } = await supabase
            .from('admin_users')
            .select('email, nome');

        const userMap = (users || []).reduce((acc: any, u) => {
            acc[u.email.toLowerCase()] = u.nome;
            return acc;
        }, {});

        const formatted = sales.map(s => ({
            ...s,
            vendedor_nome: userMap[(s.vendedor || '').toLowerCase()] || s.vendedor || 'Ateliê'
        }));

        return NextResponse.json(formatted);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// REGISTRAR VENDA (SUPORTA CARRINHO / MÚLTIPLOS ITENS)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            carrinho, // Array de { id, nome, quantidade, valor_final, resina_kg }
            cliente_nome,
            cliente_contato,
            canal_venda,
            vendedor, // Email do usuário na sessão
            pintura_freelancer, // Booleano
            pintor_nome, // Nome ou email recebido do novo Select no Frontend
            data_venda,
            observacao,
            valor_frete,
            cliente_id, // Novo campo para CRM
            metodo_entrega // Novo campo para logística
        } = body;

        if (!carrinho || !Array.isArray(carrinho) || carrinho.length === 0) {
            throw new Error('Carrinho vazio ou inválido');
        }

        // --- MOTOR DE AUTO-CRM (POST) ---
        let final_cliente_id = cliente_id;
        if (!final_cliente_id && cliente_contato && cliente_contato.trim() !== '') {
            // 1. Tentar localizar por telefone
            const { data: existing } = await supabase
                .from('clientes')
                .select('id')
                .eq('telefone', cliente_contato)
                .maybeSingle();
            
            if (existing) {
                final_cliente_id = existing.id;
            } else if (cliente_nome) {
                // 2. Criar novo se não existir
                const { data: novo } = await supabase
                    .from('clientes')
                    .insert([{ nome: cliente_nome, telefone: cliente_contato }])
                    .select('id')
                    .single();
                if (novo) final_cliente_id = novo.id;
            }
        }

        console.log(`Registering ${carrinho.length} items for client ${cliente_nome}`);
        if (vendedor) {
            console.log(`Sale made by vendor: ${vendedor}`);
        }

        // 1. Buscar configurações globais de preço (para saber custo de resina/h_impressao atual)
        const { data: settings, error: settingsError } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        if (settingsError) throw new Error('Falha ao obter parâmetros de precificação');

        let totalResinaConsumida = 0;
        const salesToInsert = [];

        // 2. Processar cada item do carrinho para calcular lucros individuais (snapshot)
        for (const item of carrinho) {
            // Buscar metadados técnicos da figura (escala, horas, etc)
            const { data: meta, error: metaError } = await supabase
                .from('figuras_meta')
                .select('*')
                .eq('figura_id', item.id)
                .single();

            if (metaError) {
                console.error(`Error fetching meta for figure ${item.id}:`, metaError);
                continue; // Pular item se houver erro ou usar valores default
            }

            // Cálculo do custo (apenas resina + horas de impressão conforme regra de negócio)
            const custo_resina_raw = (meta.resina_kg || 0) * (settings.custo_resina_kg || 0);
            const custo_impressao_raw = (meta.horas_impressao || 0) * (settings.custo_h_impressao || 0);

            const custo_unitario_real = Math.ceil(custo_resina_raw + custo_impressao_raw);
            const custo_total_real = custo_unitario_real * item.quantidade;

            // Deduções
            let comissao_vendedor = 0;
            const OWNER_EMAIL = 'rcssposito@gmail.com';

            if (vendedor && vendedor.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
                // 15% de comissão sobre o valor final do item (apenas se não for o dono)
                comissao_vendedor = Math.round(item.valor_final * 0.15);
            }

            let custo_pintura_freelancer = 0;
            if (pintura_freelancer) {
                // Custo do freelancer = horas de pintura * R$ 50
                custo_pintura_freelancer = Math.ceil((meta.horas_pintura || 0) * 50) * item.quantidade;
            }

            // Lucro Real = Valor Final - Custos da Impressora - Custo Terceiro - Comissão
            const lucro_real = item.valor_final - custo_total_real - custo_pintura_freelancer - comissao_vendedor;

            totalResinaConsumida += (meta.resina_kg || 0) * item.quantidade;

            salesToInsert.push({
                figura_id: item.id,
                cliente_nome,
                cliente_contato,
                canal_venda,
                vendedor,
                comissao_vendedor,
                pintura_freelancer,
                pintor_nome: pintor_nome || null,
                valor_venda_final: item.valor_final,
                valor_frete: salesToInsert.length === 0 ? (Number(valor_frete) || 0) : 0, // Apenas no primeiro item para não duplicar no dashboard
                custo_producao_snapshot: custo_total_real,
                lucro_real,
                valor_pago_pintor: custo_pintura_freelancer,
                status: 'Aguardando Pagamento', 
                quantidade: item.quantidade,
                observacao: observacao || '',
                link_pagamento: body.link_pagamento || null,
                checkout_id: body.checkout_id || null,
                cliente_id: final_cliente_id || null, // Vínculo oficial (Auto-CRM)
                data_venda: data_venda || new Date().toISOString(),
                metodo_entrega: metodo_entrega || 'retirada'
            });
        }

        // 3. Inserir vendas em lote
        const { data: insertedData, error: insertError } = await supabase
            .from('vendas')
            .insert(salesToInsert)
            .select();

        if (insertError) throw insertError;
        
        // --- TELEGRAM ALERT ---
        try {
            const itemsList = carrinho.map((item: any) => `• ${item.quantidade}x ${item.nome} (R$ ${item.valor_final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`).join('\n');
            const totalVenda = carrinho.reduce((sum: number, item: any) => sum + (item.valor_final * item.quantidade), 0) + (Number(valor_frete) || 0);
            
            const telegramMsg = `🛠 *VENDA MANUAL REGISTRADA!*\n` +
                `_(Registrada via Admin)_\n\n` +
                `👤 *Cliente:* ${cliente_nome}\n` +
                `📱 *WhatsApp:* ${cliente_contato}\n` +
                `💰 *Valor Total:* R$ ${totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
                `🚚 *Entrega:* ${metodo_entrega === 'retirada' ? 'Retirada no Ateliê' : 'Envio via Frete'}\n\n` +
                `📦 *Itens:*\n${itemsList}\n\n` +
                `👤 *Vendedor:* ${vendedor || 'Admin'}\n\n` +
                `🔗 [Ver no Kanban Administrativo](${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/kanban)`;

            await sendTelegramAlert(telegramMsg);
        } catch (alertError) {
            console.error('Error preparing/sending Telegram alert:', alertError);
        }

        return NextResponse.json(insertedData);
    } catch (error: any) {
        console.error('Sales POST Batch API Crash:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ATUALIZAR VENDA (Edição Básica e Atribuição de Pintor)
export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, cliente_nome, cliente_contato, canal_venda, vendedor, status, observacao, pintura_freelancer, pintor_nome, cliente_id, metodo_entrega } = body;

        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

        // --- MOTOR DE AUTO-CRM (PATCH) ---
        let final_cliente_id = cliente_id;
        
        // Se não temos um ID mas temos o contato, tentamos vincular ou criar
        if (!final_cliente_id && cliente_contato && cliente_contato.trim() !== '') {
            // 1. Tentar localizar por telefone exato
            const { data: existing } = await supabase
                .from('clientes')
                .select('id')
                .eq('telefone', cliente_contato)
                .maybeSingle();
            
            if (existing) {
                final_cliente_id = existing.id;
            } else if (cliente_nome) {
                // 2. Criar novo se não existir
                const { data: novo } = await supabase
                    .from('clientes')
                    .insert([{ nome: cliente_nome, telefone: cliente_contato }])
                    .select('id')
                    .single();
                if (novo) final_cliente_id = novo.id;
            }
        }

        // 1. Buscar a venda atual para ter os snapshots de custo e valor original
        const { data: currentSale, error: fetchError } = await supabase
            .from('vendas')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !currentSale) throw new Error('Venda não encontrada');

        let valor_pago_pintor = currentSale.valor_pago_pintor || 0;
        let lucro_real = currentSale.lucro_real;

        // 2. Se a pintura freelancer mudou ou o pintor mudou, precisamos recalcular
        // Nota: Só recalculamos se houver mudança explícita ou se pintura_freelancer for true
        if (pintura_freelancer !== undefined || pintor_nome !== undefined) {
            const isFreelancer = pintura_freelancer !== undefined ? pintura_freelancer : currentSale.pintura_freelancer;

            if (isFreelancer) {
                // Buscar horas de pintura da figura para calcular o custo
                const { data: meta } = await supabase
                    .from('figuras_meta')
                    .select('horas_pintura')
                    .eq('figura_id', currentSale.figura_id)
                    .single();

                const horas = meta?.horas_pintura || 0;
                valor_pago_pintor = Math.ceil(horas * 50) * (currentSale.quantidade || 1);
            } else {
                valor_pago_pintor = 0;
            }

            // Recalcular Lucro Real
            // Lucro = Valor Venda - Custo Produção - Valor Pintor - Comissão Vendedor
            lucro_real = currentSale.valor_venda_final -
                (currentSale.custo_producao_snapshot || 0) -
                valor_pago_pintor -
                (currentSale.comissao_vendedor || 0);
        }

        const { data, error } = await supabase
            .from('vendas')
            .update({
                cliente_nome,
                cliente_contato,
                canal_venda,
                vendedor,
                status,
                observacao,
                pintura_freelancer,
                pintor_nome,
                valor_pago_pintor,
                lucro_real,
                cliente_id: final_cliente_id === undefined ? currentSale.cliente_id : final_cliente_id,
                metodo_entrega: metodo_entrega === undefined ? currentSale.metodo_entrega : metodo_entrega
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETAR VENDA
export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const id = body.id;

        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

        const { error } = await supabase.from('vendas').delete().eq('id', id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
