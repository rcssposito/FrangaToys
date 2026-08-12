import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { sendTelegramAlert } from '@/lib/telegram';

// LISTAR VENDAS (Histórico)
export async function GET() {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

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
            vendedor_nome: (() => {
                const name = userMap[(s.vendedor || '').toLowerCase()] || s.vendedor || 'Ateliê';
                return name.toLowerCase().includes('rodrigo') ? '@frangatoys' : name;
            })()
        }));

        return NextResponse.json(formatted);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// REGISTRAR VENDA (SUPORTA CARRINHO / MÚLTIPLOS ITENS)
export async function POST(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

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
            metodo_entrega, // Novo campo para logística
            cupom_codigo, // Novo campo para cupons
            cpf,
            cep,
            logradouro,
            numero,
            bairro,
            cidade,
            uf
        } = body;

        if (!carrinho || !Array.isArray(carrinho) || carrinho.length === 0) {
            throw new Error('Carrinho vazio ou inválido');
        }

        // --- MOTOR DE AUTO-CRM (POST) ---
        let final_cliente_id = cliente_id;
        let final_cliente_nome = cliente_nome;
        const sanitizedPhone = cliente_contato ? cliente_contato.replace(/\D/g, '') : '';

        const clientData = {
            nome: cliente_nome,
            telefone: sanitizedPhone || null,
            cpf: cpf || null,
            cep: cep || null,
            logradouro: logradouro || null,
            numero: numero || null,
            bairro: bairro || null,
            cidade: cidade || null,
            uf: uf || null
        };

        if (final_cliente_id) {
            // 1. Atualizar cliente existente se ID for enviado
            await supabase
                .from('clientes')
                .update(clientData)
                .eq('id', final_cliente_id);
        } else if (sanitizedPhone && sanitizedPhone.trim() !== '') {
            // 2. Tentar localizar por telefone
            const { data: existing } = await supabase
                .from('clientes')
                .select('id, nome')
                .eq('telefone', sanitizedPhone)
                .maybeSingle();

            if (existing) {
                final_cliente_id = existing.id;
                if (existing.nome) final_cliente_nome = existing.nome;

                await supabase
                    .from('clientes')
                    .update(clientData)
                    .eq('id', final_cliente_id);
            } else if (cliente_nome) {
                // 3. Criar novo se não existir
                const { data: novo } = await supabase
                    .from('clientes')
                    .insert([{
                        ...clientData,
                        id: crypto.randomUUID()
                    }])
                    .select('id')
                    .maybeSingle();
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

        let cupom_ativo = null;
        if (cupom_codigo) {
            const { data: cupom } = await supabase
                .from('cupoms_desconto')
                .select('*')
                .eq('codigo', cupom_codigo)
                .maybeSingle();

            if (cupom && cupom.ativo && (cupom.usos_restantes === null || cupom.usos_restantes > 0)) {
                if (!cupom.data_validade || new Date(cupom.data_validade) >= new Date()) {
                    cupom_ativo = cupom;
                }
            }
        }

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

            // Remover da campanha para evitar venda duplicada com desconto, mas mantê-la na vitrine (e mantendo os preços para histórico na tela de esgotado)
            if (meta.is_campanha_active) {
                await supabase.from('figuras_meta').update({
                    is_campanha_active: false
                }).eq('figura_id', item.id);
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
                cliente_nome: final_cliente_nome,
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

        if (cupom_ativo && cupom_ativo.usos_restantes !== null) {
            await supabase.from('cupoms_desconto')
                .update({ usos_restantes: cupom_ativo.usos_restantes - 1 })
                .eq('id', cupom_ativo.id);
        }

        // --- TELEGRAM ALERT ---
        try {
            const itemsList = carrinho.map((item: any) => {
                const totalVal = item.valor_final;
                const unitVal = totalVal / item.quantidade;
                const valFormatted = item.quantidade > 1
                    ? `R$ ${unitVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} cada - Total: R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : `R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                return `• ${item.quantidade}x ${item.nome} (${valFormatted})`;
            }).join('\n');
            const totalVenda = carrinho.reduce((sum: number, item: any) => sum + item.valor_final, 0) + (Number(valor_frete) || 0);

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
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const {
            id,
            cliente_nome,
            cliente_contato,
            canal_venda,
            vendedor,
            status,
            observacao,
            pintura_freelancer,
            pintor_nome,
            cliente_id,
            metodo_entrega,
            figura_id,
            quantidade,
            valor_venda_final,
            cpf,
            cep,
            logradouro,
            numero,
            bairro,
            cidade,
            uf
        } = body;

        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

        // --- MOTOR DE AUTO-CRM (PATCH) ---
        let final_cliente_id = cliente_id;
        let final_cliente_nome = cliente_nome;
        const sanitizedPhone = cliente_contato ? cliente_contato.replace(/\D/g, '') : '';

        // Se não temos um ID mas temos o contato, tentamos vincular ou criar
        if (!final_cliente_id && sanitizedPhone && sanitizedPhone.trim() !== '') {
            // 1. Tentar localizar por telefone exato
            const { data: existing } = await supabase
                .from('clientes')
                .select('id, nome')
                .eq('telefone', sanitizedPhone)
                .maybeSingle();

            if (existing) {
                final_cliente_id = existing.id;
                if (existing.nome) final_cliente_nome = existing.nome;
            } else if (cliente_nome) {
                // 2. Criar novo se não existir
                const { data: novo } = await supabase
                    .from('clientes')
                    .insert([{
                        nome: cliente_nome,
                        telefone: sanitizedPhone,
                        id: crypto.randomUUID()
                    }])
                    .select('id')
                    .maybeSingle();
                if (novo) final_cliente_id = novo.id;
            }
        }

        // Se o cliente existe (ou acabou de ser criado), atualizamos as informações dele
        if (final_cliente_id) {
            const updatePayload: any = {};
            if (cliente_nome) updatePayload.nome = cliente_nome;
            if (cliente_contato) updatePayload.telefone = sanitizedPhone;
            if (cpf !== undefined) updatePayload.cpf = cpf || null;
            if (cep !== undefined) updatePayload.cep = cep || null;
            if (logradouro !== undefined) updatePayload.logradouro = logradouro || null;
            if (numero !== undefined) updatePayload.numero = numero || null;
            if (bairro !== undefined) updatePayload.bairro = bairro || null;
            if (cidade !== undefined) updatePayload.cidade = cidade || null;
            if (uf !== undefined) updatePayload.uf = uf || null;

            await supabase
                .from('clientes')
                .update(updatePayload)
                .eq('id', final_cliente_id);
        }

        // 1. Buscar a venda atual para ter os snapshots de custo e valor original
        const { data: currentSale, error: fetchError } = await supabase
            .from('vendas')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !currentSale) throw new Error('Venda não encontrada');

        const finalFiguraId = figura_id !== undefined ? figura_id : currentSale.figura_id;
        const finalQuantidade = quantidade !== undefined ? Number(quantidade) : currentSale.quantidade;
        const finalValorVendaFinal = valor_venda_final !== undefined ? Number(valor_venda_final) : currentSale.valor_venda_final;
        const finalVendedor = vendedor !== undefined ? vendedor : currentSale.vendedor;
        const finalPinturaFreelancer = pintura_freelancer !== undefined ? pintura_freelancer : currentSale.pintura_freelancer;

        // Fetch pricing settings and figure metadata
        const { data: settings, error: settingsError } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        if (settingsError) throw new Error('Falha ao obter parâmetros de precificação');

        const { data: meta, error: metaError } = await supabase
            .from('figuras_meta')
            .select('*')
            .eq('figura_id', finalFiguraId)
            .single();

        if (metaError) throw new Error('Falha ao obter metadados da figura');

        const custo_resina_raw = (meta.resina_kg || 0) * (settings.custo_resina_kg || 0);
        const custo_impressao_raw = (meta.horas_impressao || 0) * (settings.custo_h_impressao || 0);

        const custo_unitario_real = Math.ceil(custo_resina_raw + custo_impressao_raw);
        const custo_total_real = custo_unitario_real * finalQuantidade;

        // Deduções
        let comissao_vendedor = 0;
        const OWNER_EMAIL = 'rcssposito@gmail.com';

        if (finalVendedor && finalVendedor.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
            // 15% de comissão sobre o valor final do item
            comissao_vendedor = Math.round(finalValorVendaFinal * 0.15);
        }

        let custo_pintura_freelancer = 0;
        if (finalPinturaFreelancer) {
            custo_pintura_freelancer = Math.ceil((meta.horas_pintura || 0) * 50) * finalQuantidade;
        }

        // Lucro Real = Valor Final - Custos da Impressora - Custo Terceiro - Comissão
        const lucro_real = finalValorVendaFinal - custo_total_real - custo_pintura_freelancer - comissao_vendedor;
        const valor_pago_pintor = custo_pintura_freelancer;

        const { data, error } = await supabase
            .from('vendas')
            .update({
                cliente_nome: final_cliente_nome,
                cliente_contato,
                canal_venda,
                vendedor: finalVendedor,
                status,
                observacao,
                pintura_freelancer: finalPinturaFreelancer,
                pintor_nome,
                valor_pago_pintor,
                custo_producao_snapshot: custo_total_real,
                comissao_vendedor,
                lucro_real,
                figura_id: finalFiguraId,
                quantidade: finalQuantidade,
                valor_venda_final: finalValorVendaFinal,
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
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

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
