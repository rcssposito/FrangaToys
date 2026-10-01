import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { isValidCpfOrCnpj, isValidFullName, VALID_UFS_SET } from '@/lib/fiscal-validation';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            token,
            phone,
            sale_id,
            nome,
            cpf,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            uf
        } = body;

        if (!token && !phone && !sale_id) {
            return NextResponse.json({ error: 'Identificador do pedido (token, telefone ou id) é obrigatório' }, { status: 400 });
        }

        const cleanNome = (nome || '').trim();
        if (!cleanNome || !isValidFullName(cleanNome)) {
            return NextResponse.json({ error: 'Informe o nome completo (nome e sobrenome) para emissão da NF-e' }, { status: 400 });
        }

        const cleanCpf = (cpf || '').replace(/\D/g, '');
        if (!cleanCpf || !isValidCpfOrCnpj(cleanCpf)) {
            return NextResponse.json({ error: 'CPF ou CNPJ inválido. Verifique os dígitos informados.' }, { status: 400 });
        }

        const cleanCep = (cep || '').replace(/\D/g, '');
        if (!cleanCep || cleanCep.length !== 8) {
            return NextResponse.json({ error: 'CEP deve conter 8 dígitos numéricos' }, { status: 400 });
        }

        const cleanLogradouro = (logradouro || '').trim();
        if (!cleanLogradouro) {
            return NextResponse.json({ error: 'Rua / Logradouro é obrigatório' }, { status: 400 });
        }

        const cleanNumero = (numero || '').trim();
        if (!cleanNumero) {
            return NextResponse.json({ error: 'Número do endereço é obrigatório (informe o número ou S/N)' }, { status: 400 });
        }

        const cleanBairro = (bairro || '').trim();
        if (!cleanBairro) {
            return NextResponse.json({ error: 'Bairro é obrigatório' }, { status: 400 });
        }

        const cleanCidade = (cidade || '').trim();
        if (!cleanCidade) {
            return NextResponse.json({ error: 'Cidade é obrigatória' }, { status: 400 });
        }

        const cleanUf = (uf || '').trim().toUpperCase().slice(0, 2);
        if (!cleanUf || !VALID_UFS_SET.has(cleanUf)) {
            return NextResponse.json({ error: 'UF (Estado) inválido. Informe a sigla de 2 letras de um estado brasileiro.' }, { status: 400 });
        }

        // 1. Localizar venda correspondente
        let saleQuery: any;

        if (sale_id) {
            saleQuery = supabase.from('vendas').select('id, checkout_id, cliente_id, cliente_contato, cliente_nome').eq('id', Number(sale_id));
        } else if (token) {
            saleQuery = supabase.from('vendas').select('id, checkout_id, cliente_id, cliente_contato, cliente_nome').eq('access_token', token);
        } else if (phone) {
            const sanitizedPhone = phone.replace(/\D/g, '');
            saleQuery = supabase
                .rpc('get_vendas_by_phone', { phone_input: sanitizedPhone })
                .select('id, checkout_id, cliente_id, cliente_contato, cliente_nome');
        }

        const { data: sales, error: saleErr } = await saleQuery.limit(1);
        if (saleErr || !sales || sales.length === 0) {
            return NextResponse.json({ error: 'Pedido não encontrado para validar a requisição' }, { status: 404 });
        }

        const currentSale = sales[0];
        let targetClientId = currentSale.cliente_id;

        const customerPayload = {
            nome: cleanNome,
            cpf: cleanCpf,
            cep: cleanCep,
            logradouro: cleanLogradouro,
            numero: cleanNumero,
            complemento: (complemento || '').trim(),
            bairro: cleanBairro,
            cidade: cleanCidade,
            uf: cleanUf
        };

        // 2. Se a venda não tem cliente_id, tenta encontrar cliente pelo telefone ou cria
        if (!targetClientId) {
            const rawPhone = currentSale.cliente_contato || (phone ? phone.replace(/\D/g, '') : '');
            const cleanPhone = rawPhone.replace(/\D/g, '');

            if (cleanPhone) {
                const { data: existingClient } = await supabase
                    .from('clientes')
                    .select('id')
                    .ilike('telefone', `%${cleanPhone.slice(-8)}%`)
                    .limit(1)
                    .maybeSingle();

                if (existingClient) {
                    targetClientId = existingClient.id;
                }
            }

            if (!targetClientId) {
                // Criar novo cliente
                const { data: newClient, error: createErr } = await supabase
                    .from('clientes')
                    .insert([{
                        ...customerPayload,
                        telefone: currentSale.cliente_contato || phone || ''
                    }])
                    .select()
                    .single();

                if (createErr) throw createErr;
                targetClientId = newClient.id;
            }

            // Vincular cliente_id na(s) venda(s) correspondente(s)
            if (currentSale.checkout_id) {
                await supabase
                    .from('vendas')
                    .update({ cliente_id: targetClientId, cliente_nome: customerPayload.nome })
                    .eq('checkout_id', currentSale.checkout_id);
            } else {
                await supabase
                    .from('vendas')
                    .update({ cliente_id: targetClientId, cliente_nome: customerPayload.nome })
                    .eq('id', currentSale.id);
            }
        }

        // 3. Atualizar dados na tabela clientes
        const { data: updatedClient, error: updateErr } = await supabase
            .from('clientes')
            .update(customerPayload)
            .eq('id', targetClientId)
            .select()
            .single();

        if (updateErr) throw updateErr;

        // Se o nome foi atualizado, manter vendas sincronizadas
        if (customerPayload.nome) {
            await supabase
                .from('vendas')
                .update({ cliente_nome: customerPayload.nome })
                .eq('cliente_id', targetClientId);
        }

        return NextResponse.json({
            success: true,
            message: 'Dados da Nota Fiscal atualizados com sucesso!'
        });

    } catch (err: any) {
        console.error('Erro ao atualizar dados da NFe pelo cliente:', err);
        return NextResponse.json({ error: err.message || 'Erro ao salvar dados' }, { status: 500 });
    }
}
