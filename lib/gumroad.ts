// lib/gumroad.ts
const GUMROAD_API_BASE = 'https://api.gumroad.com/v2';

export function getGumroadToken(): string {
    const token = process.env.GUMROAD_ACCESS_TOKEN;
    if (!token) {
        throw new Error('GUMROAD_ACCESS_TOKEN não configurado no ambiente.');
    }
    return token;
}

export interface GumroadProduct {
    id: string;
    name: string;
    description?: string;
    price: number;
    formatted_price: string;
    currency: string;
    short_url: string;
    permalink?: string;
    published: boolean;
    sales_count: number;
    sales_usd_cents: number;
    thumbnail_url?: string;
}

export interface GumroadOfferCode {
    id: string;
    name: string;
    amount_cents: number;
    max_purchase_count: number;
    times_used: number;
    universal: boolean;
}

/**
 * Busca dados da conta/usuário do Gumroad
 */
export async function getGumroadUser() {
    const token = getGumroadToken();
    const res = await fetch(`${GUMROAD_API_BASE}/user`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!res.ok) {
        throw new Error(`Erro ao consultar usuário do Gumroad: HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.user;
}

/**
 * Lista todos os produtos da loja
 */
export async function getGumroadProducts(): Promise<GumroadProduct[]> {
    const token = getGumroadToken();
    const res = await fetch(`${GUMROAD_API_BASE}/products`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!res.ok) {
        throw new Error(`Erro ao listar produtos do Gumroad: HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.products || [];
}

/**
 * Cria um cupom de 100% de desconto de USO ÚNICO para um produto
 */
export async function createSingleUseCoupon(productId: string, customCode?: string): Promise<{ offerCode: GumroadOfferCode; checkoutUrl: string; permalink: string; productName: string }> {
    const token = getGumroadToken();

    // 1. Buscar o produto para obter o permalink e o preço em centavos
    const prodRes = await fetch(`${GUMROAD_API_BASE}/products/${productId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!prodRes.ok) {
        throw new Error(`Produto ${productId} não encontrado no Gumroad`);
    }
    const prodData = await prodRes.json();
    const product = prodData.product;

    if (!product) {
        throw new Error('Produto inválido no Gumroad');
    }

    // 2. Gerar código único imprevisível
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const couponName = customCode || `FRANGA-${randomHex}`;

    // 3. Criar cupom na API com max_purchase_count: 1 e amount_cents = price (100% OFF)
    const discountAmount = product.price || 1500; // centavos

    const offerRes = await fetch(`${GUMROAD_API_BASE}/products/${productId}/offer_codes`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: couponName,
            amount_cents: discountAmount,
            max_purchase_count: 1
        })
    });

    const offerData = await offerRes.json();
    if (!offerData.success || !offerData.offer_code) {
        throw new Error(offerData.message || 'Falha ao gerar cupom no Gumroad');
    }

    // 4. Montar a URL de checkout direto com cupom aplicado
    const permalink = product.short_url ? product.short_url.split('/').pop() : 'product';
    const checkoutUrl = `https://frangatoys.gumroad.com/l/${permalink}?offer_code=${couponName}`;

    return {
        offerCode: offerData.offer_code,
        checkoutUrl,
        permalink: permalink || '',
        productName: product.name
    };
}

/**
 * Consulta vendas do Gumroad para rastrear resgates e identificar o e-mail/IP do comprador
 */
export async function getGumroadSales() {
    const token = getGumroadToken();
    const res = await fetch(`${GUMROAD_API_BASE}/sales`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!res.ok) {
        throw new Error(`Erro ao consultar vendas no Gumroad: HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.sales || [];
}
