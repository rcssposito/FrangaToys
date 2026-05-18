import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { calcularPrecoPrazo } from 'correios-brasil';

export async function POST(req: Request) {
    try {
    const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { sCepDestino, nVlPeso, nVlComprimento, nVlAltura, nVlLargura } = body;

        const sCepOrigem = process.env.NEXT_PUBLIC_CEP_ORIGEM;
        const token = process.env.MELHORENVIO_TOKEN || process.env.Franga;

        if (!sCepOrigem || !token) {
            console.error('Configuração ausente:', { hasCepOrigem: !!sCepOrigem, hasToken: !!token });
            return NextResponse.json({ error: 'Configuração do Melhor Envio incompleta no servidor' }, { status: 500 });
        }

        if (!sCepDestino) {
            return NextResponse.json({ error: 'CEP de destino não informado' }, { status: 400 });
        }

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
            console.error('Melhor Envio Error:', errorData);
            throw new Error(errorData.message || 'Erro ao calcular frete no Melhor Envio');
        }

        const result = await response.json();

        // Mapear para o formato que o Frontend já espera: [{ Codigo, Valor, PrazoEntrega }]
        const formatted = result
            .filter((service: any) => !service.error)
            .map((service: any) => ({
                Codigo: service.id === 1 ? '04510' : (service.id === 2 ? '04014' : String(service.id)),
                Valor: service.price,
                PrazoEntrega: service.delivery_time,
                Nome: service.name,
                Empresa: service.company.name
            }));

        return NextResponse.json(formatted);

    } catch (error: any) {
        console.error('Shipping API Error:', error);
        return NextResponse.json({ error: error.message || 'Erro ao consultar frete' }, { status: 500 });
    }
}
