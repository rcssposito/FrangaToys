import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const next = searchParams.get('next') ?? '/';

    const isAdminLogin = next.startsWith('/admin');

    // Se a URL já veio com erro do provedor (ex: usuário cancelou no Google)
    if (error) {
        console.error('OAuth provider returned error:', error, errorDescription);
        const errorUrl = isAdminLogin
            ? `${origin}/admin/login?error=${encodeURIComponent(errorDescription || error)}`
            : `${origin}/?error=${encodeURIComponent(errorDescription || error)}`;
        return NextResponse.redirect(errorUrl);
    }

    if (code) {
        const supabase = await createClient();
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (!exchangeError) {
            const forwardedHost = request.headers.get('x-forwarded-host');
            const isLocalEnv = process.env.NODE_ENV === 'development';
            const baseRedirectUrl = isLocalEnv 
                ? `${origin}${next}` 
                : (forwardedHost ? `https://${forwardedHost}${next}` : `${origin}${next}`);

            const response = NextResponse.redirect(baseRedirectUrl);

            // Se for login de cliente da loja (não admin)
            if (!isAdminLogin) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();

                    if (user?.email) {
                        const userAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
                        const userName = (user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0] || 'Colecionador').trim();
                        const nowIso = new Date().toISOString();

                        // 1. Busca se já existe um cliente cadastrado por auth_user_id, email ou telefone do cookie
                        const cookieHeader = request.headers.get('cookie') || '';
                        const phoneMatch = cookieHeader.match(/frangatoys_tracking_phone=([^;]+)/);
                        const rawCookiePhone = phoneMatch ? decodeURIComponent(phoneMatch[1]).replace(/\D/g, '') : null;

                        let { data: existingClient } = await supabaseAdmin
                            .from('clientes')
                            .select('id, nome, telefone, email, wishlist, tags, avatar_url')
                            .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`)
                            .maybeSingle();

                        if (!existingClient && rawCookiePhone && rawCookiePhone.length >= 10) {
                            const { data: clientByPhone } = await supabaseAdmin
                                .from('clientes')
                                .select('id, nome, telefone, email, wishlist, tags, avatar_url')
                                .or(`telefone.eq.${rawCookiePhone},telefone.ilike.%${rawCookiePhone.slice(-8)}%`)
                                .maybeSingle();
                            if (clientByPhone) {
                                existingClient = clientByPhone;
                            }
                        }

                        let clientRecord = existingClient;

                        if (existingClient) {
                            const currentTags = Array.isArray(existingClient.tags) ? existingClient.tags : [];
                            const mergedTags = Array.from(new Set([...currentTags, 'Google Login']));

                            const { data: updated } = await supabaseAdmin
                                .from('clientes')
                                .update({
                                    auth_user_id: user.id,
                                    nome: existingClient.nome || userName,
                                    avatar_url: userAvatar || existingClient.avatar_url,
                                    tags: mergedTags,
                                    ultimo_acesso_em: nowIso
                                })
                                .eq('id', existingClient.id)
                                .select('*')
                                .single();

                            if (updated) clientRecord = updated;
                        } else {
                            // 2. Cria novo cliente via Google
                            const { data: created } = await supabaseAdmin
                                .from('clientes')
                                .insert({
                                    auth_user_id: user.id,
                                    nome: userName,
                                    email: user.email,
                                    avatar_url: userAvatar,
                                    tags: ['Google Login', 'Lead Quente'],
                                    data_cadastro: nowIso,
                                    ultimo_acesso_em: nowIso,
                                    total_acessos: 1
                                })
                                .select('*')
                                .single();

                            if (created) clientRecord = created;
                        }

                        // 3. Salva cookies para hidratação imediata no frontend
                        if (clientRecord) {
                            response.cookies.set('franga_cliente_id', clientRecord.id, {
                                path: '/',
                                maxAge: 60 * 60 * 24 * 365,
                                sameSite: 'lax'
                            });
                            response.cookies.set('frangatoys_client_nome', encodeURIComponent(clientRecord.nome || userName), {
                                path: '/',
                                maxAge: 60 * 60 * 24 * 365,
                                sameSite: 'lax'
                            });
                            if (clientRecord.telefone) {
                                response.cookies.set('frangatoys_tracking_phone', clientRecord.telefone, {
                                    path: '/',
                                    maxAge: 60 * 60 * 24 * 365,
                                    sameSite: 'lax'
                                });
                            }
                            if (userAvatar) {
                                response.cookies.set('frangatoys_avatar_url', encodeURIComponent(userAvatar), {
                                    path: '/',
                                    maxAge: 60 * 60 * 24 * 365,
                                    sameSite: 'lax'
                                });
                            }
                        }
                    }
                } catch (clientErr) {
                    console.error('Erro ao sincronizar cliente do Google OAuth:', clientErr);
                }
            }

            return response;
        }

        console.error('Error exchanging code for session:', exchangeError);
    }

    // Fallback de erro
    const fallbackUrl = isAdminLogin 
        ? `${origin}/admin/login?error=auth_callback_failed` 
        : `${origin}/?error=auth_callback_failed`;
    return NextResponse.redirect(fallbackUrl);
}
