import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export interface AdminSession {
    id: number;
    email: string;
    roles?: string[];
}

/**
 * Obtém a sessão do administrador atual a partir dos cookies do Next.js.
 */
export const getServerSession = async (): Promise<AdminSession | null> => {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user || !user.email) return null;

        const { data: adminUser } = await supabaseAdmin
            .from('admin_users')
            .select('id, email, roles')
            .eq('email', user.email)
            .single();

        if (!adminUser) return null;

        return adminUser as AdminSession;
    } catch (err) {
        console.error('Error fetching server session:', err);
        return null;
    }
};

/**
 * Middleware utilitário para rotas de API.
 * Verifica se o usuário está logado e tem alguma das roles permitidas.
 * Sempre aceita a role 'admin' como curinga.
 * 
 * Uso:
 * const sessionOrResponse = await requireRoles(['sales', 'finance']);
 * if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;
 * const session = sessionOrResponse; // TS sabe que é AdminSession aqui
 */
export const requireRoles = async (allowedRoles: string[]): Promise<AdminSession | NextResponse> => {
    const session = await getServerSession();
    
    if (!session) {
        return NextResponse.json({ error: 'Não autorizado. Faça login.' }, { status: 401 });
    }

    if (!session.roles || session.roles.length === 0) {
        return NextResponse.json({ error: 'Acesso negado. Usuário sem cargo definido.' }, { status: 403 });
    }

    const hasAccess = session.roles.includes('admin') || allowedRoles.some(r => session.roles!.includes(r));

    if (!hasAccess) {
        return NextResponse.json({ error: 'Acesso negado. Privilégios insuficientes.' }, { status: 403 });
    }

    return session;
};
