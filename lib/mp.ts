import { MercadoPagoConfig, Preference } from 'mercadopago';

/**
 * Utility for Mercado Pago integration.
 */

export async function createMPPreference(params: {
    items: { id: string; title: string; quantity: number; unit_price: number }[];
    customerName: string;
    externalReference: string;
    backUrl: string;
}) {
    const accessToken = process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
        throw new Error('Token MP não configurado no servidor');
    }

    const client = new MercadoPagoConfig({
        accessToken,
        options: { timeout: 5000 }
    });

    const preference = new Preference(client);

    const response = await preference.create({
        body: {
            items: params.items.map(item => ({
                ...item,
                currency_id: 'BRL'
            })),
            payer: {
                name: params.customerName.substring(0, 250),
                email: 'vendas@frangatoys.com.br' // Default vendor email for context
            },
            external_reference: params.externalReference,
            statement_descriptor: 'Franga Toys',
            payment_methods: {
                excluded_payment_methods: [],
                excluded_payment_types: [
                    { id: 'ticket' } // Exclude Boleto
                ],
                installments: 12
            },
            back_urls: {
                success: params.backUrl,
                failure: params.backUrl,
                pending: params.backUrl,
            },
            auto_return: 'approved',
            expires: false
        }
    });

    return {
        id: response.id,
        init_point: response.init_point
    };
}
