
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 });
        }

        // 1. Buscar usuário no Supabase
        const { data: user, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            console.error('Login Failed: User not found or DB error', error);
            return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
        }

        // 2. Verificar senha (Hash)
        console.log('User found:', user.email);
        console.log('Hash in DB:', user.password_hash);
        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log('Password valid?', isValid);

        if (!isValid) {
            return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
        }

        // 3. Criar Sessão (JWT)
        const token = await signSession({ id: user.id, email: user.email });

        // 4. Salvar no Cookie via Header (Edge compatible)
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 dia
        const cookieStore = await cookies();
        cookieStore.set('admin_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: expires,
            path: '/',
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('Login Error:', err);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
