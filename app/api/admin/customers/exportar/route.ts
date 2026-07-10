import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });
        }

        // 1. Obter informações do cliente
        const { data: client, error: clientErr } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (clientErr) throw clientErr;
        if (!client) {
            return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
        }

        // 2. Obter as vendas vinculadas a este cliente
        const { data: sales, error: salesErr } = await supabase
            .from('vendas')
            .select('*')
            .eq('cliente_id', id);

        if (salesErr) throw salesErr;

        return NextResponse.json({
            clientes: {
                id: client.id,
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
                data_cadastro: client.data_cadastro,
                notas: client.notas
            },
            vendas: (sales || []).map(s => ({
                id: s.id,
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
        console.error('LGPD Admin export error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
