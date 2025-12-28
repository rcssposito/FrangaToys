
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    // 1. Verificar se é rota de admin
    if (request.nextUrl.pathname.startsWith('/admin')) {

        // 2. Liberar login para evitar loop
        if (request.nextUrl.pathname === '/admin/login') {
            return NextResponse.next();
        }

        // 3. Verificar Cookie
        const token = request.cookies.get('admin_session')?.value;

        if (!token) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        // 4. Verificar Validade do Token
        const payload = await verifySession(token);

        if (!payload) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        return NextResponse.next();
    }
}

export const config = {
    matcher: '/admin/:path*',
};
