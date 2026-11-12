import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyVipByEmail, VIP_COOKIE_NAME, generateDecisionSecret } from '@/lib/gatekeeper';
import { sendTelegramAlert } from '@/lib/telegram';

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

                        // 1. Busca se já existe um cliente cadastrado por auth_user_id, email, cookie de ID ou cookie de telefone
                        const cookieHeader = request.headers.get('cookie') || '';
                        const phoneMatch = cookieHeader.match(/frangatoys_tracking_phone=([^;]+)/);
                        const rawCookiePhone = phoneMatch ? decodeURIComponent(phoneMatch[1]).replace(/\D/g, '') : null;
                        const clientCookieMatch = cookieHeader.match(/franga_cliente_id=([^;]+)/);
                        const rawCookieClientId = clientCookieMatch ? decodeURIComponent(clientCookieMatch[1]).trim() : null;

                        let { data: existingClient } = await supabaseAdmin
                            .from('clientes')
                            .select('*')
                            .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`)
                            .maybeSingle();

                        if (!existingClient && rawCookieClientId) {
                            const { data: clientById } = await supabaseAdmin
                                .from('clientes')
                                .select('*')
                                .eq('id', rawCookieClientId)
                                .maybeSingle();
                            if (clientById) existingClient = clientById;
                        }

                        if (!existingClient && rawCookiePhone && rawCookiePhone.length >= 10) {
                            const { data: phoneClients } = await supabaseAdmin
                                .from('clientes')
                                .select('*')
                                .or(`telefone.eq.${rawCookiePhone},telefone.ilike.%${rawCookiePhone.slice(-8)}%`)
                                .order('ultimo_acesso_em', { ascending: false, nullsFirst: false })
                                .limit(1);
                            if (phoneClients && phoneClients.length > 0) {
                                existingClient = phoneClients[0];
                            }
                        }

                        // Se já achou cliente por Google, mas o cookie de telefone apontava para um registro separado: mescla!
                        if (existingClient && rawCookiePhone && rawCookiePhone.length >= 10) {
                            const { data: separatePhoneClients } = await supabaseAdmin
                                .from('clientes')
                                .select('*')
                                .or(`telefone.eq.${rawCookiePhone},telefone.ilike.%${rawCookiePhone.slice(-8)}%`)
                                .neq('id', existingClient.id);

                            if (separatePhoneClients && separatePhoneClients.length > 0) {
                                for (const separatePhoneClient of separatePhoneClients) {
                                    await supabaseAdmin.from('crm_acessos_beacon').update({ cliente_id: existingClient.id }).eq('cliente_id', separatePhoneClient.id);
                                    await supabaseAdmin.from('vendas').update({ cliente_id: existingClient.id }).eq('cliente_id', separatePhoneClient.id);

                                    const mergedWishlist = Array.from(new Set([
                                        ...(existingClient.wishlist || []),
                                        ...(separatePhoneClient.wishlist || [])
                                    ]));
                                    const mergedTags = Array.from(new Set([
                                        ...(existingClient.tags || []),
                                        ...(separatePhoneClient.tags || []),
                                        'Google Login'
                                    ]));

                                    // Preserva o nome mais completo (ex: nome com sobrenome cadastrado em venda anterior)
                                    const bestNome = (separatePhoneClient.nome && separatePhoneClient.nome.length > (existingClient.nome || '').length)
                                        ? separatePhoneClient.nome
                                        : (existingClient.nome || userName);

                                    await supabaseAdmin.from('clientes').update({
                                        nome: bestNome,
                                        telefone: existingClient.telefone || separatePhoneClient.telefone || rawCookiePhone,
                                        cpf: existingClient.cpf || separatePhoneClient.cpf || null,
                                        cep: existingClient.cep || separatePhoneClient.cep || null,
                                        logradouro: existingClient.logradouro || separatePhoneClient.logradouro || null,
                                        numero: existingClient.numero || separatePhoneClient.numero || null,
                                        bairro: existingClient.bairro || separatePhoneClient.bairro || null,
                                        cidade: existingClient.cidade || separatePhoneClient.cidade || null,
                                        uf: existingClient.uf || separatePhoneClient.uf || null,
                                        complemento: existingClient.complemento || separatePhoneClient.complemento || null,
                                        instagram: existingClient.instagram || separatePhoneClient.instagram || null,
                                        notas: existingClient.notas || separatePhoneClient.notas || null,
                                        wishlist: mergedWishlist,
                                        tags: mergedTags
                                    }).eq('id', existingClient.id);

                                    await supabaseAdmin.from('clientes').delete().eq('id', separatePhoneClient.id);
                                }
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
                                    email: existingClient.email || user.email,
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
                                    telefone: (rawCookiePhone && rawCookiePhone.length >= 10) ? rawCookiePhone : null,
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

                        // 4. Checagem Gatekeeper (Acesso VIP)
                        const vipStatus = await verifyVipByEmail(user.email);
                        if (vipStatus.valid && vipStatus.token) {
                            // Usuário já está aprovado! Grava o cookie VIP para liberar a vitrine
                            response.cookies.set(VIP_COOKIE_NAME, vipStatus.token, {
                                path: '/',
                                maxAge: 60 * 60 * 24 * 60,
                                sameSite: 'lax',
                                secure: process.env.NODE_ENV === 'production'
                            });
                        } else {
                            // Não aprovado ainda: registra solicitação e notifica Telegram
                            const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'IP Desconhecido';
                            const userAgent = request.headers.get('user-agent') || 'Desconhecido';

                            const { data: existingReq } = await supabaseAdmin
                                .from('solicitacoes_acesso')
                                .select('*')
                                .ilike('email', user.email)
                                .maybeSingle();

                            if (!existingReq) {
                                const { data: newReq } = await supabaseAdmin
                                    .from('solicitacoes_acesso')
                                    .insert({
                                        nome: userName,
                                        email: user.email,
                                        ip,
                                        user_agent: userAgent,
                                        status: 'pendente'
                                    })
                                    .select()
                                    .single();

                                if (newReq) {
                                    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
                                    const approveSecret = generateDecisionSecret(newReq.id, 'approve');
                                    const rejectSecret = generateDecisionSecret(newReq.id, 'reject');
                                    const approveUrl = `${baseUrl}/api/public/access/decision?id=${newReq.id}&action=approve&secret=${approveSecret}`;
                                    const rejectUrl = `${baseUrl}/api/public/access/decision?id=${newReq.id}&action=reject&secret=${rejectSecret}`;

                                    const googleLawyerSearch = `https://www.google.com/search?q=${encodeURIComponent(`"${userName}" (advogado OR oab OR associados)`)}`;
                                    const jusbrasilSearch = `https://www.google.com/search?q=${encodeURIComponent(`site:jusbrasil.com.br "${userName}"`)}`;

                                    const tgMsg = `🔒 *NOVA SOLICITAÇÃO VIA GOOGLE LOGIN!*\n\n` +
                                        `👤 *Nome:* ${userName}\n` +
                                        `📧 *E-mail Verificado:* \`${user.email}\`\n` +
                                        `🌐 *IP:* \`${ip}\`\n\n` +
                                        `🔍 *CHECAGEM PREVENTIVA (Anti-Advocacia/Bot):*\n` +
                                        `• [Buscar se é Advogado / OAB](${googleLawyerSearch})\n` +
                                        `• [Checar no Jusbrasil](${jusbrasilSearch})\n\n` +
                                        `⚡ _Selecione a ação abaixo para liberar ou barrar o visitante:_`;

                                    const replyMarkup = {
                                        inline_keyboard: [
                                            [
                                                { text: '🟢 APROVAR ACESSO', url: approveUrl },
                                                { text: '🔴 RECUSAR / BLOQUEAR', url: rejectUrl }
                                            ]
                                        ]
                                    };

                                    await sendTelegramAlert(tgMsg, replyMarkup);
                                }
                            }

                            const pendingRedirect = `${origin}/?google_auth=pending&name=${encodeURIComponent(userName)}&email=${encodeURIComponent(user.email)}`;
                            return NextResponse.redirect(pendingRedirect);
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
