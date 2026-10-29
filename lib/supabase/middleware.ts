import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Fast-path (0ms): Rotas de API validam sessão internamente (requireRoles) e páginas públicas da vitrine não precisam bloquear no Auth
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/auth')) {
        return NextResponse.next();
    }

    // Se acessar /admin (exceto /admin/login) e não tiver nenhum cookie sb- do Supabase, redireciona em 0ms sem roundtrip de rede
    const hasSupabaseCookie = request.cookies.getAll().some(c => c.name.startsWith('sb-'));
    if (!hasSupabaseCookie && pathname.startsWith('/admin') && pathname !== '/admin/login') {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/login';
        return NextResponse.redirect(url);
    }

    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL! || process.env.SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! || process.env.SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh the auth token if needed
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Se usuário não está autenticado e tenta acessar rota interna do admin (exceto a tela de login)
    if (
        !user &&
        pathname.startsWith('/admin') &&
        pathname !== '/admin/login'
    ) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/login';
        return NextResponse.redirect(url);
    }

    // Se o usuário já está autenticado e acessa /admin/login, redireciona direto para o painel /admin
    if (user && pathname === '/admin/login') {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
