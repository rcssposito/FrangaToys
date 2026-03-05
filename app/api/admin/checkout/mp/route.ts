import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("PAYLOAD RECEBIDO MP:", JSON.stringify(body, null, 2));

        const { carrinho, cliente_nome, reference_id, valor_frete } = body;

        // Instância e Configuração MP -> Inicializada localmente para evitar cache de Startup do NodeJS/Vercel
        const accessToken = process.env.MP_ACCESS_TOKEN;
        console.log("TEM ACCESS TOKEN:", !!accessToken);

        if (!accessToken) {
            throw new Error('Token MP não configurado no servidor');
        }

        const client = new MercadoPagoConfig({
            accessToken,
            options: { timeout: 5000 }
        });

        if (!carrinho || !Array.isArray(carrinho) || carrinho.length === 0) {
            throw new Error('Carrinho inválido para o Mercado Pago');
        }

        // Criar Itens formatados para o Padrão do MP (Checkout Pro)
        console.log("Mapeando items...");
        const items = carrinho.map((item: any) => ({
            id: String(item.id || '1'),
            title: item.nome || item.Figura || 'Action Figure Sob Encomenda',
            quantity: Number(item.quantidade) || 1,
            unit_price: Number((Number(item.valor_final || 0) / (Number(item.quantidade) || 1)).toFixed(2)), // Transforma o preço total do carrinho no unitario MP e trava 2 casas
            currency_id: 'BRL',
        }));

        // Adicionar Frete como um item se existir
        if (Number(valor_frete) > 0) {
            items.push({
                id: 'shipping',
                title: 'Frete / Envio',
                quantity: 1,
                unit_price: Number(Number(valor_frete).toFixed(2)),
                currency_id: 'BRL',
            });
        }
        console.log("ITEMS MAPEADOS:", JSON.stringify(items));

        const preference = new Preference(client);

        console.log("CHAMANDO PREFERENCE CREATE...");
        const response = await preference.create({
            body: {
                items: items,
                payer: {
                    name: String(cliente_nome || 'Cliente Franga Toys').substring(0, 250),
                    email: 'vendas@frangatoys.com.br' // Email fictício do vendedor se não houver do cliente para ajudar o MP a identificar o contexto
                },
                external_reference: reference_id,
                statement_descriptor: 'Franga Toys',
                payment_methods: {
                    excluded_payment_methods: [],
                    excluded_payment_types: [
                        { id: 'ticket' } // Excluímos Boleto para não segurar reserva
                    ],
                    installments: 12
                },
                back_urls: {
                    success: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/admin/kanban` : 'https://frangatoys.com/admin',
                    failure: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/admin/kanban` : 'https://frangatoys.com/admin',
                    pending: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/admin/kanban` : 'https://frangatoys.com/admin',
                },
                auto_return: 'approved',
                expires: false
            }
        });

        console.log("URL GERADA COM SUCESSO!", response.init_point);
        // @ts-ignore - response might have more data than defined in basic types for debug
        console.log("COLLECTOR ID DA CONTA:", response.collector_id || response.body?.collector_id);

        return NextResponse.json({
            init_point: response.init_point,
            id: response.id,
            // @ts-ignore
            collector_id: response.collector_id || response.body?.collector_id
        });

    } catch (error: any) {
        console.error('------- MERCADO PAGO SDK ERROR -------');
        console.error(error.message);
        if (error.cause) console.error("CAUSE:", error.cause);
        return NextResponse.json({ error: error.message || 'Erro SDK MP' }, { status: 500 });
    }
}
