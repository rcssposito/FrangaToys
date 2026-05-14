import { NextRequest, NextResponse } from 'next/server';
import { calculateShipping } from '@/lib/shipping';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const results = await calculateShipping(body);
        return NextResponse.json(results);
    } catch (error: any) {
        console.error('--- PUBLIC SHIPPING API ERROR ---');
        console.error('Message:', error.message);
        if (error.stack) console.error('Stack:', error.stack);
        return NextResponse.json({ error: error.message || 'Erro ao consultar frete' }, { status: 500 });
    }
}
