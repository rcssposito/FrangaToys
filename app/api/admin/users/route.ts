import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

interface Session {
    id: number;
    email: string;
    roles?: string[];
    // Add other JWT claims if necessary
}

const checkAuth = async (): Promise<Session | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;
    if (!token) return null;
    return (await verifySession(token)) as Session | null; // Cast generic payload to Session
};

// LISTAR USUÁRIOS
export async function GET() {
    try {
        const session = await checkAuth();
        // Allow access if admin (or maybe just strict admin for now)
        if (!session || !session.roles || !session.roles.includes('admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { data: users, error } = await supabase
            .from('admin_users')
            .select('id, email, created_at, roles')
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
        const session = await checkAuth();
        if (!session || !session.roles || !session.roles.includes('admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { email, password, roles } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 });
        }

        // Hash da senha
        const hash = await bcrypt.hash(password, 10);

        const { data, error } = await supabase
            .from('admin_users')
            .insert([{
                email,
                password_hash: hash,
                roles: roles || ['admin']
            }])
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
        const session = await checkAuth();
        if (!session || !session.roles || !session.roles.includes('admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

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
