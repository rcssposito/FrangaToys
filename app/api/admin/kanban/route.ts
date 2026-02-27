import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// LER TAREFAS DO KANBAN
// Retorna todas as vendas ativas (Não concluídas)
export async function GET() {
    try {
        const { data: kanbanData, error } = await supabase
            .from('vendas')
            .select(`
                *,
                figuras ( nome, imagem_url, studios ( nome ) )
            `)
            .neq('status', 'Concluída') // Esconde as já finalizadas
            .order('data_venda', { ascending: true }); // Mais antigas primeiro

        if (error) throw error;

        // Fetch display names for vendors
        const { data: users } = await supabase
            .from('admin_users')
            .select('email, nome');

        const userMap = (users || []).reduce((acc: any, u) => {
            acc[u.email.toLowerCase()] = u.nome;
            return acc;
        }, {});

        const formatted = kanbanData.map(s => ({
            ...s,
            vendedor_nome: userMap[(s.vendedor || '').toLowerCase()] || s.vendedor || 'Ateliê'
        }));

        return NextResponse.json(formatted);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ATUALIZAR STATUS NO KANBAN
export async function PATCH(req: Request) {
    try {
        const { id, status } = await req.json();

        if (!id || !status) {
            return NextResponse.json({ error: 'ID e Status são obrigatórios' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('vendas')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
