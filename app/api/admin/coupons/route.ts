import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// GET: Listar cupons
export async function GET() {
    try {
    const sessionOrResponse = await requireRoles(['admin', 'sales']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { data, error } = await supabase
            .from('cupoms_desconto')
            .select('*, series(nome)')
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
    const sessionOrResponse = await requireRoles(['admin', 'sales']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { codigo, tipo, valor, usos_restantes, data_validade, ativo, valor_minimo, desconto_maximo, serie_id } = body;

        const { data, error } = await supabase
            .from('cupoms_desconto')
            .insert([{
                codigo: String(codigo).trim().toUpperCase(),
                tipo,
                valor: Number(valor),
                usos_restantes: usos_restantes ? Number(usos_restantes) : null,
                data_validade: data_validade || null,
                valor_minimo: valor_minimo ? Number(valor_minimo) : null,
                desconto_maximo: desconto_maximo ? Number(desconto_maximo) : null,
                serie_id: serie_id ? Number(serie_id) : null,
                ativo: ativo ?? true
            }])
            .select('*, series(nome)')
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
