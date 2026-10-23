import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const queryPhone = searchParams.get('phone');
        const queryId = searchParams.get('id');

        const cookieStore = await cookies();
        const clienteId = queryId || cookieStore.get('franga_cliente_id')?.value;
        const rawPhone = queryPhone || cookieStore.get('frangatoys_tracking_phone')?.value;
        const cleanPhone = (rawPhone || '').replace(/\D/g, '');

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let clientRecord: any = null;

        // 1. Tenta identificar por usuário logado no Supabase (Google OAuth)
        if (user?.email) {
            const { data } = await supabaseAdmin
                .from('clientes')
                .select('id, nome, email, telefone, avatar_url, wishlist, tags, auth_user_id')
                .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`)
                .maybeSingle();

            if (data) {
                clientRecord = data;
            } else if (cleanPhone && cleanPhone.length >= 10) {
                // Se ainda não tinha o email ou auth_user_id no registro, mas tem o telefone correspondente
                const { data: byPhone } = await supabaseAdmin
                    .from('clientes')
                    .select('id, nome, email, telefone, avatar_url, wishlist, tags, auth_user_id')
                    .or(`telefone.eq.${cleanPhone},telefone.ilike.%${cleanPhone.slice(-8)}%`)
                    .maybeSingle();
                
                if (byPhone) {
                    clientRecord = byPhone;
                }
            }

            // Se achou o cliente e o auth_user_id ainda não estava vinculado, vincula agora
            if (clientRecord && (!clientRecord.auth_user_id || !clientRecord.email)) {
                const userAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
                await supabaseAdmin
                    .from('clientes')
                    .update({
                        auth_user_id: user.id,
                        email: clientRecord.email || user.email,
                        avatar_url: clientRecord.avatar_url || userAvatar,
                        ultimo_acesso_em: new Date().toISOString()
                    })
                    .eq('id', clientRecord.id);
            }
        }

        // 2. Se não achou por Supabase Auth, tenta por ID ou Telefone (LocalStorage / Cookie)
        if (!clientRecord) {
            if (clienteId) {
                const { data } = await supabaseAdmin
                    .from('clientes')
                    .select('id, nome, email, telefone, avatar_url, wishlist, tags, auth_user_id')
                    .eq('id', clienteId)
                    .maybeSingle();
                clientRecord = data;
            }
            
            if (!clientRecord && cleanPhone && cleanPhone.length >= 10) {
                const { data } = await supabaseAdmin
                    .from('clientes')
                    .select('id, nome, email, telefone, avatar_url, wishlist, tags, auth_user_id')
                    .or(`telefone.eq.${cleanPhone},telefone.ilike.%${cleanPhone.slice(-8)}%`)
                    .maybeSingle();
                clientRecord = data;
            }
        }

        if (clientRecord) {
            const finalPhone = (clientRecord.telefone || '').replace(/\D/g, '');
            const hasValidPhone = finalPhone.length >= 10;
            const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

            return NextResponse.json({
                authenticated: true,
                hasGoogle: !!clientRecord.auth_user_id || !!user,
                hasPhone: hasValidPhone,
                client: {
                    id: clientRecord.id,
                    nome: clientRecord.nome,
                    email: clientRecord.email || (user?.email || null),
                    telefone: clientRecord.telefone,
                    avatar_url: clientRecord.avatar_url || userAvatar || null,
                    wishlist: Array.isArray(clientRecord.wishlist) ? clientRecord.wishlist : []
                }
            });
        }

        return NextResponse.json({
            authenticated: false,
            client: null
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
