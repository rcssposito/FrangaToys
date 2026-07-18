import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });
        }

        // 1. Encontrar o cliente para garantir que existe
        const { data: client, error: clientErr } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (clientErr) throw clientErr;
        if (!client) {
            return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
        }

        // 2. Anonimizar histórico de vendas (remove PII, mantém contabilidade e faturamento)
        const { error: salesErr } = await supabase
            .from('vendas')
            .update({
                cliente_nome: 'CLIENTE ANONIMIZADO (LGPD)',
                cliente_contato: '00000000000',
                observacao: 'Observações removidas por solicitação de privacidade (LGPD).'
            })
            .eq('cliente_id', id);

        if (salesErr) throw salesErr;

        // 3. Anonimizar cadastro no CRM (clientes)
        const { error: deleteErr } = await supabase
            .from('clientes')
            .update({
                nome: 'CLIENTE ANONIMIZADO (LGPD)',
                telefone: `ANON_${id.substring(0, 8)}`,
                instagram: null,
                notas: 'Dados excluídos sob solicitação manual LGPD no painel administrativo.',
                cpf: null,
                cep: null,
                logradouro: null,
                numero: null,
                bairro: null,
                cidade: null,
                uf: null
            })
            .eq('id', id);

        if (deleteErr) throw deleteErr;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('LGPD Admin anonymize error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
