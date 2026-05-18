import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// GET: Listar cupons
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('cupoms_desconto')
            .select('*')
            .order('criado_em', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Criar cupom
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { codigo, tipo, valor, usos_restantes, data_validade, ativo } = body;

        const { data, error } = await supabase
            .from('cupoms_desconto')
            .insert([{
                codigo: String(codigo).trim().toUpperCase(),
                tipo,
                valor: Number(valor),
                usos_restantes: usos_restantes ? Number(usos_restantes) : null,
                data_validade: data_validade || null,
                ativo: ativo ?? true
            }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        if (error.code === '23505') { // Unique violation
            return NextResponse.json({ error: 'Um cupom com este código já existe.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
