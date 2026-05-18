import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const body = await req.json();
        const { codigo, tipo, valor, usos_restantes, data_validade, ativo } = body;

        const { data, error } = await supabase
            .from('cupoms_desconto')
            .update({
                codigo: String(codigo).trim().toUpperCase(),
                tipo,
                valor: Number(valor),
                usos_restantes: usos_restantes ? Number(usos_restantes) : null,
                data_validade: data_validade || null,
                ativo: ativo ?? true
            })
            .eq('id', id)
            .select()
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { error } = await supabase
            .from('cupoms_desconto')
            .delete()
            .eq('id', params.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
