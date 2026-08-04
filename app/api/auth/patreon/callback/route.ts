import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { verifyActivePatreonMember } from '@/lib/integrations/patreon';
import { grantDriveFolderAccess } from '@/lib/integrations/gdrive';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const host = req.headers.get('host') || 'localhost:3000';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const protocol = isLocal ? 'http' : 'https';

    const redirectUri = `${protocol}://${host}/api/auth/patreon/callback`;
    const releasePageUrl = `${protocol}://${host}/release`;

    if (error || !code) {
        return NextResponse.redirect(`${releasePageUrl}?error=login_cancelled`);
    }

    try {
        const clientId = process.env.PATREON_CLIENT_ID;
        const clientSecret = process.env.PATREON_CLIENT_SECRET;

        // 1. Trocar o código de autorização pelo Access Token do Usuário no Patreon (SEM CACHE)
        const tokenRes = await fetch('https://www.patreon.com/api/oauth2/token', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            cache: 'no-store',
            body: new URLSearchParams({
                code,
                grant_type: 'authorization_code',
                client_id: clientId || '',
                client_secret: clientSecret || '',
                redirect_uri: redirectUri
            })
        });

        if (!tokenRes.ok) {
            const errText = await tokenRes.text();
            console.error('Erro na troca de token do Patreon:', errText);
            return NextResponse.redirect(`${releasePageUrl}?error=token_exchange_failed`);
        }

        const tokenData = await tokenRes.json();
        const userAccessToken = tokenData.access_token;

        // 2. Buscar e-mail e nome do usuário autenticado via API do Patreon (SEM CACHE)
        const userRes = await fetch('https://www.patreon.com/api/oauth2/v2/identity?fields[user]=email,full_name', {
            headers: { 
                'Authorization': `Bearer ${userAccessToken}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            cache: 'no-store'
        });

        if (!userRes.ok) {
            console.error('Erro ao buscar perfil do usuário no Patreon');
            return NextResponse.redirect(`${releasePageUrl}?error=user_profile_failed`);
        }

        const userData = await userRes.json();
        const userAttributes = userData.data?.attributes || {};
        const email = userAttributes.email;
        const fullName = userAttributes.full_name || 'Apoiador Patreon';

        if (!email) {
            return NextResponse.redirect(`${releasePageUrl}?error=no_email_permission`);
        }

        // 3. Validar se o e-mail autenticado é um membro ativo da campanha do Criador no Patreon
        const patreonCheck = await verifyActivePatreonMember(email);

        if (!patreonCheck.isAuthorized) {
            console.warn(`Acesso negado para ${email}: ${patreonCheck.reason}`);
            return NextResponse.redirect(`${releasePageUrl}?error=not_active_patron`);
        }

        // 4. Conceder permissão de leitor na pasta restrita do Google Drive via Service Account
        const activeFolderUrl = 'https://drive.google.com/drive/folders/1aB9Xx-NZe2K7IweVx33GMucElUsgzHEf';
        await grantDriveFolderAccess(activeFolderUrl, email);

        // 5. Registrar Log de Auditoria no Supabase
        const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'desconhecido';
        await supabase
            .from('download_tokens')
            .insert({
                token: `patreon_oauth_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                patron_email: email,
                patron_name: patreonCheck.patronName || fullName,
                figure_id: null,
                file_name: `Autenticação OAuth2 Real do Patreon`,
                real_file_url: activeFolderUrl,
                is_used: true,
                used_at: new Date().toISOString(),
                user_ip: clientIp
            });

        // 6. Redirecionar para /release com o acesso liberado
        const successUrl = `${releasePageUrl}?access=granted&email=${encodeURIComponent(email)}&name=${encodeURIComponent(fullName)}`;
        
        const response = NextResponse.redirect(successUrl);
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.cookies.set('patreon_user_email', email, { path: '/', httpOnly: false, maxAge: 86400 });
        response.cookies.set('patreon_user_name', fullName, { path: '/', httpOnly: false, maxAge: 86400 });

        return response;

    } catch (e: any) {
        console.error('Erro no callback OAuth2 do Patreon:', e);
        return NextResponse.redirect(`${releasePageUrl}?error=internal_auth_error`);
    }
}
