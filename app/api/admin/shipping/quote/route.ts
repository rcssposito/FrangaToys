import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { calculateShipping } from '@/lib/shipping';

export async function POST(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { sCepDestino, nVlPeso, nVlComprimento, nVlAltura, nVlLargura } = body;

        if (!sCepDestino) {
            return NextResponse.json({ error: 'CEP de destino não informado' }, { status: 400 });
        }

        const formatted = await calculateShipping({
            sCepDestino,
            nVlPeso,
            nVlComprimento,
            nVlAltura,
            nVlLargura
        });

        return NextResponse.json(formatted);

    } catch (error: any) {
        console.error('Shipping API Error:', error);
        return NextResponse.json({ error: error.message || 'Erro ao consultar frete' }, { status: 500 });
    }
}
