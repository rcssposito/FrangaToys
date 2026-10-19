import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Se a URL já veio com erro do provedor (ex: usuário cancelou no Google)
    if (error) {
        console.error('OAuth provider returned error:', error, errorDescription);
        return NextResponse.redirect(`${origin}/admin/login?error=${encodeURIComponent(errorDescription || error)}`);
    }

    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/admin';

    if (code) {
        const supabase = await createClient();
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!exchangeError) {
            const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development';
            
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        }

        console.error('Error exchanging code for session:', exchangeError);
    }

    // Redireciona para o login com mensagem informativa em vez de quebrar em 404
    return NextResponse.redirect(`${origin}/admin/login?error=auth_callback_failed`);
}
