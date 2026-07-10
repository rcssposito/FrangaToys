import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const { phone } = await req.json();
        if (!phone) return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 });

        const sanitizedPhone = phone.replace(/\D/g, '');

        // 1. Encontrar o cliente correspondente
        const { data: client, error: clientErr } = await supabase
            .from('clientes')
            .select('id')
            .eq('telefone', sanitizedPhone)
            .maybeSingle();

        if (clientErr) throw clientErr;
        if (!client) {
            return NextResponse.json({ error: 'Nenhum cadastro encontrado para este telefone' }, { status: 404 });
        }

        // 2. Anonimizar o histórico de vendas (remoção de PII, preservando os totais para relatórios)
        const { error: salesErr } = await supabase
            .from('vendas')
            .update({
                cliente_nome: 'CLIENTE ANONIMIZADO (LGPD)',
                cliente_contato: '00000000000',
                observacao: 'Observações removidas por solicitação de privacidade (LGPD).'
            })
            .eq('cliente_id', client.id);

        if (salesErr) throw salesErr;

        // 3. Anonimizar a ficha do CRM (clientes)
        const { error: deleteErr } = await supabase
            .from('clientes')
            .update({
                nome: 'CLIENTE ANONIMIZADO (LGPD)',
                telefone: `ANON_${client.id.substring(0, 8)}`,
                instagram: null,
                notas: 'Dados excluídos sob as diretrizes da LGPD.',
                cpf: null,
                cep: null,
                logradouro: null,
                numero: null,
                bairro: null,
                cidade: null,
                uf: null
            })
            .eq('id', client.id);

        if (deleteErr) throw deleteErr;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Anonymize/Forget API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
