import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { emitirNFe } from '@/lib/nfe';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { checkout_id, sale_id } = body;

        let finalCheckoutId = checkout_id;

        // Se foi enviado apenas o sale_id, busca o checkout_id no banco
        if (!finalCheckoutId && sale_id) {
            const { data: sale } = await supabase
                .from('vendas')
                .select('checkout_id')
                .eq('id', Number(sale_id))
                .maybeSingle();
            
            if (sale) {
                finalCheckoutId = sale.checkout_id;
            }
        }

        if (!finalCheckoutId) {
            return NextResponse.json({ error: 'Checkout ID não encontrado para esta venda' }, { status: 400 });
        }

        console.log(`[NF-e Manual] Iniciando emissão para o checkout: ${finalCheckoutId}`);
        const result = await emitirNFe(finalCheckoutId);

        if (result.success) {
            return NextResponse.json({ success: true, message: result.message, chave: result.chave });
        } else {
            return NextResponse.json({ error: result.message }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Manual NFe Error:', error);
        return NextResponse.json({ error: error.message || 'Erro interno na emissão' }, { status: 500 });
    }
}
