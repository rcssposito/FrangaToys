import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const clientId = process.env.PATREON_CLIENT_ID;
    if (!clientId) {
        return NextResponse.json({ error: 'PATREON_CLIENT_ID não configurado no .env' }, { status: 500 });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/auth/patreon/callback`;

    const patreonAuthUrl = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=identity%20identity.memberships`;

    return NextResponse.redirect(patreonAuthUrl);
}
