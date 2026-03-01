require('dotenv').config();
const { MercadoPagoConfig, Preference } = require('mercadopago');

const accessToken = process.env.MP_ACCESS_TOKEN;
console.log("Token Presente:", !!accessToken);

const client = new MercadoPagoConfig({
    accessToken: accessToken,
    options: { timeout: 5000 }
});

async function main() {
    try {
        const preference = new Preference(client);
        const response = await preference.create({
            body: {
                items: [
                    {
                        id: '1',
                        title: 'A',
                        quantity: 1,
                        unit_price: 396,
                        currency_id: 'BRL',
                    }
                ],
                payer: {
                    name: 'a',
                },
                payment_methods: {
                    excluded_payment_methods: [],
                    excluded_payment_types: [
                        { id: 'ticket' }
                    ],
                    installments: 12
                },
                back_urls: {
                    success: 'https://frangatoys.com/admin',
                    failure: 'https://frangatoys.com/admin',
                    pending: 'https://frangatoys.com/admin',
                },
                auto_return: 'approved',
                expires: false
            }
        });
        console.log("SUCCESS init_point:", response.init_point);
    } catch (e) {
        console.error("ERROR MESSAGE:", e.message);
        if (e.cause) console.error("CAUSE:", e.cause);
    }
}
main();
