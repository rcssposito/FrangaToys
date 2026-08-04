import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const clientId = process.env.PATREON_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({ error: 'PATREON_CLIENT_ID não configurado no .env' }, { status: 500 });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const protocol = isLocal ? 'http' : 'https';

    const redirectUri = `${protocol}://${host}/api/auth/patreon/callback`;

    // Scopes simples e universais do Patreon OAuth2 (identity e identity[email])
    const scope = encodeURIComponent('identity identity[email]');
    const patreonAuthUrl = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;

    const res = NextResponse.redirect(patreonAuthUrl);
    res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res;
}
