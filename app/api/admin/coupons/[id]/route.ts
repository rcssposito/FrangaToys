import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
    const sessionOrResponse = await requireRoles(['admin', 'sales']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { id } = await params;
        const body = await req.json();
        const { codigo, tipo, valor, usos_restantes, data_validade, ativo, valor_minimo, desconto_maximo, serie_id, figuras_permitidas } = body;

        const { data, error } = await supabase
            .from('cupoms_desconto')
            .update({
                codigo: String(codigo).trim().toUpperCase(),
                tipo,
                valor: Number(valor),
                usos_restantes: usos_restantes ? Number(usos_restantes) : null,
                data_validade: data_validade || null,
                valor_minimo: valor_minimo ? Number(valor_minimo) : null,
                desconto_maximo: desconto_maximo ? Number(desconto_maximo) : null,
                serie_id: serie_id ? Number(serie_id) : null,
                figuras_permitidas: figuras_permitidas || null,
                ativo: ativo ?? true
            })
            .eq('id', id)
            .select('*, series(nome)')
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        if (error.code === '23505') { 
            return NextResponse.json({ error: 'Um cupom com este código já existe.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
    const sessionOrResponse = await requireRoles(['admin', 'sales']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { id } = await params;
        const { error } = await supabase
            .from('cupoms_desconto')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
