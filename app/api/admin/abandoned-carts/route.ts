import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        let query = supabase
            .from('carrinhos_abandonados')
            .select('*')
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: items, error } = await query;
        if (error) {
            console.error('Erro ao buscar carrinhos abandonados:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const allItems = items || [];

        // Estatísticas
        const totalCarts = allItems.length;
        const abandonedCarts = allItems.filter(i => i.status === 'abandonado');
        const totalValue = abandonedCarts.reduce((acc, i) => acc + (Number(i.valor_total) || 0), 0);
        const recoveredCount = allItems.filter(i => i.status === 'recuperado' || i.resgatado).length;
        const contactedCount = allItems.filter(i => i.status === 'contatado').length;
        const recoveryRate = totalCarts > 0 ? (recoveredCount / totalCarts) * 100 : 0;

        return NextResponse.json({
            items: allItems,
            stats: {
                totalCarts,
                totalValue,
                recoveredCount,
                contactedCount,
                recoveryRate: Number(recoveryRate.toFixed(1))
            }
        });
    } catch (err: any) {
        console.error('Erro na rota de carrinhos abandonados:', err);
        return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { cartId, discountPct = 5 } = body;

        if (!cartId) {
            return NextResponse.json({ error: 'ID do carrinho obrigatório' }, { status: 400 });
        }

        // 1. Busca o carrinho
        const { data: cart, error: cartError } = await supabase
            .from('carrinhos_abandonados')
            .select('*')
            .eq('id', cartId)
            .single();

        if (cartError || !cart) {
            return NextResponse.json({ error: 'Carrinho não encontrado' }, { status: 404 });
        }

        // 2. Gera cupom de 24 horas uso único
        const randomCode = `RESGATE-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const { error: couponError } = await supabase
            .from('cupoms_desconto')
            .insert({
                codigo: randomCode,
                tipo: 'porcentagem',
                valor: Number(discountPct) || 5,
                usos_restantes: 1,
                data_validade: expiresAt,
                ativo: true
            });

        if (couponError) {
            console.error('Erro ao gerar cupom de resgate:', couponError);
            return NextResponse.json({ error: 'Erro ao criar cupom de desconto' }, { status: 500 });
        }

        // 3. Atualiza o carrinho com o cupom gerado e status contatado
        await supabase
            .from('carrinhos_abandonados')
            .update({
                cupom_gerado: randomCode,
                status: 'contatado',
                updated_at: new Date().toISOString()
            })
            .eq('id', cartId);

        // 4. Monta mensagem humanizada de WhatsApp
        const cleanPhone = (cart.cliente_contato || '').replace(/\D/g, '');
        const itemsList = Array.isArray(cart.itens) && cart.itens.length > 0
            ? cart.itens.map((i: any) => `• ${i.nome || 'Figura'}${i.finish ? ` (${i.finish})` : ''}`).join('\n')
            : 'seus colecionáveis selecionados';

        const rawMsg = `Olá, ${cart.cliente_nome || 'colecionador'}! Aqui é da equipe da Franga Toys 🎨\n\n` +
            `Vi que você estava navegando no nosso ateliê e deixou o carrinho em aberto:\n` +
            `${itemsList}\n\n` +
            `Para te ajudar a ter essa peça na sua coleção, geramos um Cupom Exclusivo de *${discountPct}% OFF* válido pelas próximas 24 horas:\n` +
            `🎟️ Cupom: *${randomCode}*\n\n` +
            `Basta acessar https://frangatoys.com.br e aplicar no seu carrinho!\n\n` +
            `Se tiver qualquer dúvida de escala ou pintura personalizada, é só me chamar aqui! ✨`;

        const whatsappUrl = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(rawMsg)}`;

        return NextResponse.json({
            ok: true,
            coupon: randomCode,
            whatsappUrl,
            message: 'Cupom de 24h gerado com sucesso'
        });
    } catch (err: any) {
        console.error('Erro ao processar resgate de carrinho:', err);
        return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
    }
}
