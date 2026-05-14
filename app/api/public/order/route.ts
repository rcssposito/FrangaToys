import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });
    }

    try {
        // Fetch all items with this access_token
        const { data: sales, error } = await supabase
            .from('vendas')
            .select(`
                *,
                figuras (
                    nome,
                    imagem_url
                )
            `)
            .eq('access_token', token);

        if (error || !sales || sales.length === 0) {
            return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
        }

        // Aggregate order info
        const order = {
            checkout_id: sales[0].checkout_id,
            cliente_nome: sales[0].cliente_nome,
            status: sales[0].status,
            metodo_entrega: sales[0].metodo_entrega,
            valor_frete: sales[0].valor_frete,
            metodo_pagamento: sales[0].link_pagamento ? 'card' : 'pix',
            items: sales
        };

        return NextResponse.json(order);
    } catch (error: any) {
        console.error('Order API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
