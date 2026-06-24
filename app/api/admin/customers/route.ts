import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// LISTAR CLIENTES / BUSCA RÁPIDA
export async function GET(req: Request) {
    try {
    const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q'); // Para autocomplete
        const id = searchParams.get('id'); // Para busca especifica por id

        if (id) {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
            }
            return NextResponse.json(data);
        }

        let supabaseQuery = supabase
            .from('clientes')
            .select(`
                *,
                vendas (
                    valor_venda_final,
                    valor_frete,
                    data_venda
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
                
                const saleDate = new Date(v.data_venda);
                if (!acc.ultima_venda_em || saleDate > acc.ultima_venda_em) {
                    acc.ultima_venda_em = saleDate;
                }
                return acc;
            }, { total_pedidos: 0, total_gasto: 0, ultima_venda_em: null as Date | null });

            // Remover a lista de vendas para reduzir o payload
            const { vendas, ...customerData } = c;
            return {
                ...customerData,
                total_pedidos: stats.total_pedidos,
                total_gasto: stats.total_gasto,
                ultima_venda_em: stats.ultima_venda_em ? stats.ultima_venda_em.toISOString() : null
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
    const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { nome, telefone, instagram, notas, cpf, cep, logradouro, numero, bairro, cidade, uf } = body;

        if (!nome || !telefone) {
            return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('clientes')
            .insert([{ nome, telefone, instagram, notas, cpf, cep, logradouro, numero, bairro, cidade, uf }])
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
    const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { id, nome, telefone, instagram, notas, cpf, cep, logradouro, numero, bairro, cidade, uf } = body;

        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

        const { data, error } = await supabase
            .from('clientes')
            .update({ nome, telefone, instagram, notas, cpf, cep, logradouro, numero, bairro, cidade, uf })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // --- Sincronização Global (Opção B do Usuário) ---
        // Se o nome foi alterado, atualizamos em todas as vendas vinculadas a esse ID
        if (nome) {
            const { error: syncError } = await supabase
                .from('vendas')
                .update({ cliente_nome: nome })
                .eq('cliente_id', id);
            
            if (syncError) {
                console.error('Falha na sincronização de nomes nas vendas:', syncError);
                // Não travamos a resposta principal por isso, mas logamos o erro
            }
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
