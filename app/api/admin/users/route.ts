
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// LISTAR USUÁRIOS
export async function GET() {
    try {
        const { data: users, error } = await supabase
            .from('admin_users')
            .select('id, email, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(users);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// CRIAR USUÁRIO
export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 });
        }

        // Hash da senha
        const hash = await bcrypt.hash(password, 10);

        const { data, error } = await supabase
            .from('admin_users')
            .insert([{ email, password_hash: hash }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Create User Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETAR USUÁRIO
export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();

        const { error } = await supabase
            .from('admin_users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
