import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// LISTAR CLIENTES / BUSCA RÁPIDA
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q'); // Para autocomplete

        let supabaseQuery = supabase
            .from('clientes')
            .select(`
                *,
                vendas (
                    valor_venda_final,
                    valor_frete
                )
            `);

        if (query) {
            supabaseQuery = supabaseQuery.or(`nome.ilike.%${query}%,telefone.ilike.%${query}%`);
        }

        const { data, error } = await supabaseQuery.order('nome', { ascending: true }).limit(50);

        if (error) throw error;

        // Processar estatísticas agregadas
        const formattedData = (data || []).map((c: any) => {
            const stats = (c.vendas || []).reduce((acc: any, v: any) => {
                acc.total_pedidos += 1;
                acc.total_gasto += (v.valor_venda_final || 0) + (v.valor_frete || 0);
                return acc;
            }, { total_pedidos: 0, total_gasto: 0 });

            // Remover a lista de vendas para reduzir o payload
            const { vendas, ...customerData } = c;
            return {
                ...customerData,
                total_pedidos: stats.total_pedidos,
                total_gasto: stats.total_gasto
            };
        });

        return NextResponse.json(formattedData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// CRIAR CLIENTE
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { nome, telefone, instagram, notas } = body;

        if (!nome || !telefone) {
            return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('clientes')
            .insert([{ nome, telefone, instagram, notas }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ATUALIZAR CLIENTE
export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, nome, telefone, instagram, notas } = body;

        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

        const { data, error } = await supabase
            .from('clientes')
            .update({ nome, telefone, instagram, notas })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
