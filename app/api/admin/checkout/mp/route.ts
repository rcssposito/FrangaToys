import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { carrinho, cliente_nome, reference_id } = body;

        // Instância e Configuração MP -> Inicializada localmente para evitar cache de Startup do NodeJS/Vercel
        const accessToken = process.env.MP_ACCESS_TOKEN;
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
        const items = carrinho.map((item: any) => ({
            id: String(item.id),
            title: item.nome || 'Action Figure Sob Encomenda',
            quantity: item.quantidade || 1,
            unit_price: Number(item.valor_final) / (item.quantidade || 1), // Transforma o preço total do carrinho no unitario MP
            currency_id: 'BRL',
        }));

        const preference = new Preference(client);

        const response = await preference.create({
            body: {
                items: items,
                payer: {
                    name: cliente_nome || 'Cliente Franga Toys',
                },
                external_reference: reference_id, // ID interno temporal se tivermos
                payment_methods: {
                    excluded_payment_methods: [],
                    excluded_payment_types: [
                        { id: 'ticket' } // Excluímos Boleto para não segurar reserva
                    ],
                    installments: 12 // Permite até 12x (Juros Padrão do Comprador)
                },
                back_urls: {
                    success: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/admin/kanban` : 'https://frangatoys.com/admin',
                    failure: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/admin/kanban` : 'https://frangatoys.com/admin',
                    pending: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/admin/kanban` : 'https://frangatoys.com/admin',
                },
                auto_return: 'approved', // Redireciona o cara na hora se der bom
                expires: false // Sem timestamp de expiry para permitir repasse de links no whatsapp
            }
        });

        // Retorna a URL segura "init_point" do Mercado Pago que o checkout.js irá usar ou nós usaremos visualmente
        return NextResponse.json({
            init_point: response.init_point,
            id: response.id
        });

    } catch (error: any) {
        console.error('Mercado Pago Pref Error:', error);
        return NextResponse.json({ error: error.message || 'Erro SDK MP' }, { status: 500 });
    }
}
