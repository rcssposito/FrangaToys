import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const { phone } = await req.json();
        if (!phone) return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 });

        const sanitizedPhone = phone.replace(/\D/g, '');

        // 1. Obter informações do cliente
        const { data: client, error: clientErr } = await supabase
            .from('clientes')
            .select('*')
            .eq('telefone', sanitizedPhone)
            .maybeSingle();

        if (clientErr) throw clientErr;
        if (!client) {
            return NextResponse.json({ error: 'Nenhum cadastro encontrado para este telefone' }, { status: 404 });
        }

        // 2. Obter as vendas vinculadas a este cliente
        const { data: sales, error: salesErr } = await supabase
            .from('vendas')
            .select('*')
            .eq('cliente_id', client.id);

        if (salesErr) throw salesErr;

        return NextResponse.json({
            clientes: {
                nome: client.nome,
                telefone: client.telefone,
                instagram: client.instagram,
                cpf: client.cpf,
                cep: client.cep,
                logradouro: client.logradouro,
                numero: client.numero,
                bairro: client.bairro,
                cidade: client.cidade,
                uf: client.uf,
                data_cadastro: client.data_cadastro
            },
            vendas: sales.map(s => ({
                data_venda: s.data_venda,
                figura_id: s.figura_id,
                quantidade: s.quantidade,
                valor_venda_final: s.valor_venda_final,
                status: s.status,
                status_pagamento: s.status_pagamento,
                observacao: s.observacao,
                canal_venda: s.canal_venda
            }))
        });
    } catch (err: any) {
        console.error('Data download API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
