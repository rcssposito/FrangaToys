
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const phone = searchParams.get('phone');

        if (!phone) {
            return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 });
        }

        // Normalização simples do telefone (apenas números)
        const sanitizedPhone = phone.replace(/\D/g, '');

        if (sanitizedPhone.length < 8) {
            return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 });
        }

        // Buscar vendas que o contato contenha os números informados
        // Usamos ilike com curingas para ignorar formatação salva (parenteses, traços)
        const phonePattern = `%${sanitizedPhone}%`;

        const { data: sales, error } = await supabase
            .from('vendas')
            .select(`
                id,
                status,
                data_venda,
                cliente_nome,
                quantidade,
                figura_id,
                figuras (
                    nome,
                    imagem_url,
                    studios ( nome )
                )
            `)
            .or(`cliente_contato.ilike.${phonePattern}`)
            .order('data_venda', { ascending: false });

        if (error) throw error;

        if (!sales || sales.length === 0) {
            return NextResponse.json({ items: [], message: 'Nenhum pedido encontrado para este telefone.' });
        }

        // Filtramos os dados finais para garantir que apenas o essencial seja enviado
        const formatted = sales.map((s: any) => ({
            id: s.id,
            status: s.status,
            data: s.data_venda,
            figura: {
                nome: s.figuras?.nome,
                imagem: s.figuras?.imagem_url,
                studio: s.figuras?.studios?.nome
            },
            quantidade: s.quantidade
        }));

        return NextResponse.json({ items: formatted });

    } catch (err: any) {
        console.error('Public Tracking API Error:', err);
        return NextResponse.json({ error: 'Erro interno ao buscar pedidos' }, { status: 500 });
    }
}
