import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// GET: Fetch all inventory items
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('inventory_items')
            .select('*')
            .order('categoria', { ascending: true })
            .order('nome', { ascending: true });

        if (error) {
            console.error('Supabase GET Inventory Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('API GET Inventory Crash:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Create a new inventory item
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { nome, marca, categoria, quantidade, unidade_medida, estoque_minimo } = body;

        const { data, error } = await supabase
            .from('inventory_items')
            .insert([{
                nome,
                marca: marca || null,
                categoria,
                quantidade: Number(quantidade) || 0,
                unidade_medida,
                estoque_minimo: Number(estoque_minimo) || 0
            }])
            .select()
            .single();

        if (error) {
            console.error('Supabase POST Inventory Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('API POST Inventory Crash:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH: Update an existing inventory item (usually for incrementing/decrementing stock)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, nome, marca, categoria, quantidade, unidade_medida, estoque_minimo } = body;

        if (!id) {
            return NextResponse.json({ error: 'Missing ID for update' }, { status: 400 });
        }

        const updates: any = {};
        if (nome !== undefined) updates.nome = nome;
        if (marca !== undefined) updates.marca = marca;
        if (categoria !== undefined) updates.categoria = categoria;
        if (quantidade !== undefined) updates.quantidade = Number(quantidade);
        if (unidade_medida !== undefined) updates.unidade_medida = unidade_medida;
        if (estoque_minimo !== undefined) updates.estoque_minimo = Number(estoque_minimo);

        const { data, error } = await supabase
            .from('inventory_items')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Supabase PATCH Inventory Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('API PATCH Inventory Crash:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE: Remove an item from the inventory
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
        }

        const { error } = await supabase
            .from('inventory_items')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase DELETE Inventory Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('API DELETE Inventory Crash:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
