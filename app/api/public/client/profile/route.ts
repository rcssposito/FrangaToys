import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rawPhone = searchParams.get('phone');
        const token = searchParams.get('token');

        if (!rawPhone && !token) {
            return NextResponse.json({ error: 'Telefone ou token obrigatório.' }, { status: 400 });
        }

        let cleanPhone = rawPhone ? rawPhone.replace(/\D/g, '') : null;

        // Se tiver token, busca a venda para descobrir o telefone
        if (token && !cleanPhone) {
            const { data: sale } = await supabase
                .from('vendas')
                .select('cliente_contato, cliente_nome')
                .eq('access_token', token)
                .maybeSingle();

            if (sale?.cliente_contato) {
                cleanPhone = sale.cliente_contato.replace(/\D/g, '');
            }
        }

        if (!cleanPhone || cleanPhone.length < 8) {
            return NextResponse.json({ exists: false, client: null });
        }

        const { data: client, error } = await supabase
            .from('clientes')
            .select('id, nome, telefone, wishlist')
            .eq('telefone', cleanPhone)
            .maybeSingle();

        if (error) {
            console.error('Erro ao buscar perfil do cliente:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!client) {
            return NextResponse.json({ exists: false, client: null });
        }

        return NextResponse.json({
            exists: true,
            client
        });
    } catch (err: any) {
        console.error('Erro ao buscar perfil de cliente:', err);
        return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
    }
}
