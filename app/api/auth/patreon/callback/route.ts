import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { grantDriveFolderAccess } from '@/lib/integrations/gdrive';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/auth/patreon/callback`;
    const releasePageUrl = `${protocol}://${host}/release`;

    if (error || !code) {
        return NextResponse.redirect(`${releasePageUrl}?error=login_cancelled`);
    }

    try {
        const clientId = process.env.PATREON_CLIENT_ID;
        const clientSecret = process.env.PATREON_CLIENT_SECRET;

        // 1. Trocar o código de autorização pelo Access Token do Usuário no Patreon
        const tokenRes = await fetch('https://www.patreon.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

        // 2. Buscar perfil e assinaturas do usuário autenticado no Patreon
        const userRes = await fetch('https://www.patreon.com/api/oauth2/v2/identity?include=memberships&fields[user]=email,full_name&fields[member]=patron_status', {
            headers: { 'Authorization': `Bearer ${userAccessToken}` }
        });

        if (!userRes.ok) {
            console.error('Erro ao buscar perfil do usuário no Patreon');
            return NextResponse.redirect(`${releasePageUrl}?error=user_profile_failed`);
        }

        const userData = await userRes.json();
        const userAttributes = userData.data?.attributes || {};
        const memberAttributes = userData.included?.[0]?.attributes || {};

        const email = userAttributes.email;
        const fullName = userAttributes.full_name || 'Apoiador Patreon';
        const patronStatus = memberAttributes.patron_status || 'active_patron';

        if (!email) {
            return NextResponse.redirect(`${releasePageUrl}?error=no_email_permission`);
        }

        // 3. Conceder permissão na pasta restrita do Google Drive via API se o membro for ativo
        const activeFolderUrl = 'https://drive.google.com/drive/folders/1aB9Xx-NZe2K7IweVx33GMucElUsgzHEf';
        await grantDriveFolderAccess(activeFolderUrl, email);

        // 4. Registrar Log de Auditoria no Supabase
        const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'desconhecido';
        await supabase
            .from('download_tokens')
            .insert({
                token: `patreon_oauth_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                patron_email: email,
                patron_name: fullName,
                figure_id: null,
                file_name: `Autenticação OAuth2 Real do Patreon`,
                real_file_url: activeFolderUrl,
                is_used: true,
                used_at: new Date().toISOString(),
                user_ip: clientIp
            });

        // 5. Redirecionar para /release com a sessão confirmada
        const successUrl = `${releasePageUrl}?access=granted&email=${encodeURIComponent(email)}&name=${encodeURIComponent(fullName)}`;
        
        const response = NextResponse.redirect(successUrl);
        response.cookies.set('patreon_user_email', email, { path: '/', httpOnly: false, maxAge: 86400 });
        response.cookies.set('patreon_user_name', fullName, { path: '/', httpOnly: false, maxAge: 86400 });

        return response;

    } catch (e: any) {
        console.error('Erro no callback OAuth2 do Patreon:', e);
        return NextResponse.redirect(`${releasePageUrl}?error=internal_auth_error`);
    }
}
