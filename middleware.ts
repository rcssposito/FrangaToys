import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
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
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Protection Logic for /admin
    if (request.nextUrl.pathname.startsWith('/admin')) {

        // Allow public access to login page
        if (request.nextUrl.pathname === '/admin/login') {
            // If already logged in, redirect to dashboard
            if (user) {
                return NextResponse.redirect(new URL('/admin', request.url));
            }
            return response;
        }

        // Redirect to login if not authenticated
        if (!user) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        // 2. Authorization - Check if user is in admin_users whitelist
        // The query uses the ANON key, so it relies on RLS policies allowing the read.
        // If the user is NOT in the table (or RLS blocks them), this returns null/error.
        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('email')
            .eq('email', user.email)
            .single();

        if (!adminUser) {
            // User is authenticated but not authorized
            await supabase.auth.signOut();
            const url = new URL('/admin/login', request.url);
            url.searchParams.set('error', 'unauthorized');
            return NextResponse.redirect(url);
        }
    }

    return response;
}

export const config = {
    matcher: ['/admin/:path*', '/auth/:path*'],
};
