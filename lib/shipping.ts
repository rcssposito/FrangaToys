/**
 * Utility for shipping calculation via Melhor Envio.
 */

export interface ShippingQuoteParams {
    sCepDestino: string;
    nVlPeso?: number;
    nVlComprimento?: number;
    nVlAltura?: number;
    nVlLargura?: number;
}

export interface ShippingService {
    Codigo: string;
    Valor: number;
    PrazoEntrega: number;
    Nome: string;
    Empresa: string;
}

export async function calculateShipping(params: ShippingQuoteParams): Promise<ShippingService[]> {
    const sCepOrigem = process.env.NEXT_PUBLIC_CEP_ORIGEM;
    const token = process.env.MELHORENVIO_TOKEN || process.env.Franga;

    if (!sCepOrigem || !token) {
        throw new Error('Configuração do Melhor Envio incompleta no servidor');
    }

    const { sCepDestino, nVlPeso, nVlComprimento, nVlAltura, nVlLargura } = params;

    const response = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/calculate', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'FrangaToys (rcssposito@gmail.com)'
        },
        body: JSON.stringify({
            from: { postal_code: sCepOrigem.replace(/\D/g, '') },
            to: { postal_code: sCepDestino.replace(/\D/g, '') },
            package: {
                weight: Math.max(nVlPeso || 0.3, 0.3),
                width: Math.max(nVlLargura || 10, 10),
                height: Math.max(nVlAltura || 2, 2),
                length: Math.max(nVlComprimento || 15, 15)
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao calcular frete no Melhor Envio');
    }

    const result = await response.json();

    return result
        .filter((service: any) => !service.error)
        .map((service: any) => ({
            Codigo: service.id === 1 ? '04510' : (service.id === 2 ? '04014' : String(service.id)),
            Valor: service.price,
            PrazoEntrega: service.delivery_time,
            Nome: service.name,
            Empresa: service.company.name
        }));
}
