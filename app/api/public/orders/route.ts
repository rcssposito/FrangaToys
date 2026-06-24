
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const phone = searchParams.get('phone');
        const token = searchParams.get('token');

        if (!phone && !token) {
            return NextResponse.json({ error: 'Telefone ou Token é obrigatório' }, { status: 400 });
        }

        let query = supabase
            .from('vendas')
            .select(`
                id,
                access_token,
                status,
                data_venda,
                cliente_nome,
                quantidade,
                figura_id,
                metodo_entrega,
                status_pagamento,
                valor_venda_final,
                valor_pago_parcial,
                valor_frete,
                link_pagamento,
                figuras (
                    nome,
                    imagem_url,
                    studios ( nome )
                )
            `);

        if (token) {
            // Se buscar por token, primeiro descobrimos o telefone dono desse token
            const { data: owner } = await supabase
                .from('vendas')
                .select('cliente_contato')
                .eq('access_token', token)
                .single();

            if (owner?.cliente_contato) {
                const sanitizedPhone = owner.cliente_contato.replace(/\D/g, '');
                const phonePattern = `%${sanitizedPhone}%`;
                query = query.or(`cliente_contato.ilike.${phonePattern}`);
            } else {
                query = query.eq('access_token', token); // Fallback caso não ache contato
            }
        } else if (phone) {
            // Normalização simples do telefone (apenas números)
            const sanitizedPhone = phone.replace(/\D/g, '');
            if (sanitizedPhone.length < 8) {
                return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 });
            }
            const phonePattern = `%${sanitizedPhone}%`;
            query = query.or(`cliente_contato.ilike.${phonePattern}`);
        }

        const { data: sales, error } = await query.order('data_venda', { ascending: false });

        if (error) throw error;

        if (!sales || sales.length === 0) {
            return NextResponse.json({ items: [], message: 'Nenhum pedido encontrado.' });
        }

        // Filtramos os dados finais para garantir que apenas o essencial seja enviado
        const formatted = sales.map((s: any) => ({
            id: s.id,
            token: s.access_token,
            status: s.status,
            data: s.data_venda,
            figura: {
                nome: s.figuras?.nome,
                imagem: s.figuras?.imagem_url,
                studio: s.figuras?.studios?.nome
            },
            quantidade: s.quantidade,
            metodo_entrega: s.metodo_entrega,
            status_pagamento: s.status_pagamento,
            valor_venda_final: s.valor_venda_final,
            valor_pago_parcial: s.valor_pago_parcial,
            valor_frete: s.valor_frete,
            link_pagamento: s.link_pagamento
        }));

        return NextResponse.json({ items: formatted });

    } catch (err: any) {
        console.error('Public Tracking API Error:', err);
        return NextResponse.json({ error: 'Erro interno ao buscar pedidos' }, { status: 500 });
    }
}
