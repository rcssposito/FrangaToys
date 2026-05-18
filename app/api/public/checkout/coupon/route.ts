import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { codigo } = body;

        if (!codigo || typeof codigo !== 'string') {
            return NextResponse.json({ error: 'Código de cupom inválido' }, { status: 400 });
        }

        const upperCodigo = codigo.trim().toUpperCase();

        const { data: cupom, error } = await supabase
            .from('cupoms_desconto')
            .select('*')
            .eq('codigo', upperCodigo)
            .maybeSingle();

        if (error) {
            console.error('Erro ao buscar cupom:', error);
            return NextResponse.json({ error: 'Erro interno ao validar cupom' }, { status: 500 });
        }

        if (!cupom) {
            return NextResponse.json({ error: 'Cupom não encontrado' }, { status: 404 });
        }

        if (!cupom.ativo) {
            return NextResponse.json({ error: 'Este cupom está inativo' }, { status: 400 });
        }

        if (cupom.usos_restantes !== null && cupom.usos_restantes <= 0) {
            return NextResponse.json({ error: 'Este cupom já atingiu o limite de usos' }, { status: 400 });
        }

        if (cupom.data_validade) {
            const validade = new Date(cupom.data_validade);
            if (validade < new Date()) {
                return NextResponse.json({ error: 'Este cupom está expirado' }, { status: 400 });
            }
        }

        return NextResponse.json({
            success: true,
            cupom: {
                codigo: cupom.codigo,
                tipo: cupom.tipo,
                valor: Number(cupom.valor)
            }
        });

    } catch (error: any) {
        console.error('Coupon validation API Error:', error);
        return NextResponse.json({ error: error.message || 'Erro ao validar cupom' }, { status: 500 });
    }
}
