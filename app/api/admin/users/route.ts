import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// LISTAR USUÁRIOS
export async function GET() {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { data: users, error } = await supabaseAdmin
            .from('admin_users')
            .select('id, email, created_at, roles, nome, telefone')
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
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { email, roles, nome, telefone } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
        }

        let authUser = null;

        // Auto-generate a random secure password for Auth, since users will log in via Google
        const generatedPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10) + '!A1';

        // 1. Create User in Supabase Auth
        const { data: auth, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: generatedPassword,
            email_confirm: true
        });

        if (authError) {
            if (authError.message?.includes('already been registered')) {
                console.log('User already exists in Auth, adding to whitelist only.');
            } else {
                console.error('Auth Create Error', authError);
                return NextResponse.json({ error: authError.message }, { status: 500 });
            }
        } else {
            authUser = auth;
        }

        // 2. Create User in DB (Legacy/Profile)
        const hash = await bcrypt.hash(generatedPassword, 10);

        const { data, error } = await supabaseAdmin
            .from('admin_users')
            .insert([{
                email,
                password_hash: hash,
                roles: roles || ['admin'],
                nome: nome || email.split('@')[0],
                telefone: telefone || null
            }])
            .select()
            .single();

        if (error) {
            // Rollback Auth User if DB fails?
            if (authUser?.user) await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
            throw error;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Create User Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETAR USUÁRIO
export async function DELETE(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { id } = await req.json();

        // Get email to delete from Auth
        const { data: userToDelete } = await supabaseAdmin
            .from('admin_users')
            .select('email')
            .eq('id', id)
            .single();

        // Delete from DB
        const { error } = await supabaseAdmin
            .from('admin_users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ATUALIZAR USUÁRIO (PUT)
export async function PUT(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { email, roles, nome, telefone } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });
        }

        // 1. Update Roles in DB (admin_users)
        const { error: dbError } = await supabaseAdmin
            .from('admin_users')
            .update({ roles, nome, telefone })
            .eq('email', email);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update User Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
